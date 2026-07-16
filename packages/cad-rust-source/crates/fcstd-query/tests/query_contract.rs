use fcstd_query::{
    contract_json, execute_command, QueryError, QueryOptions, WORKSPACE_SCHEMA_SHA256,
};
use rusqlite::Connection;
use serde_json::{json, Value};

fn fixture() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch(include_str!("../../../fixtures/database/query-v13.sql"))
        .unwrap();
    conn
}

fn run(conn: &Connection, command: &str, options: QueryOptions) -> Value {
    serde_json::from_str(&execute_command(conn, command, &options).unwrap()).unwrap()
}

#[test]
fn publishes_versioned_schema_contract() {
    let contract: Value = serde_json::from_str(&contract_json().unwrap()).unwrap();
    let expected: Value = serde_json::from_str(include_str!(
        "../../../fixtures/database/query-contract-v1.json"
    ))
    .unwrap();
    assert_eq!(contract, expected);
    assert_eq!(contract["protocol"], "phoenix-cad-query");
    assert_eq!(contract["version"], json!({ "major": 1, "minor": 0 }));
    assert_eq!(contract["schema"]["version"], 13);
    assert_eq!(contract["schema"]["ddl_sha256"], WORKSPACE_SCHEMA_SHA256);
}

#[test]
fn queries_parts_map_and_graph_from_one_v13_fixture() {
    let conn = fixture();
    let parts = run(
        &conn,
        "parts",
        QueryOptions {
            search: Some("P200".into()),
            limit: 10,
            ..QueryOptions::default()
        },
    );
    assert_eq!(parts["items"][0]["file_count"], 1);

    let map = run(
        &conn,
        "fcstd-map",
        QueryOptions {
            kind: Some("part".into()),
            search: Some("bolt".into()),
            limit: 10,
            ..QueryOptions::default()
        },
    );
    assert_eq!(map["items"].as_array().unwrap().len(), 1);
    assert_eq!(map["items"][0]["repo_rel_path"], "parts/bolt.FCStd");

    let counts = run(
        &conn,
        "bom-xref-counts",
        QueryOptions {
            rel: Some("assembly.FCStd".into()),
            ..QueryOptions::default()
        },
    );
    assert_eq!(
        counts,
        json!({ "incoming": 0, "outgoing": 1, "flat_lines": 1 })
    );
}

#[test]
fn treats_search_and_kind_as_values_not_sql() {
    let conn = fixture();
    let result = run(
        &conn,
        "fcstd-map",
        QueryOptions {
            kind: Some("part' OR 1=1 --".into()),
            search: Some("%' OR 1=1 --".into()),
            limit: 100,
            ..QueryOptions::default()
        },
    );
    assert_eq!(result, json!({ "items": [] }));
}

#[test]
fn blocks_commands_for_an_incompatible_schema_before_writing() {
    let conn = fixture();
    conn.execute(
        "UPDATE phoenix_meta SET value = '12' WHERE key = 'schema_version'",
        [],
    )
    .unwrap();
    let error = execute_command(
        &conn,
        "file-upsert",
        &QueryOptions {
            rel: Some("new.FCStd".into()),
            ..QueryOptions::default()
        },
    )
    .unwrap_err();
    assert!(matches!(
        error,
        QueryError::UnsupportedSchema {
            actual: Some(ref version)
        } if version == "12"
    ));
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM phoenix_cad_file_asset WHERE repo_rel_path = 'new.FCStd'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(count, 0);
}
