use serde_json::Value;
use std::process::Command;

fn fcstd_xlink() -> Command {
    Command::new(env!("CARGO_BIN_EXE_fcstd-xlink"))
}

fn create_xml_fixture() -> std::path::PathBuf {
    let token = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let path = std::env::temp_dir().join(format!("phoenix-cad-xlink-{token}.xml"));
    std::fs::write(
        &path,
        r#"<Document><XLink file="parts/part.FCStd" label="Part 1"/><XLink file="other.FCStd"/></Document>"#,
    )
    .unwrap();
    path
}

#[test]
fn reports_xlink_protocol_info() {
    let output = fcstd_xlink().arg("--protocol-version").output().unwrap();
    assert!(output.status.success());
    assert!(output.stderr.is_empty());
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(
        value,
        serde_json::json!({
            "protocol": "phoenix-cad-native",
            "protocol_version": { "major": 1, "minor": 0 },
            "supported_protocol_majors": [1],
            "tool": "fcstd-xlink",
            "tool_version": "0.1.0",
            "capabilities": ["scan"],
            "legacy_compatible": true
        })
    );
}

#[test]
fn scans_in_v1_envelope_and_keeps_legacy_scan() {
    let path = create_xml_fixture();
    let v1 = fcstd_xlink()
        .args(["--protocol", "1", "scan"])
        .arg(&path)
        .arg("part.FCStd")
        .output()
        .unwrap();
    assert!(v1.status.success());
    assert!(v1.stderr.is_empty());
    let value: Value = serde_json::from_slice(&v1.stdout).unwrap();
    assert_eq!(value["protocol"], "phoenix-cad-native");
    assert_eq!(value["tool"], "fcstd-xlink");
    assert_eq!(value["operation"], "scan");
    assert_eq!(value["ok"], true);
    assert_eq!(value["result"]["hits"][0]["file"], "parts/part.FCStd");
    assert_eq!(value["result"]["hits"][0]["label"], "Part 1");

    let legacy = fcstd_xlink()
        .arg("scan")
        .arg(&path)
        .arg("part.FCStd")
        .output()
        .unwrap();
    assert!(legacy.status.success());
    let legacy_value: Value = serde_json::from_slice(&legacy.stdout).unwrap();
    assert!(legacy_value.is_array());
    assert_eq!(legacy_value[0]["file"], "parts/part.FCStd");

    std::fs::remove_file(path).unwrap();
}

#[test]
fn rejects_patch_operations_from_v1() {
    let output = fcstd_xlink()
        .args(["--protocol", "1", "patch"])
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(!output.stderr.is_empty());
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(value["ok"], false);
    assert_eq!(value["operation"], "patch");
    assert_eq!(value["error"]["code"], "unsupported_operation");
    assert_eq!(value["error"]["retryable"], false);
}

#[test]
fn normalizes_an_empty_xlink_operation_to_unknown() {
    let output = fcstd_xlink()
        .args(["--protocol", "1", ""])
        .output()
        .unwrap();
    assert!(!output.status.success());
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(value["operation"], "unknown");
    assert_eq!(value["error"]["code"], "unsupported_operation");
}

#[test]
fn reports_scan_input_errors_as_json_and_nonzero_exit() {
    let token = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let missing = std::env::temp_dir().join(format!("phoenix-cad-missing-{token}.xml"));
    let _ = std::fs::remove_file(&missing);

    let output = fcstd_xlink()
        .args(["--protocol", "1", "scan"])
        .arg(&missing)
        .arg("part.FCStd")
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(!output.stderr.is_empty());
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(value["tool"], "fcstd-xlink");
    assert_eq!(value["operation"], "scan");
    assert_eq!(value["ok"], false);
    assert_eq!(value["error"]["code"], "io_error");
    assert_eq!(value["error"]["retryable"], false);
}
