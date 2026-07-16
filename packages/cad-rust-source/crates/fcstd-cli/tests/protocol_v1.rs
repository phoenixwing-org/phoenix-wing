use serde_json::Value;
use std::io::Write;
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};

static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn fcstd_read() -> Command {
    Command::new(env!("CARGO_BIN_EXE_fcstd-read"))
}

fn create_fcstd_fixture() -> std::path::PathBuf {
    let xml = r#"<?xml version="1.0"?><Document>
<Objects><Object type="PartDesign::Body" name="Body"/></Objects>
<ObjectData><Object name="Body"><Properties>
<Property name="Label" type="App::PropertyString"><String value="Main Body"/></Property>
</Properties></Object></ObjectData></Document>"#;

    create_archive_fixture(Some(xml))
}

fn create_archive_fixture(document_xml: Option<&str>) -> std::path::PathBuf {
    let path = unique_temp_path("FCStd");
    let file = std::fs::File::create(&path).unwrap();
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default();
    if let Some(xml) = document_xml {
        zip.start_file("Document.xml", options).unwrap();
        zip.write_all(xml.as_bytes()).unwrap();
    } else {
        zip.start_file("GuiDocument.xml", options).unwrap();
        zip.write_all(b"no document").unwrap();
    }
    zip.finish().unwrap();
    path
}

fn unique_temp_path(extension: &str) -> std::path::PathBuf {
    let token = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    std::env::temp_dir().join(format!(
        "phoenix-cad-protocol-{}-{token}-{sequence}.{extension}",
        std::process::id()
    ))
}

fn assert_v1_read_error(path: &std::path::Path, expected_code: &str) {
    let output = fcstd_read()
        .args(["--protocol", "1", "read"])
        .arg(path)
        .output()
        .unwrap();
    assert!(
        !output.status.success(),
        "expected {expected_code}, got stdout={} stderr={}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(!output.stderr.is_empty());
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(value["protocol"], "phoenix-cad-native");
    assert_eq!(
        value["protocol_version"],
        serde_json::json!({ "major": 1, "minor": 0 })
    );
    assert_eq!(value["tool"], "fcstd-read");
    assert_eq!(value["operation"], "read");
    assert_eq!(value["ok"], false);
    assert_eq!(value["error"]["code"], expected_code);
    assert_eq!(value["error"]["retryable"], false);
}

#[test]
fn reports_reader_protocol_info() {
    let output = fcstd_read().arg("--protocol-version").output().unwrap();
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(
        value,
        serde_json::json!({
            "protocol": "phoenix-cad-native",
            "protocol_version": { "major": 1, "minor": 0 },
            "supported_protocol_majors": [1],
            "tool": "fcstd-read",
            "tool_version": "0.1.0",
            "capabilities": ["read"],
            "legacy_compatible": true
        })
    );
}

#[test]
fn reads_snake_case_document_in_v1_envelope_and_keeps_legacy_shape() {
    let path = create_fcstd_fixture();

    let v1 = fcstd_read()
        .args(["--protocol", "1", "read"])
        .arg(&path)
        .output()
        .unwrap();
    assert!(v1.status.success());
    assert!(v1.stderr.is_empty());
    let value: Value = serde_json::from_slice(&v1.stdout).unwrap();
    assert_eq!(value["protocol"], "phoenix-cad-native");
    assert_eq!(value["operation"], "read");
    assert_eq!(value["ok"], true);
    assert_eq!(value["tool"], "fcstd-read");
    assert_eq!(value["result"]["objects"][0]["type_id"], "PartDesign::Body");
    assert!(value["result"]["objects"][0].get("typeId").is_none());
    assert_eq!(value["result"]["objects"][0]["is_valid_bom_item"], true);
    assert!(value["result"]["objects"][0]
        .get("isValidBomItem")
        .is_none());

    let legacy = fcstd_read().arg(&path).output().unwrap();
    assert!(legacy.status.success());
    let legacy_value: Value = serde_json::from_slice(&legacy.stdout).unwrap();
    assert_eq!(legacy_value["objects"][0]["typeId"], "PartDesign::Body");
    assert!(legacy_value["objects"][0].get("type_id").is_none());

    std::fs::remove_file(path).unwrap();
}

#[test]
fn rejects_write_operations_from_v1() {
    let output = fcstd_read()
        .args(["--protocol", "1", "write-bom"])
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(!output.stderr.is_empty());
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(value["ok"], false);
    assert_eq!(value["operation"], "write-bom");
    assert_eq!(value["error"]["code"], "unsupported_operation");
    assert_eq!(value["error"]["retryable"], false);
}

#[test]
fn normalizes_an_empty_reader_operation_to_unknown() {
    let output = fcstd_read().args(["--protocol", "1", ""]).output().unwrap();
    assert!(!output.status.success());
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(value["operation"], "unknown");
    assert_eq!(value["error"]["code"], "unsupported_operation");
}

#[test]
fn maps_reader_failures_to_stable_v1_error_codes() {
    let missing = unique_temp_path("missing.FCStd");
    let _ = std::fs::remove_file(&missing);
    assert_v1_read_error(&missing, "io_error");

    let invalid_archive = unique_temp_path("invalid.FCStd");
    std::fs::write(&invalid_archive, b"not a zip archive").unwrap();
    assert_v1_read_error(&invalid_archive, "invalid_fcstd_archive");

    let missing_document = create_archive_fixture(None);
    assert_v1_read_error(&missing_document, "missing_document_xml");

    let invalid_document = create_archive_fixture(Some("<Document><Broken></Document>"));
    assert_v1_read_error(&invalid_document, "invalid_document_xml");

    for path in [invalid_archive, missing_document, invalid_document] {
        std::fs::remove_file(path).unwrap();
    }
}

#[test]
fn rejects_non_finite_placement_from_v1() {
    let xml = r#"<?xml version="1.0"?><Document>
<Objects><Object type="PartDesign::Body" name="Body"/></Objects>
<ObjectData><Object name="Body"><Properties>
<Property name="Placement" type="App::PropertyPlacement">
<PropertyPlacement Px="NaN" Py="0" Pz="0" Q0="0" Q1="0" Q2="0" Q3="1"/>
</Property>
</Properties></Object></ObjectData></Document>"#;
    let path = create_archive_fixture(Some(xml));
    assert_v1_read_error(&path, "invalid_numeric_value");
    std::fs::remove_file(path).unwrap();
}

#[test]
fn rejects_non_finite_property_from_v1() {
    let xml = r#"<?xml version="1.0"?><Document>
<Objects><Object type="PartDesign::Body" name="Body"/></Objects>
<ObjectData><Object name="Body"><Properties>
<Property name="Mass" type="App::PropertyFloat"><Float value="inf"/></Property>
</Properties></Object></ObjectData></Document>"#;
    let path = create_archive_fixture(Some(xml));
    assert_v1_read_error(&path, "invalid_numeric_value");
    std::fs::remove_file(path).unwrap();
}
