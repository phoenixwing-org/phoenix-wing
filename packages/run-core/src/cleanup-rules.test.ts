// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  PNW_DEFAULT_CLEANUP_RULES_YAML,
  pnwCleanupFilenameMatches,
  pnwParseCleanupConfigurationYaml,
  pnwParseCleanupPatternsYaml,
} from "./cleanup-rules.js";

describe("Pnw cleanup YAML", () => {
  it("解析受控的结构化默认规则", () => {
    const rules = pnwParseCleanupConfigurationYaml(PNW_DEFAULT_CLEANUP_RULES_YAML);
    expect(rules).toEqual({
      unlinkDirectories: [],
      directories: ["objects", "build"],
      files: ["*.obj", "*.exp", "*.pdb", "test_*.exe"],
    });
    expect(pnwCleanupFilenameMatches("anything.OBJ", rules.files)).toBe(true);
    expect(pnwCleanupFilenameMatches("test_demo.exe", rules.files)).toBe(true);
    expect(pnwCleanupFilenameMatches("other.lib", rules.files)).toBe(false);
    expect(Object.isFrozen(rules)).toBe(true);
    expect(Object.isFrozen(rules.files)).toBe(true);
  });

  it("支持三类清单、注释、引号和大小写不敏感去重", () => {
    expect(pnwParseCleanupConfigurationYaml([
      "# direct children only",
      "unlinkDirectories:",
      "  - 'Demo*'",
      "delete:",
      "  directories:",
      "    - objects",
      "    - OBJECTS",
      "  files:",
      "    - '*.obj' # object output",
      "    - \"test_*.exe\"",
    ].join("\n"))).toEqual({
      unlinkDirectories: ["Demo*"],
      directories: ["objects"],
      files: ["*.obj", "test_*.exe"],
    });
  });

  it("兼容旧的直属文件规则列表", () => {
    expect(pnwParseCleanupPatternsYaml("# names\n- 'Kt*'\n- kt*\n- \"*.obj\""))
      .toEqual(["Kt*", "*.obj"]);
    expect(pnwParseCleanupConfigurationYaml("PNX*")).toEqual({
      unlinkDirectories: [],
      directories: [],
      files: ["PNX*"],
    });
  });

  it.each([
    "- *",
    "- **/*.obj",
    "- ../Kt*",
    "- path/Kt*",
    "- path\\Kt*",
    "- Kt*\nnot-a-list",
    "delete:\n  directories:\n    - bu*ld",
    "delete:\n  files:\n  - '*.obj'",
    "unknown:\n  - item",
  ])("拒绝不安全或不受支持的规则 %s", (source) => {
    expect(() => pnwParseCleanupConfigurationYaml(source)).toThrow();
  });
});
