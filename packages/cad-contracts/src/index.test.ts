import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PNW_CAD_LEGACY_PROTOCOL,
  pnwIsLegacyFcstdDocument,
} from "./index.js";

const fixture = JSON.parse(readFileSync(
  new URL("../fixtures/fcstd-document-legacy-v0.json", import.meta.url),
  "utf8",
)) as unknown;

describe("Desk Tools legacy CAD contract", () => {
  it("freezes the mixed-case raw FCStd document shape", () => {
    expect(PNW_CAD_LEGACY_PROTOCOL).toBe("desk-tools-v0");
    expect(pnwIsLegacyFcstdDocument(fixture)).toBe(true);
    expect(fixture).toMatchObject({
      objects: [{
        typeId: "PartDesign::Body",
        material: "Steel",
        placement: { x: 1.25, q3: 1 },
        properties: { PartNumber: "100001", Mass: 2.5 },
        isValidBomItem: true,
      }],
      xlinks: [
        { file: "linked.FCStd", label: "Linked part" },
        { file: "unlabelled.FCStd", label: null },
      ],
      root_names: ["Body"],
    });
  });

  it("does not accidentally accept the future snake_case object shape", () => {
    expect(pnwIsLegacyFcstdDocument({
      objects: [{
        name: "Body",
        label: "Body",
        type_id: "PartDesign::Body",
        children: [],
        properties: {},
        material: null,
        placement: null,
        is_valid_bom_item: true,
        level: 0,
      }],
      xlinks: [],
      root_names: ["Body"],
    })).toBe(false);
  });

  it.each([
    ["missing material", { material: undefined }],
    ["missing placement", { placement: undefined }],
    ["array properties", { properties: [] }],
    ["boolean property", { properties: { Enabled: true } }],
    ["negative level", { level: -1 }],
    ["level above u32", { level: 0x1_0000_0000 }],
    ["incomplete placement", { placement: { x: 0 } }],
    ["non-finite placement", {
      placement: { x: Number.NaN, y: 0, z: 0, q0: 0, q1: 0, q2: 0, q3: 1 },
    }],
  ])("rejects %s", (_label, objectPatch) => {
    const document = structuredClone(fixture) as {
      objects: Array<Record<string, unknown>>;
    };
    Object.assign(document.objects[0], objectPatch);
    expect(pnwIsLegacyFcstdDocument(document)).toBe(false);
  });
});
