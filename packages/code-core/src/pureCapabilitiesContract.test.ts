import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  pnwFindUuidOccurrences,
  pnwFormatUuidForTemplate,
} from "./pnwUuid.js";
import {
  pnwMatchesWorkspacePath,
  pnwNormalizeWorkspacePath,
  pnwRelativeToWorkspaceRoots,
  type PnwWorkspacePathEntry,
} from "./pnwWorkspacePath.js";

type Fixture = {
  schemaVersion: 1;
  uuid: {
    scan: { text: string; expected: unknown[] };
    formatCases: Array<{ source: string; replacement: string; expected: string }>;
  };
  workspacePath: {
    normalizeCases: Array<{ input: string; expected: string | null }>;
    matchCases: Array<{
      candidate: string;
      entries: PnwWorkspacePathEntry[];
      expected: boolean;
    }>;
    relativeCases: Array<{ candidate: string; roots: string[]; expected?: string }>;
  };
};

const fixture = JSON.parse(readFileSync(
  new URL("./fixtures/pure-capabilities-v1.json", import.meta.url),
  "utf8",
)) as Fixture;

describe("pure capabilities v1 cross-host contract", () => {
  it("freezes UUID scan and format semantics", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(pnwFindUuidOccurrences(fixture.uuid.scan.text)).toEqual(fixture.uuid.scan.expected);
    for (const item of fixture.uuid.formatCases) {
      expect(pnwFormatUuidForTemplate(item.source, item.replacement)).toBe(item.expected);
    }
  });

  it("freezes workspace path normalization, matching and root-relative semantics", () => {
    for (const item of fixture.workspacePath.normalizeCases) {
      expect(pnwNormalizeWorkspacePath(item.input)).toBe(item.expected);
    }
    for (const item of fixture.workspacePath.matchCases) {
      expect(pnwMatchesWorkspacePath(item.candidate, item.entries)).toBe(item.expected);
    }
    for (const item of fixture.workspacePath.relativeCases) {
      expect(pnwRelativeToWorkspaceRoots(item.candidate, item.roots)).toBe(item.expected);
    }
  });
});
