//! Versioned SQLite query contract for Phoenix CAD workspace databases.

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::fmt::{Display, Formatter};

pub const QUERY_PROTOCOL: &str = "phoenix-cad-query";
pub const QUERY_PROTOCOL_MAJOR: u32 = 1;
pub const QUERY_PROTOCOL_MINOR: u32 = 0;
pub const WORKSPACE_SCHEMA_ID: &str = "phoenix-workspace";
pub const WORKSPACE_SCHEMA_VERSION: u32 = 13;
pub const WORKSPACE_SCHEMA_SHA256: &str =
    "116c5bff9c95e6f670b9ecfc52c053ee08e33e9cf1f3f3b46c02888e97643e1c";

#[derive(Debug, Clone, Default)]
pub struct QueryOptions {
    pub search: Option<String>,
    pub kind: Option<String>,
    pub offset: i64,
    pub limit: i64,
    pub rel: Option<String>,
}

impl QueryOptions {
    fn bounded_offset(&self) -> i64 {
        self.offset.max(0)
    }

    fn bounded_limit(&self, max: i64) -> i64 {
        if self.limit <= 0 {
            100.min(max)
        } else {
            self.limit.min(max)
        }
    }
}

#[derive(Debug, Serialize)]
pub struct QueryContract<'a> {
    pub protocol: &'a str,
    pub version: ProtocolVersion,
    pub schema: SchemaContract<'a>,
    pub commands: &'a [&'a str],
}

#[derive(Debug, Serialize)]
pub struct ProtocolVersion {
    pub major: u32,
    pub minor: u32,
}

#[derive(Debug, Serialize)]
pub struct SchemaContract<'a> {
    pub id: &'a str,
    pub version: u32,
    pub ddl_sha256: &'a str,
}

pub const COMMANDS: &[&str] = &[
    "parts",
    "fcstd-map",
    "bom-xref-meta",
    "bom-xref-incoming",
    "bom-xref-outgoing",
    "bom-xref-counts",
    "bom-tree",
    "bom-file",
    "scan-recent",
    "file-upsert",
];

#[derive(Debug)]
pub enum QueryError {
    Database(rusqlite::Error),
    UnsupportedSchema { actual: Option<String> },
    UnknownCommand(String),
}

impl Display for QueryError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => Display::fmt(error, formatter),
            Self::UnsupportedSchema { actual } => write!(
                formatter,
                "unsupported workspace schema: expected {WORKSPACE_SCHEMA_ID} v{WORKSPACE_SCHEMA_VERSION}, got {}",
                actual.as_deref().unwrap_or("missing schema_version")
            ),
            Self::UnknownCommand(command) => write!(formatter, "unknown command: {command}"),
        }
    }
}

impl std::error::Error for QueryError {}

impl From<rusqlite::Error> for QueryError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

pub fn contract_json() -> Result<String, serde_json::Error> {
    serde_json::to_string(&QueryContract {
        protocol: QUERY_PROTOCOL,
        version: ProtocolVersion {
            major: QUERY_PROTOCOL_MAJOR,
            minor: QUERY_PROTOCOL_MINOR,
        },
        schema: SchemaContract {
            id: WORKSPACE_SCHEMA_ID,
            version: WORKSPACE_SCHEMA_VERSION,
            ddl_sha256: WORKSPACE_SCHEMA_SHA256,
        },
        commands: COMMANDS,
    })
}

pub fn execute_command(
    conn: &Connection,
    command: &str,
    options: &QueryOptions,
) -> Result<String, QueryError> {
    validate_schema(conn)?;
    let result = match command {
        "parts" => query_parts(conn, options),
        "fcstd-map" => query_fcstd_map(conn, options),
        "bom-xref-meta" => query_bom_xref_meta(conn),
        "bom-xref-incoming" => query_bom_xref_incoming(conn, options),
        "bom-xref-outgoing" => query_bom_xref_outgoing(conn, options),
        "bom-xref-counts" => query_bom_xref_counts(conn, options),
        "bom-tree" => query_bom_tree(conn, options),
        "bom-file" => query_bom_file(conn, options),
        "scan-recent" => query_scan_recent(conn, options),
        "file-upsert" => exec_file_upsert(conn, options),
        _ => return Err(QueryError::UnknownCommand(command.to_string())),
    };
    result.map_err(QueryError::from)
}

fn validate_schema(conn: &Connection) -> Result<(), QueryError> {
    let actual = conn
        .query_row(
            "SELECT value FROM phoenix_meta WHERE key = 'schema_version'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(QueryError::from)?;
    if actual.as_deref() == Some("13") {
        Ok(())
    } else {
        Err(QueryError::UnsupportedSchema { actual })
    }
}

fn json<T: Serialize>(value: &T) -> Result<String, rusqlite::Error> {
    serde_json::to_string(value)
        .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))
}

fn query_parts(conn: &Connection, opts: &QueryOptions) -> Result<String, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT part_number, part_version, part_name, type_code, model_series,
                (SELECT COUNT(*) FROM phoenix_cad_part_file_link WHERE part_key_id = pk.id) AS file_count
         FROM phoenix_cad_part_key pk
         WHERE (?1 IS NULL OR part_number LIKE '%' || ?1 || '%'
                OR part_version LIKE '%' || ?1 || '%'
                OR part_name LIKE '%' || ?1 || '%')
         ORDER BY part_number, part_version LIMIT ?2",
    )?;
    let rows = stmt
        .query_map(
            params![opts.search.as_deref(), opts.bounded_limit(5000)],
            |row| {
                Ok(PartRow {
                    part_number: row.get(0)?,
                    part_version: row.get(1)?,
                    part_name: row.get(2)?,
                    type_code: row.get(3)?,
                    model_series: row.get(4)?,
                    file_count: row.get(5)?,
                })
            },
        )?
        .collect::<Result<Vec<_>, _>>()?;
    json(&RowsWrapper { items: rows })
}

fn query_fcstd_map(conn: &Connection, opts: &QueryOptions) -> Result<String, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT repo_rel_path, filename, asset_kind, part_number, part_version, part_name, label, file_status
         FROM phoenix_cad_file_asset
         WHERE file_status = 'present'
           AND (?1 IS NULL OR ?1 = '' OR ?1 = 'all' OR asset_kind = ?1)
           AND (?2 IS NULL OR repo_rel_path LIKE '%' || ?2 || '%'
                OR part_number LIKE '%' || ?2 || '%'
                OR part_name LIKE '%' || ?2 || '%')
         ORDER BY repo_rel_path LIMIT ?3 OFFSET ?4",
    )?;
    let rows = stmt
        .query_map(
            params![
                opts.kind.as_deref(),
                opts.search.as_deref(),
                opts.bounded_limit(5000),
                opts.bounded_offset()
            ],
            map_fcstd_row,
        )?
        .collect::<Result<Vec<_>, _>>()?;
    json(&RowsWrapper { items: rows })
}

fn query_bom_xref_meta(conn: &Connection) -> Result<String, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT fa.repo_rel_path, fa.filename,
                (SELECT COUNT(DISTINCT target_repo_rel_path) FROM phoenix_cad_bom_xref WHERE host_repo_rel_path = fa.repo_rel_path),
                (SELECT COUNT(*) FROM phoenix_cad_bom_line WHERE assembly_rel = fa.repo_rel_path),
                (SELECT COUNT(*) FROM phoenix_cad_bom_xref WHERE target_repo_rel_path = fa.repo_rel_path),
                0
         FROM phoenix_cad_file_asset fa
         WHERE fa.file_status = 'present'
           AND EXISTS (SELECT 1 FROM phoenix_cad_bom_xref WHERE host_repo_rel_path = fa.repo_rel_path)
         ORDER BY fa.repo_rel_path",
    )?;
    let rows = stmt
        .query_map([], |row| {
            Ok(HostRow {
                host_rel: row.get(0)?,
                host_filename: row.get(1)?,
                direct_children: row.get(2)?,
                total_descendants: row.get(3)?,
                incoming_count: row.get(4)?,
                issues_count: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    json(&RowsWrapper { items: rows })
}

fn query_bom_file(conn: &Connection, opts: &QueryOptions) -> Result<String, rusqlite::Error> {
    let rel = opts.rel.as_deref().unwrap_or("");
    let exact = conn
        .query_row(
            "SELECT repo_rel_path, filename, asset_kind, part_number, part_version, part_name, label, file_status
             FROM phoenix_cad_file_asset WHERE repo_rel_path = ?1 AND file_status = 'present'",
            params![rel],
            map_fcstd_row,
        )
        .optional()?;
    let row = match exact {
        Some(row) => Some(row),
        None => conn
            .query_row(
                "SELECT repo_rel_path, filename, asset_kind, part_number, part_version, part_name, label, file_status
                 FROM phoenix_cad_file_asset WHERE repo_rel_path LIKE ?1 AND file_status = 'present' LIMIT 1",
                params![format!("%{rel}")],
                map_fcstd_row,
            )
            .optional()?,
    };
    json(&row)
}

fn query_bom_xref_incoming(
    conn: &Connection,
    opts: &QueryOptions,
) -> Result<String, rusqlite::Error> {
    let rel = opts.rel.as_deref().unwrap_or("");
    let mut stmt = conn.prepare(
        "SELECT DISTINCT x.host_repo_rel_path,
                (SELECT filename FROM phoenix_cad_file_asset WHERE repo_rel_path = x.host_repo_rel_path),
                x.link_label, x.ref_kind
         FROM phoenix_cad_bom_xref x
         WHERE x.target_repo_rel_path = ?1 OR x.target_repo_rel_path LIKE ?2
         ORDER BY x.host_repo_rel_path LIMIT 500",
    )?;
    let rows = stmt
        .query_map(params![rel, format!("%{rel}")], |row| {
            Ok(IncomingRow {
                host_repo_rel_path: row.get(0)?,
                host_filename: row.get(1)?,
                link_label: row.get(2)?,
                ref_kind: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    json(&RowsWrapper { items: rows })
}

fn query_bom_xref_outgoing(
    conn: &Connection,
    opts: &QueryOptions,
) -> Result<String, rusqlite::Error> {
    let rel = opts.rel.as_deref().unwrap_or("");
    let mut stmt = conn.prepare(
        "SELECT DISTINCT x.target_repo_rel_path,
                (SELECT filename FROM phoenix_cad_file_asset WHERE repo_rel_path = x.target_repo_rel_path),
                x.link_label, x.target_part_number
         FROM phoenix_cad_bom_xref x WHERE x.host_repo_rel_path = ?1
         ORDER BY x.target_repo_rel_path LIMIT 500",
    )?;
    let rows = stmt
        .query_map(params![rel], |row| {
            Ok(OutgoingRow {
                target_repo_rel_path: row.get(0)?,
                target_filename: row.get(1)?,
                link_label: row.get(2)?,
                target_part_number: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    json(&RowsWrapper { items: rows })
}

fn query_bom_xref_counts(
    conn: &Connection,
    opts: &QueryOptions,
) -> Result<String, rusqlite::Error> {
    let rel = opts.rel.as_deref().unwrap_or("");
    let incoming: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT host_repo_rel_path) FROM phoenix_cad_bom_xref
         WHERE target_repo_rel_path = ?1 OR target_repo_rel_path LIKE ?2",
        params![rel, format!("%{rel}")],
        |row| row.get(0),
    )?;
    let outgoing: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT target_repo_rel_path) FROM phoenix_cad_bom_xref WHERE host_repo_rel_path = ?1",
        params![rel],
        |row| row.get(0),
    )?;
    let flat_lines: i64 = conn.query_row(
        "SELECT COUNT(*) FROM phoenix_cad_bom_line WHERE assembly_rel = ?1",
        params![rel],
        |row| row.get(0),
    )?;
    json(&serde_json::json!({
        "incoming": incoming,
        "outgoing": outgoing,
        "flat_lines": flat_lines
    }))
}

fn query_bom_tree(conn: &Connection, opts: &QueryOptions) -> Result<String, rusqlite::Error> {
    let rel = opts.rel.as_deref().unwrap_or("");
    let mut stmt = conn.prepare(
        "SELECT depth, part_rel, part_key, quantity, bom_path
         FROM phoenix_cad_bom_line WHERE assembly_rel = ?1
         ORDER BY depth, part_rel LIMIT 5000",
    )?;
    let rows = stmt
        .query_map(params![rel], |row| {
            Ok(BomTreeRow {
                depth: row.get(0)?,
                part_rel: row.get(1)?,
                part_key: row.get(2)?,
                quantity: row.get(3)?,
                bom_path: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    json(&RowsWrapper { items: rows })
}

fn query_scan_recent(conn: &Connection, opts: &QueryOptions) -> Result<String, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT scan_uuid, scanned_at, status, stats_json
         FROM phoenix_cad_scan ORDER BY scanned_at DESC LIMIT ?1",
    )?;
    let rows = stmt
        .query_map(params![opts.bounded_limit(50)], |row| {
            Ok(ScanRow {
                scan_uuid: row.get(0)?,
                scanned_at: row.get(1)?,
                status: row.get(2)?,
                stats_json: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    json(&RowsWrapper { items: rows })
}

fn exec_file_upsert(conn: &Connection, opts: &QueryOptions) -> Result<String, rusqlite::Error> {
    let rel = opts.rel.as_deref().unwrap_or("");
    let filename = rel.rsplit('/').next().unwrap_or(rel);
    let kind = opts.kind.as_deref().unwrap_or("fcstd");
    conn.execute(
        "INSERT INTO phoenix_cad_file_asset
           (repo_rel_path, filename, asset_kind, file_status, last_seen_at, updated_at)
         VALUES (?1, ?2, ?3, 'present', datetime('now'), datetime('now'))
         ON CONFLICT(repo_rel_path) DO UPDATE SET
           asset_kind = excluded.asset_kind,
           file_status = 'present',
           last_seen_at = datetime('now'),
           updated_at = datetime('now')",
        params![rel, filename, kind],
    )?;
    Ok(r#"{"ok":true}"#.to_string())
}

fn map_fcstd_row(row: &rusqlite::Row<'_>) -> Result<FcstdMapRow, rusqlite::Error> {
    Ok(FcstdMapRow {
        repo_rel_path: row.get(0)?,
        filename: row.get(1)?,
        asset_kind: row.get(2)?,
        part_number: row.get(3)?,
        part_version: row.get(4)?,
        part_name: row.get(5)?,
        label: row.get(6)?,
        file_status: row.get(7)?,
    })
}

#[derive(Serialize)]
struct PartRow {
    part_number: String,
    part_version: String,
    part_name: Option<String>,
    type_code: Option<String>,
    model_series: Option<String>,
    file_count: i64,
}

#[derive(Serialize)]
struct FcstdMapRow {
    repo_rel_path: String,
    filename: String,
    asset_kind: Option<String>,
    part_number: Option<String>,
    part_version: Option<String>,
    part_name: Option<String>,
    label: Option<String>,
    file_status: String,
}

#[derive(Serialize)]
struct HostRow {
    host_rel: String,
    host_filename: String,
    direct_children: i64,
    total_descendants: i64,
    incoming_count: i64,
    issues_count: i64,
}

#[derive(Serialize)]
struct IncomingRow {
    host_repo_rel_path: String,
    host_filename: String,
    link_label: Option<String>,
    ref_kind: Option<String>,
}

#[derive(Serialize)]
struct OutgoingRow {
    target_repo_rel_path: String,
    target_filename: String,
    link_label: Option<String>,
    target_part_number: Option<String>,
}

#[derive(Serialize)]
struct BomTreeRow {
    depth: i64,
    part_rel: String,
    part_key: String,
    quantity: i64,
    bom_path: String,
}

#[derive(Serialize)]
struct ScanRow {
    scan_uuid: Option<String>,
    scanned_at: String,
    status: String,
    stats_json: Option<String>,
}

#[derive(Serialize)]
struct RowsWrapper<T: Serialize> {
    items: Vec<T>,
}
