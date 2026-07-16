// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  ktCodegenConvertLegacyCsvToV4Json,
  ktCodegenParseCsvMatrix,
  KT_CODEGEN_LEGACY_V4_JSON_HEADERS,
} from "../src/legacy/index.js";
import { ktCodegenReadFixture } from "./helpers.js";

describe("legacy adapters", () => {
  it("keeps all 17 canonical JSON columns", () => {
    expect(KT_CODEGEN_LEGACY_V4_JSON_HEADERS).toHaveLength(17);
    expect(KT_CODEGEN_LEGACY_V4_JSON_HEADERS[11]).toBe("ComponentCount");
  });

  it("supports RFC 4180 quoted commas in addition to the old simple CSV", () => {
    const parsed = ktCodegenParseCsvMatrix('A,B\r\n"one,two","line""quote"\r\n');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows).toEqual([
      ["A", "B"],
      ["one,two", 'line"quote'],
    ]);
  });

  it("converts old CSV to the existing C++ v4 JSON shape", () => {
    const converted = ktCodegenConvertLegacyCsvToV4Json(ktCodegenReadFixture("legacy-csv/basic.csv"));
    const output = JSON.parse(converted.value ?? "{}") as {
      type?: string;
      version?: string;
      headers?: string[];
      data?: unknown[][];
    };

    expect(converted.ok).toBe(true);
    expect(output.type).toBe("100106");
    expect(output.version).toBe("4.0");
    expect(output.headers).toHaveLength(17);
    expect(output.data).toHaveLength(2);
  });
});
