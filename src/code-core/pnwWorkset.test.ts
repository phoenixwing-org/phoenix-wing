import { describe, expect, it } from "vitest";
import { pnwParseWorksetDocument } from "./pnwWorkset.js";

describe("pnw workset document", () => {
  it("parses stable, workspace-relative worksets", () => {
    const result = pnwParseWorksetDocument(JSON.stringify({ version: 1, worksets: [{ id: "alarm-ui", label: "Alarm UI", roots: ["KtAlarmClockUI"], include: ["**/*.cpp"], exclude: ["**/build/**"] }] }));
    expect(result).toMatchObject({ valid: true, document: { version: 1 } });
    expect(result.document?.worksets[0]?.id).toBe("alarm-ui");
  });
  it("rejects duplicate IDs and paths outside the workspace", () => {
    const result = pnwParseWorksetDocument(JSON.stringify({ version: 1, worksets: [
      { id: "same", label: "one", roots: ["../outside"], include: ["**/*"] },
      { id: "same", label: "two", roots: ["src"], include: ["**/*"] },
    ] }));
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.stringContaining("不能越出工作区"), expect.stringContaining("重复")]));
  });
});
