//! cad-rust CLI: read FCStd files, write BOM properties.
use phoenix_cad_protocol::{
    failure, normalize_operation, serialize_or_internal_error, success, ProtocolInfo,
};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;

const TOOL: &str = "fcstd-read";
const V1_CAPABILITIES: &[&str] = &["read"];

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
        "read" => {
            if args.len() != 3 {
                protocol_error(
                    operation,
                    "invalid_arguments",
                    "read requires exactly one <file.fcstd> argument",
                    2,
                );
            }
            let path = PathBuf::from(&args[2]);
            match fcstd_reader::read_fcstd(&path) {
                Ok(document) => match V1FcstdDocument::try_from(document) {
                    Ok(document) => print_json(operation, &success(TOOL, operation, document)),
                    Err(message) => protocol_error(operation, "invalid_numeric_value", message, 1),
                },
                Err(error) => {
                    protocol_error(operation, fcstd_error_code(&error), error.to_string(), 1);
                }
            }
        }
        _ => protocol_error(
            operation,
            "unsupported_operation",
            format!("operation '{operation}' is not available in protocol v1"),
            2,
        ),
    }
}

fn fcstd_error_code(error: &fcstd_reader::FcstdError) -> &'static str {
    match error {
        fcstd_reader::FcstdError::Io { .. } => "io_error",
        fcstd_reader::FcstdError::Zip { .. } => "invalid_fcstd_archive",
        fcstd_reader::FcstdError::MissingDocumentXml => "missing_document_xml",
        fcstd_reader::FcstdError::Xml { .. } => "invalid_document_xml",
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

#[derive(Serialize)]
struct V1FcstdDocument {
    objects: Vec<V1FcstdObject>,
    xlinks: Vec<fcstd_reader::XLinkRef>,
    root_names: Vec<String>,
}

#[derive(Serialize)]
struct V1FcstdObject {
    name: String,
    label: String,
    type_id: String,
    children: Vec<String>,
    properties: HashMap<String, fcstd_reader::PropertyValue>,
    material: Option<String>,
    placement: Option<fcstd_reader::Placement>,
    is_valid_bom_item: bool,
    level: u32,
}

impl TryFrom<fcstd_reader::FcstdDocument> for V1FcstdDocument {
    type Error = String;

    fn try_from(document: fcstd_reader::FcstdDocument) -> Result<Self, Self::Error> {
        let mut objects = Vec::with_capacity(document.objects.len());
        for object in document.objects {
            validate_finite_numbers(&object)?;
            objects.push(V1FcstdObject {
                name: object.name,
                label: object.label,
                type_id: object.type_id,
                children: object.children,
                properties: object.properties,
                material: object.material,
                placement: object.placement,
                is_valid_bom_item: object.is_valid_bom_item,
                level: object.level,
            });
        }
        Ok(Self {
            objects,
            xlinks: document.xlinks,
            root_names: document.root_names,
        })
    }
}

fn validate_finite_numbers(object: &fcstd_reader::FcstdObject) -> Result<(), String> {
    if let Some(placement) = &object.placement {
        let components = [
            ("x", placement.x),
            ("y", placement.y),
            ("z", placement.z),
            ("q0", placement.q0),
            ("q1", placement.q1),
            ("q2", placement.q2),
            ("q3", placement.q3),
        ];
        if let Some((field, value)) = components.into_iter().find(|(_, value)| !value.is_finite()) {
            return Err(format!(
                "object '{}' placement.{field} must be finite, got {value}",
                object.name
            ));
        }
    }

    for (property, value) in &object.properties {
        if let fcstd_reader::PropertyValue::Float(value) = value {
            if !value.is_finite() {
                return Err(format!(
                    "object '{}' property '{property}' must be finite, got {value}",
                    object.name
                ));
            }
        }
    }
    Ok(())
}

fn run_legacy(args: &[String]) {
    if args.len() < 2 {
        eprintln!("Usage: fcstd-read <file.fcstd>");
        eprintln!("       fcstd-read write-bom <file.fcstd> <key=value>...");
        std::process::exit(1);
    }

    if args[1] == "write-bom" {
        if args.len() < 4 {
            eprintln!("Usage: fcstd-read write-bom <file.fcstd> <key=value>...");
            std::process::exit(1);
        }
        let path = PathBuf::from(&args[2]);
        let mut values = HashMap::new();
        for arg in &args[3..] {
            if let Some((k, v)) = arg.split_once('=') {
                values.insert(k.to_string(), v.to_string());
            }
        }
        match fcstd_reader::write::write_bom_props(&path, &values) {
            Ok(true) => println!("{{\"ok\":true,\"written\":{}}}", values.len()),
            Ok(false) => {
                eprintln!("No suitable mount object found");
                std::process::exit(2);
            }
            Err(e) => {
                eprintln!("Error: {e}");
                std::process::exit(1);
            }
        }
    } else {
        let path = PathBuf::from(&args[1]);
        match fcstd_reader::read_fcstd(&path) {
            Ok(doc) => println!("{}", serde_json::to_string_pretty(&doc).unwrap()),
            Err(e) => {
                eprintln!("Error: {e}");
                std::process::exit(1);
            }
        }
    }
}
