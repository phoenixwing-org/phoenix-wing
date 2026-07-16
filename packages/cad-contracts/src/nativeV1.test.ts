import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PNW_CAD_NATIVE_PROTOCOL,
  PNW_CAD_NATIVE_PROTOCOL_VERSION,
  PNW_CAD_NATIVE_SUPPORTED_PROTOCOL_MAJORS,
  PNW_CAD_NATIVE_V1_CAPABILITIES,
  pnwIsCadNativeProtocolInfo,
  pnwIsCadNativeV1Compatible,
  pnwIsCadNativeV1Envelope,
  pnwIsCadNativeV1ReadSuccess,
  pnwIsCadNativeV1XlinkScanSuccess,
} from "./nativeV1.js";

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
}

describe("Phoenix CAD native protocol v1", () => {
  it("accepts the real FreeCAD Document.xml xlink golden fixture", () => {
    expect(pnwIsCadNativeV1XlinkScanSuccess(
      readFixture("native-xlink-real-success-v1.json"),
    )).toBe(true);
  });

  it("publishes the stable real FCStd read parity summary", () => {
    expect(readFixture("native-read-real-summary-v1.json")).toMatchObject({
      protocol: PNW_CAD_NATIVE_PROTOCOL,
      protocol_version: PNW_CAD_NATIVE_PROTOCOL_VERSION,
      tool: "fcstd-read",
      operation: "read",
      ok: true,
      summary: {
        objects: 66,
        bom_items: 10,
        root_names: ["PCB"],
        selected: { name: "_6222656233", type_id: "App::Part", level: 2 },
      },
    });
  });

  it("accepts protocol info and negotiates compatibility by major version", () => {
    const info = readFixture("native-protocol-info-v1.json");
    expect(pnwIsCadNativeProtocolInfo(info)).toBe(true);
    expect(pnwIsCadNativeV1Compatible(info)).toBe(true);
    expect({
      protocol: PNW_CAD_NATIVE_PROTOCOL,
      protocol_version: PNW_CAD_NATIVE_PROTOCOL_VERSION,
      supported_protocol_majors: PNW_CAD_NATIVE_SUPPORTED_PROTOCOL_MAJORS,
      capabilities: PNW_CAD_NATIVE_V1_CAPABILITIES,
    }).toEqual({
      protocol: "phoenix-cad-native",
      protocol_version: { major: 1, minor: 0 },
      supported_protocol_majors: [1],
      capabilities: {
        "fcstd-read": ["read"],
        "fcstd-xlink": ["scan"],
      },
    });

    expect(pnwIsCadNativeV1Compatible({
      ...(info as Record<string, unknown>),
      protocol_version: { major: 2, minor: 0 },
      supported_protocol_majors: [1, 2],
    })).toBe(true);
    expect(pnwIsCadNativeV1Compatible({
      ...(info as Record<string, unknown>),
      protocol_version: { major: 2, minor: 0 },
      supported_protocol_majors: [2],
    })).toBe(false);
  });

  it("accepts the read, scan and error envelopes", () => {
    expect(pnwIsCadNativeV1ReadSuccess(readFixture("native-read-success-v1.json"))).toBe(true);
    expect(pnwIsCadNativeV1XlinkScanSuccess(readFixture("native-xlink-scan-success-v1.json"))).toBe(true);
    expect(pnwIsCadNativeV1Envelope(readFixture("native-error-v1.json"))).toBe(true);
  });

  it.each([
    ["empty tool", { tool: "" }],
    ["empty tool version", { tool_version: "" }],
    ["empty capability", { capabilities: [""] }],
    ["duplicate capabilities", { capabilities: ["read", "read"] }],
    ["empty supported majors", { supported_protocol_majors: [] }],
    ["duplicate supported majors", { supported_protocol_majors: [1, 1] }],
    ["invalid supported major", { supported_protocol_majors: [-1] }],
    ["negative minor", { protocol_version: { major: 1, minor: -1 } }],
  ])("rejects protocol info with %s", (_label, patch) => {
    const info = readFixture("native-protocol-info-v1.json") as Record<string, unknown>;
    Object.assign(info, patch);
    expect(pnwIsCadNativeProtocolInfo(info)).toBe(false);
  });

  it("allows unknown optional fields for compatible v1 minor releases", () => {
    const value = readFixture("native-read-success-v1.json") as Record<string, unknown>;
    value.future_optional_field = { supported: true };
    expect(pnwIsCadNativeV1ReadSuccess(value)).toBe(true);
  });

  it("rejects mixed-case legacy fields inside a v1 document", () => {
    const value = readFixture("native-read-success-v1.json") as {
      result: { objects: Array<Record<string, unknown>> };
    };
    value.result.objects[0].typeId = value.result.objects[0].type_id;
    delete value.result.objects[0].type_id;
    expect(pnwIsCadNativeV1ReadSuccess(value)).toBe(false);
  });

  it("keeps the Rust source manifest aligned with the public contract", () => {
    const manifest = JSON.parse(readFileSync(
      new URL("../../cad-rust-source/source-manifest.json", import.meta.url),
      "utf8",
    )) as Record<string, unknown>;
    expect(manifest).toMatchObject({
      schema_version: 4,
      legacy_protocol: {
        kind: "desk-tools-v0",
        json_field_case: "mixed",
      },
      native_protocol: {
        kind: PNW_CAD_NATIVE_PROTOCOL,
        version: PNW_CAD_NATIVE_PROTOCOL_VERSION,
        version_query: true,
        version_query_args: ["--protocol-version"],
        supported_protocol_majors: [1],
        legacy_compatible: true,
      },
      database_query_protocol: {
        kind: "phoenix-cad-query",
        version: { major: 1, minor: 0 },
        contract_query_args: ["--contract"],
        workspace_schema: {
          id: "phoenix-workspace",
          version: 13,
          ddl_sha256: "116c5bff9c95e6f670b9ecfc52c053ee08e33e9cf1f3f3b46c02888e97643e1c",
        },
      },
      database_tools: {
        "fcstd-query": {
          package: "fcstd-query",
          contract_query_args: ["--contract"],
        },
      },
      binaries: {
        "fcstd-read": { protocol_v1_capabilities: ["read"] },
        "fcstd-xlink": { protocol_v1_capabilities: ["scan"] },
      },
    });
  });
});
