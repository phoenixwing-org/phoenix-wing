//! fcstd-xlink CLI — XLink 修改命令行
use phoenix_cad_protocol::{
    failure, normalize_operation, serialize_or_internal_error, success, ProtocolInfo,
};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;

const TOOL: &str = "fcstd-xlink";
const V1_CAPABILITIES: &[&str] = &["scan"];

fn main() {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("--protocol-version") => print_protocol_info(),
        Some("--protocol") => run_protocol_v1(&args[2..]),
        _ => run_legacy(&args),
    }
}

fn print_protocol_info() {
    print_json(
        "protocol_version",
        &ProtocolInfo::new(TOOL, env!("CARGO_PKG_VERSION"), V1_CAPABILITIES),
    );
}

fn run_protocol_v1(args: &[String]) {
    let operation = normalize_operation(args.get(1).map(String::as_str));
    if args.first().map(String::as_str) != Some("1") {
        protocol_error(
            operation,
            "unsupported_protocol",
            "only protocol major version 1 is supported",
            2,
        );
    }

    match operation {
        "scan" => {
            if args.len() != 4 {
                protocol_error(
                    operation,
                    "invalid_arguments",
                    "scan requires <xml_file|-> <target_basename>",
                    2,
                );
            }
            let xml = match read_scan_input(&args[2]) {
                Ok(xml) => xml,
                Err(message) => protocol_error(operation, "io_error", message, 1),
            };
            let hits = fcstd_xlink::scan_xlink_hits(&xml, &args[3]);
            print_json(
                operation,
                &success(TOOL, operation, V1XlinkScanResult { hits }),
            );
        }
        _ => protocol_error(
            operation,
            "unsupported_operation",
            format!("operation '{operation}' is not available in protocol v1"),
            2,
        ),
    }
}

#[derive(Serialize)]
struct V1XlinkScanResult {
    hits: Vec<fcstd_xlink::XlinkHit>,
}

fn read_scan_input(source: &str) -> Result<String, String> {
    if source == "-" {
        std::io::read_to_string(std::io::stdin())
            .map_err(|error| format!("failed to read stdin: {error}"))
    } else {
        std::fs::read_to_string(source)
            .map_err(|error| format!("failed to read '{source}': {error}"))
    }
}

fn protocol_error(operation: &str, code: &str, message: impl Into<String>, exit_code: i32) -> ! {
    let message = message.into();
    eprintln!("{code}: {message}");
    print_json(operation, &failure(TOOL, operation, code, message));
    std::process::exit(exit_code);
}

fn print_json(operation: &str, value: &impl Serialize) {
    match serialize_or_internal_error(TOOL, operation, value) {
        Ok(json) => println!("{json}"),
        Err(error) => {
            eprintln!("json_serialization_failed: {}", error.diagnostic);
            println!("{}", error.json);
            std::process::exit(70);
        }
    }
}

fn run_legacy(args: &[String]) {
    if args.len() < 3 {
        eprintln!("fcstd-xlink <command> <args>");
        eprintln!("  patch <file.fcstd> <old_attr>=<new_attr> ...");
        eprintln!("  patch-labels <file.fcstd> <labels.json>");
        eprintln!("  scan <xml_file|-> <target_basename>");
        std::process::exit(1);
    }
    match args[1].as_str() {
        "patch" => {
            let path = PathBuf::from(&args[2]);
            let mut reps = HashMap::new();
            for a in &args[3..] {
                if let Some((k, v)) = a.split_once('=') {
                    reps.insert(k.to_string(), v.to_string());
                }
            }
            match fcstd_xlink::patch_fcstd_xlink_attrs(&path, &reps) {
                Ok(n) => println!(r#"{{"ok":true,"count":{}}}"#, n),
                Err(e) => {
                    eprintln!("Error: {e}");
                    std::process::exit(1);
                }
            }
        }
        "patch-labels" => {
            if args.len() < 4 {
                eprintln!("patch-labels requires <file.fcstd> <labels.json>");
                std::process::exit(1);
            }
            let path = PathBuf::from(&args[2]);
            let labels: HashMap<String, String> = match std::fs::read_to_string(&args[3])
                .ok()
                .and_then(|raw| serde_json::from_str(&raw).ok())
            {
                Some(value) => value,
                None => {
                    eprintln!("Error: invalid label map JSON");
                    std::process::exit(1);
                }
            };
            match fcstd_xlink::patch_fcstd_reference_labels(&path, &labels) {
                Ok(changes) => println!(
                    "{}",
                    serde_json::json!({ "ok": true, "count": changes.len(), "changes": changes })
                ),
                Err(e) => {
                    eprintln!("Error: {e}");
                    std::process::exit(1);
                }
            }
        }
        "scan" => {
            if args.len() < 4 {
                eprintln!("scan requires <xml_file|-> <target_basename>");
                std::process::exit(1);
            }
            let xml = if args[2] == "-" {
                std::io::read_to_string(std::io::stdin()).unwrap()
            } else {
                std::fs::read_to_string(&args[2]).unwrap()
            };
            let hits = fcstd_xlink::scan_xlink_hits(&xml, &args[3]);
            println!("{}", serde_json::to_string(&hits).unwrap());
        }
        _ => {
            eprintln!("Unknown command");
            std::process::exit(1);
        }
    }
}
