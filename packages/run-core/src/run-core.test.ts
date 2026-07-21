import { describe, expect, it } from "vitest";
import { pnwResolveRunCaaVersion } from "./caa-version.js";
import {
  pnwClassifyRunProject,
  pnwEnsureBuiltInRunTargets,
  pnwFilterRunTargetsByPlatform,
  pnwGroupRunTargets,
} from "./project.js";
import type { PnwRunProject, PnwRunTarget } from "./types.js";

const caaProject: PnwRunProject = {
  id: "caa",
  workspaceFolderUri: "/repo",
  rootUri: "/repo/PNXBomAnalysisWsp",
  relativePath: "PNXBomAnalysisWsp",
  label: "PNXBomAnalysisWsp",
  kinds: ["caa"],
  evidence: [],
};

describe("Run Core", () => {
  it("separates CMake and CAA evidence", () => {
    expect(pnwClassifyRunProject(["CMakeLists.txt", "src/main.cpp"]).kinds).toEqual(["cmake-cpp"]);
    expect(pnwClassifyRunProject(["IdentityCard", "PublicInterfaces/Imakefile.mk"]).kinds).toEqual(["caa"]);
  });

  it("always exposes MK and Run for a reliably identified CAA project", () => {
    const targets = pnwEnsureBuiltInRunTargets(caaProject, []);
    expect(targets.map((target) => target.action)).toEqual(["caa-build", "caa-run"]);
    expect(pnwFilterRunTargetsByPlatform(targets, "darwin", true)).toEqual([]);
    expect(pnwFilterRunTargetsByPlatform(targets, "darwin", false)).toHaveLength(2);
  });

  it("exposes one bundled Clang Format target only when a project has .clang-format", () => {
    const withoutMarker = pnwEnsureBuiltInRunTargets(caaProject, []);
    const withMarker = pnwEnsureBuiltInRunTargets(caaProject, [], {
      clangFormatFile: "/repo/PNXBomAnalysisWsp/.clang-format",
    });
    expect(withoutMarker.some((target) => target.action === "clang-format")).toBe(false);
    expect(withMarker.filter((target) => target.action === "clang-format")).toMatchObject([{
      label: "Clang Format",
      sourceKind: "bundled",
      sourceUri: "/repo/PNXBomAnalysisWsp/.clang-format",
      platforms: ["win32", "darwin", "linux"],
      risk: "high",
    }]);
  });

  it("prefers native tasks over bundled alternatives", () => {
    const bundled = pnwEnsureBuiltInRunTargets(caaProject, [])[0]!;
    const native: PnwRunTarget = {
      ...bundled,
      id: "native",
      sourceKind: "native-task",
      priority: 400,
      matcherFidelity: "native",
    };
    expect(pnwGroupRunTargets([bundled, native])[0]!.recommended.id).toBe("native");
  });

  it("resolves explicit CAA version before target and environment", () => {
    expect(pnwResolveRunCaaVersion({ explicit: "B20", target: "19", environment: "18" })).toEqual({
      value: "20",
      source: "explicit",
    });
  });
});
