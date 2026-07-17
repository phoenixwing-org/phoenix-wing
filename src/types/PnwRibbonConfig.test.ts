import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION,
  pnwCheckRibbonContributionCompatibility,
} from "./PnwRibbonConfig.js";

const fixture = JSON.parse(readFileSync(
  new URL("../../fixtures/ribbon-contribution-v1.json", import.meta.url),
  "utf8",
)) as unknown;

describe("Ribbon contribution contract v1", () => {
  it("accepts the canonical fixture and rejects future or incomplete documents", () => {
    const current = pnwCheckRibbonContributionCompatibility(fixture);
    expect(current.compatible).toBe(true);
    expect(current.compatible && current.document.tabs.map((tab) => tab.id)).toEqual([
      "system",
      "code",
    ]);

    expect(pnwCheckRibbonContributionCompatibility({
      ...(fixture as object),
      schemaVersion: PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION + 1,
    })).toEqual({
      compatible: false,
      code: "contribution.unsupported-schema-version",
      actualSchemaVersion: 2,
      supportedSchemaVersions: [1],
    });
    expect(pnwCheckRibbonContributionCompatibility({
      kind: "phoenix.ribbon-contributions",
      schemaVersion: 1,
      tabs: [{ id: "broken", label: "Broken", groups: [{ id: "empty" }] }],
    })).toEqual({
      compatible: false,
      code: "contribution.invalid-document",
      actualSchemaVersion: 1,
      supportedSchemaVersions: [1],
    });
  });
});
