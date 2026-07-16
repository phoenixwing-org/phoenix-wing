import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PNW_CAD_QUERY_V1_READ_COMMANDS,
  pnwIsCadQueryBomCountsV1,
  pnwIsCadQueryBomTreeRowsV1,
  pnwIsCadQueryContractV1,
  pnwIsCadQueryIncomingRowsV1,
  pnwIsCadQueryOutgoingRowsV1,
} from "./queryV1.js";

function fixture(): Record<string, unknown> {
  return JSON.parse(readFileSync(
    new URL("../fixtures/query-contract-v1.json", import.meta.url),
    "utf8",
  )) as Record<string, unknown>;
}

describe("Phoenix CAD database query protocol v1", () => {
  it("accepts the Rust CLI contract fixture and publishes read-only client commands", () => {
    const value = fixture();
    expect(pnwIsCadQueryContractV1(value)).toBe(true);
    expect(PNW_CAD_QUERY_V1_READ_COMMANDS).not.toContain("file-upsert");
    const rustFixture = JSON.parse(readFileSync(
      new URL("../../cad-rust-source/fixtures/database/query-contract-v1.json", import.meta.url),
      "utf8",
    ));
    expect(rustFixture).toEqual(value);
  });

  it.each([
    ["protocol", { protocol: "desk-query" }],
    ["major", { version: { major: 2, minor: 0 } }],
    ["schema hash", { schema: { id: "phoenix-workspace", version: 13, ddl_sha256: "bad" } }],
    ["commands", { commands: ["parts"] }],
  ])("rejects an incompatible %s", (_label, patch) => {
    expect(pnwIsCadQueryContractV1({ ...fixture(), ...patch })).toBe(false);
  });

  it("guards the shared BOM and reference response DTOs", () => {
    expect(pnwIsCadQueryBomCountsV1({ incoming: 1, outgoing: 2, flat_lines: 3 })).toBe(true);
    expect(pnwIsCadQueryIncomingRowsV1({ items: [{
      host_repo_rel_path: "root.FCStd",
      host_filename: "root.FCStd",
      link_label: null,
      ref_kind: "xlink_file_attr",
    }] })).toBe(true);
    expect(pnwIsCadQueryOutgoingRowsV1({ items: [{
      target_repo_rel_path: "parts/bolt.FCStd",
      target_filename: "bolt.FCStd",
      link_label: "Bolt link",
      target_part_number: "P200",
    }] })).toBe(true);
    expect(pnwIsCadQueryBomTreeRowsV1({ items: [{
      depth: 1,
      part_rel: "parts/bolt.FCStd",
      part_key: "P200-02",
      quantity: 2,
      bom_path: "0/0",
    }] })).toBe(true);
    expect(pnwIsCadQueryBomCountsV1({ incoming: -1, outgoing: 0, flat_lines: 0 })).toBe(false);
    expect(pnwIsCadQueryOutgoingRowsV1({ items: [{ target_repo_rel_path: 1 }] })).toBe(false);
  });
});
