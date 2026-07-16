//! Shared JSON structures for Phoenix CAD native protocol v1.
//!
//! The protocol layer deliberately contains no file, process, database, or
//! host-specific behavior. Native tools keep their legacy commands while
//! exposing a small, read-only v1 surface through these envelopes.

use serde::Serialize;

pub const PROTOCOL_NAME: &str = "phoenix-cad-native";
pub const PROTOCOL_MAJOR: u16 = 1;
pub const PROTOCOL_MINOR: u16 = 0;
pub const SUPPORTED_PROTOCOL_MAJORS: &[u16] = &[PROTOCOL_MAJOR];
pub const INTERNAL_SERIALIZATION_ERROR_MESSAGE: &str = "failed to serialize protocol response";

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
pub struct ProtocolVersion {
    pub major: u16,
    pub minor: u16,
}

impl ProtocolVersion {
    pub const V1: Self = Self {
        major: PROTOCOL_MAJOR,
        minor: PROTOCOL_MINOR,
    };
}

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct ProtocolInfo<'a> {
    pub protocol: &'static str,
    pub protocol_version: ProtocolVersion,
    pub supported_protocol_majors: &'static [u16],
    pub tool: &'a str,
    pub tool_version: &'a str,
    pub capabilities: &'a [&'a str],
    pub legacy_compatible: bool,
}

impl<'a> ProtocolInfo<'a> {
    pub const fn new(tool: &'a str, tool_version: &'a str, capabilities: &'a [&'a str]) -> Self {
        Self {
            protocol: PROTOCOL_NAME,
            protocol_version: ProtocolVersion::V1,
            supported_protocol_majors: SUPPORTED_PROTOCOL_MAJORS,
            tool,
            tool_version,
            capabilities,
            legacy_compatible: true,
        }
    }
}

#[derive(Debug, Serialize, PartialEq)]
pub struct SuccessEnvelope<T> {
    pub protocol: &'static str,
    pub protocol_version: ProtocolVersion,
    pub tool: String,
    pub operation: String,
    pub ok: bool,
    pub result: T,
}

pub fn success<T>(
    tool: impl Into<String>,
    operation: impl Into<String>,
    result: T,
) -> SuccessEnvelope<T> {
    SuccessEnvelope {
        protocol: PROTOCOL_NAME,
        protocol_version: ProtocolVersion::V1,
        tool: tool.into(),
        operation: operation.into(),
        ok: true,
        result,
    }
}

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct ErrorEnvelope {
    pub protocol: &'static str,
    pub protocol_version: ProtocolVersion,
    pub tool: String,
    pub operation: String,
    pub ok: bool,
    pub error: ProtocolError,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct ProtocolError {
    pub code: String,
    pub message: String,
    pub retryable: bool,
}

pub fn failure(
    tool: impl Into<String>,
    operation: impl Into<String>,
    code: impl Into<String>,
    message: impl Into<String>,
) -> ErrorEnvelope {
    ErrorEnvelope {
        protocol: PROTOCOL_NAME,
        protocol_version: ProtocolVersion::V1,
        tool: tool.into(),
        operation: operation.into(),
        ok: false,
        error: ProtocolError {
            code: code.into(),
            message: message.into(),
            retryable: false,
        },
    }
}

pub fn normalize_operation(operation: Option<&str>) -> &str {
    operation
        .filter(|value| !value.is_empty())
        .unwrap_or("unknown")
}

#[derive(Debug, PartialEq, Eq)]
pub struct InternalSerializationFailure {
    pub json: String,
    pub diagnostic: String,
}

pub fn serialize_or_internal_error(
    tool: &str,
    operation: &str,
    value: &(impl Serialize + ?Sized),
) -> Result<String, InternalSerializationFailure> {
    serde_json::to_string(value).map_err(|error| {
        let fallback = failure(
            tool,
            normalize_operation(Some(operation)),
            "internal_error",
            INTERNAL_SERIALIZATION_ERROR_MESSAGE,
        );
        let json = serde_json::to_string(&fallback)
            .expect("the static internal_error envelope is always JSON serializable");
        InternalSerializationFailure {
            json,
            diagnostic: error.to_string(),
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_machine_readable_protocol_info() {
        let value =
            serde_json::to_value(ProtocolInfo::new("fcstd-read", "0.1.0", &["read"])).unwrap();

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
    fn success_and_error_envelopes_have_one_stable_shape() {
        assert_eq!(
            serde_json::to_value(success("fcstd-xlink", "scan", vec!["part.FCStd"])).unwrap(),
            serde_json::json!({
                "protocol": "phoenix-cad-native",
                "protocol_version": { "major": 1, "minor": 0 },
                "tool": "fcstd-xlink",
                "operation": "scan",
                "ok": true,
                "result": ["part.FCStd"]
            })
        );
        assert_eq!(
            serde_json::to_value(failure("fcstd-read", "read", "io_error", "missing file",))
                .unwrap(),
            serde_json::json!({
                "protocol": "phoenix-cad-native",
                "protocol_version": { "major": 1, "minor": 0 },
                "tool": "fcstd-read",
                "operation": "read",
                "ok": false,
                "error": {
                    "code": "io_error",
                    "message": "missing file",
                    "retryable": false
                }
            })
        );
    }

    #[test]
    fn normalizes_empty_operations_and_falls_back_to_internal_error_json() {
        struct SerializationAlwaysFails;

        impl Serialize for SerializationAlwaysFails {
            fn serialize<S>(&self, _serializer: S) -> Result<S::Ok, S::Error>
            where
                S: serde::Serializer,
            {
                Err(serde::ser::Error::custom(
                    "deliberate serialization failure",
                ))
            }
        }

        assert_eq!(normalize_operation(None), "unknown");
        assert_eq!(normalize_operation(Some("")), "unknown");
        assert_eq!(normalize_operation(Some("scan")), "scan");

        let error =
            serialize_or_internal_error("fcstd-read", "", &SerializationAlwaysFails).unwrap_err();
        assert!(error
            .diagnostic
            .contains("deliberate serialization failure"));
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&error.json).unwrap(),
            serde_json::json!({
                "protocol": "phoenix-cad-native",
                "protocol_version": { "major": 1, "minor": 0 },
                "tool": "fcstd-read",
                "operation": "unknown",
                "ok": false,
                "error": {
                    "code": "internal_error",
                    "message": "failed to serialize protocol response",
                    "retryable": false
                }
            })
        );
    }
}
