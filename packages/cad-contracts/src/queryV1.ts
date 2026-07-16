export const PNW_CAD_QUERY_PROTOCOL = "phoenix-cad-query" as const;
export const PNW_CAD_QUERY_PROTOCOL_VERSION = { major: 1, minor: 0 } as const;

export const PNW_CAD_QUERY_V1_READ_COMMANDS = [
  "parts",
  "fcstd-map",
  "bom-xref-meta",
  "bom-xref-incoming",
  "bom-xref-outgoing",
  "bom-xref-counts",
  "bom-tree",
  "bom-file",
  "scan-recent",
] as const;

export const PNW_CAD_QUERY_V1_WRITE_COMMANDS = ["file-upsert"] as const;

export type PnwCadQueryV1ReadCommand = (typeof PNW_CAD_QUERY_V1_READ_COMMANDS)[number];
export type PnwCadQueryV1WriteCommand = (typeof PNW_CAD_QUERY_V1_WRITE_COMMANDS)[number];
export type PnwCadQueryV1Command = PnwCadQueryV1ReadCommand | PnwCadQueryV1WriteCommand;

export interface PnwCadQueryContractV1 {
  readonly protocol: typeof PNW_CAD_QUERY_PROTOCOL;
  readonly version: typeof PNW_CAD_QUERY_PROTOCOL_VERSION;
  readonly schema: {
    readonly id: string;
    readonly version: number;
    readonly ddl_sha256: string;
  };
  readonly commands: readonly PnwCadQueryV1Command[];
}

export interface PnwCadQueryBomCountsV1 {
  readonly incoming: number;
  readonly outgoing: number;
  readonly flat_lines: number;
}

export interface PnwCadQueryIncomingReferenceV1 {
  readonly host_repo_rel_path: string;
  readonly host_filename: string;
  readonly link_label: string | null;
  readonly ref_kind: string | null;
}

export interface PnwCadQueryOutgoingReferenceV1 {
  readonly target_repo_rel_path: string;
  readonly target_filename: string;
  readonly link_label: string | null;
  readonly target_part_number: string | null;
}

export interface PnwCadQueryBomTreeRowV1 {
  readonly depth: number;
  readonly part_rel: string;
  readonly part_key: string;
  readonly quantity: number;
  readonly bom_path: string;
}

export interface PnwCadQueryRowsV1<T> {
  readonly items: readonly T[];
}

/** Minimal, driver-neutral surface required by the v1 read-only query core. */
export interface PnwCadReadonlyDatabaseV1 {
  get<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): T | undefined;
  all<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): T[];
}

export interface PnwCadWorkspaceSummaryV1 {
  readonly counts: PnwCadQueryBomCountsV1;
  readonly incoming: readonly PnwCadQueryIncomingReferenceV1[];
  readonly outgoing: readonly PnwCadQueryOutgoingReferenceV1[];
  readonly bom: readonly PnwCadQueryBomTreeRowV1[];
}

/**
 * Executes the stable phoenix-cad-query v1 BOM/reference reads without owning
 * a SQLite driver. Hosts may provide node:sqlite, WASM, Rust or another
 * adapter, but every implementation shares the same parameterized SQL and DTO
 * guards. This function never executes a write statement.
 */
export function pnwQueryCadWorkspaceSummaryV1(
  database: PnwCadReadonlyDatabaseV1,
  relativePath: string,
): PnwCadWorkspaceSummaryV1 {
  assertSafeWorkspaceRelativePath(relativePath);
  const schema = database.get<{ value: unknown }>(
    "SELECT value FROM phoenix_meta WHERE key = ?",
    ["schema_version"],
  );
  if (String(schema?.value ?? "") !== "13") {
    throw new Error(`unsupported workspace schema: expected phoenix-workspace v13, got ${String(schema?.value ?? "missing schema_version")}`);
  }

  const suffix = `%${relativePath}`;
  const counts: PnwCadQueryBomCountsV1 = {
    incoming: readNonNegativeCount(database, `
      SELECT COUNT(DISTINCT host_repo_rel_path) AS value
      FROM phoenix_cad_bom_xref
      WHERE target_repo_rel_path = ? OR target_repo_rel_path LIKE ?
    `, [relativePath, suffix]),
    outgoing: readNonNegativeCount(database, `
      SELECT COUNT(DISTINCT target_repo_rel_path) AS value
      FROM phoenix_cad_bom_xref
      WHERE host_repo_rel_path = ?
    `, [relativePath]),
    flat_lines: readNonNegativeCount(database, `
      SELECT COUNT(*) AS value
      FROM phoenix_cad_bom_line
      WHERE assembly_rel = ?
    `, [relativePath]),
  };
  const incoming = database.all<PnwCadQueryIncomingReferenceV1>(`
    SELECT DISTINCT x.host_repo_rel_path,
      (SELECT filename FROM phoenix_cad_file_asset WHERE repo_rel_path = x.host_repo_rel_path) AS host_filename,
      x.link_label,
      x.ref_kind
    FROM phoenix_cad_bom_xref x
    WHERE x.target_repo_rel_path = ? OR x.target_repo_rel_path LIKE ?
    ORDER BY x.host_repo_rel_path
    LIMIT 500
  `, [relativePath, suffix]);
  const outgoing = database.all<PnwCadQueryOutgoingReferenceV1>(`
    SELECT DISTINCT x.target_repo_rel_path,
      (SELECT filename FROM phoenix_cad_file_asset WHERE repo_rel_path = x.target_repo_rel_path) AS target_filename,
      x.link_label,
      x.target_part_number
    FROM phoenix_cad_bom_xref x
    WHERE x.host_repo_rel_path = ?
    ORDER BY x.target_repo_rel_path
    LIMIT 500
  `, [relativePath]);
  const bom = database.all<PnwCadQueryBomTreeRowV1>(`
    SELECT depth, part_rel, part_key, quantity, bom_path
    FROM phoenix_cad_bom_line
    WHERE assembly_rel = ?
    ORDER BY depth, part_rel
    LIMIT 5000
  `, [relativePath]);

  if (!pnwIsCadQueryBomCountsV1(counts)) throw new Error("BOM count query returned an invalid phoenix-cad-query v1 payload");
  if (!pnwIsCadQueryIncomingRowsV1({ items: incoming })) throw new Error("incoming reference query returned an invalid phoenix-cad-query v1 payload");
  if (!pnwIsCadQueryOutgoingRowsV1({ items: outgoing })) throw new Error("outgoing reference query returned an invalid phoenix-cad-query v1 payload");
  if (!pnwIsCadQueryBomTreeRowsV1({ items: bom })) throw new Error("BOM tree query returned an invalid phoenix-cad-query v1 payload");
  return { counts, incoming, outgoing, bom };
}

export function pnwIsCadQueryContractV1(value: unknown): value is PnwCadQueryContractV1 {
  if (!isRecord(value)
      || value.protocol !== PNW_CAD_QUERY_PROTOCOL
      || !isRecord(value.version)
      || value.version.major !== PNW_CAD_QUERY_PROTOCOL_VERSION.major
      || !Number.isInteger(value.version.minor)
      || Number(value.version.minor) < PNW_CAD_QUERY_PROTOCOL_VERSION.minor
      || !isRecord(value.schema)
      || !isNonEmptyString(value.schema.id)
      || !Number.isInteger(value.schema.version)
      || Number(value.schema.version) < 1
      || !isSha256(value.schema.ddl_sha256)
      || !Array.isArray(value.commands)
      || value.commands.length === 0
      || !value.commands.every(isNonEmptyString)
      || new Set(value.commands).size !== value.commands.length) return false;
  const commands = value.commands as string[];
  return [
    ...PNW_CAD_QUERY_V1_READ_COMMANDS,
    ...PNW_CAD_QUERY_V1_WRITE_COMMANDS,
  ].every((command) => commands.includes(command));
}

export function pnwIsCadQueryBomCountsV1(value: unknown): value is PnwCadQueryBomCountsV1 {
  return isRecord(value)
    && isNonNegativeInteger(value.incoming)
    && isNonNegativeInteger(value.outgoing)
    && isNonNegativeInteger(value.flat_lines);
}

export function pnwIsCadQueryIncomingRowsV1(
  value: unknown,
): value is PnwCadQueryRowsV1<PnwCadQueryIncomingReferenceV1> {
  return isRows(value, (row: unknown): row is PnwCadQueryIncomingReferenceV1 => isRecord(row)
    && isString(row.host_repo_rel_path)
    && isString(row.host_filename)
    && isNullableString(row.link_label)
    && isNullableString(row.ref_kind));
}

export function pnwIsCadQueryOutgoingRowsV1(
  value: unknown,
): value is PnwCadQueryRowsV1<PnwCadQueryOutgoingReferenceV1> {
  return isRows(value, (row: unknown): row is PnwCadQueryOutgoingReferenceV1 => isRecord(row)
    && isString(row.target_repo_rel_path)
    && isString(row.target_filename)
    && isNullableString(row.link_label)
    && isNullableString(row.target_part_number));
}

export function pnwIsCadQueryBomTreeRowsV1(
  value: unknown,
): value is PnwCadQueryRowsV1<PnwCadQueryBomTreeRowV1> {
  return isRows(value, (row: unknown): row is PnwCadQueryBomTreeRowV1 => isRecord(row)
    && isNonNegativeInteger(row.depth)
    && isString(row.part_rel)
    && isString(row.part_key)
    && isNonNegativeInteger(row.quantity)
    && isString(row.bom_path));
}

function isRows<T>(value: unknown, guard: (row: unknown) => row is T): value is PnwCadQueryRowsV1<T> {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(guard);
}

function readNonNegativeCount(
  database: PnwCadReadonlyDatabaseV1,
  sql: string,
  params: readonly unknown[],
): number {
  const value = database.get<{ value: unknown }>(sql, params)?.value;
  const count = typeof value === "bigint" && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : value;
  if (!isNonNegativeInteger(count)) throw new Error("CAD query returned an invalid count");
  return count;
}

function assertSafeWorkspaceRelativePath(relativePath: string): void {
  const segments = relativePath.split("/");
  if (!relativePath
      || relativePath.includes("\\")
      || relativePath.startsWith("/")
      || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("CAD query requires a safe workspace-relative path");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}
