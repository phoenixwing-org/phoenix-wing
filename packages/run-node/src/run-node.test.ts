import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { pnwDiscoverRunWorkspace } from "./discovery.js";
import { pnwCreateBundledCaaLaunchPlan, pnwCreateBundledClangFormatLaunchPlan } from "./launch-plan.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Run Node discovery", () => {
  it("discovers CMake, nested tasks and fixed CAA MK/Run targets", async () => {
    const root = await fixture();
    const result = await pnwDiscoverRunWorkspace(root, { platform: "darwin" });
    const cmake = result.projects.find((project) => project.label === "KtCore")!;
    const caa = result.projects.find((project) => project.label === "PNXBomAnalysisWsp")!;
    expect(cmake.kinds).toContain("cmake-cpp");
    expect(caa.kinds).toContain("caa");
    const caaTargets = result.targets.filter((target) => target.projectId === caa.id);
    expect(caaTargets.some((target) => target.action === "caa-build" && target.sourceKind === "imported-task")).toBe(true);
    expect(caaTargets.some((target) => target.action === "caa-run" && target.sourceKind === "bundled")).toBe(true);
    expect(result.targets.filter((target) => target.projectId === cmake.id).map((target) => target.action)).toEqual(expect.arrayContaining([
      "cmake-configure",
      "cmake-build",
      "cmake-test",
      "cmake-clean",
    ]));
    expect(result.projects.filter((project) => project.kinds.includes("cmake-cpp"))).toHaveLength(1);
    expect(result.targets.find((target) => target.projectId === cmake.id && target.action === "cmake-configure")?.args)
      .toEqual(["-S", ".", "-B", "build"]);
  });

  it("attaches the CAA matcher to a directly discovered mk.ps1 without tasks.json", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pnw-run-node-"));
    roots.push(root);
    await mkdir(path.join(root, "CAA", "IdentityCard"), { recursive: true });
    await writeFile(path.join(root, "CAA", "mk.ps1"), "Write-Output build\n", "utf8");
    const result = await pnwDiscoverRunWorkspace(root, { platform: "win32" });
    const target = result.targets.find((item) => item.label === "mk.ps1")!;
    expect(target.action).toBe("caa-build");
    expect(target.problemMatchers).toEqual(["$pnwCaaMsCompile"]);
  });

  it("discovers one bundled Clang Format target only for a root .clang-format", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pnw-run-node-"));
    roots.push(root);
    await writeFile(path.join(root, ".clang-format"), "BasedOnStyle: LLVM\n", "utf8");
    await writeFile(path.join(root, "main.cpp"), "int main() { return 0; }\n", "utf8");
    const result = await pnwDiscoverRunWorkspace(root, { platform: "darwin" });
    const target = result.targets.find((item) => item.action === "clang-format");
    expect(result.projects).toHaveLength(1);
    expect(target).toMatchObject({
      label: "Clang Format",
      sourceKind: "bundled",
      sourceUri: path.join(root, ".clang-format"),
      cwd: root,
    });
    const plan = pnwCreateBundledClangFormatLaunchPlan(target!, {
      resourceRoot: "/extension/resources/run",
      runtimeProgram: "/runtime/node",
    });
    expect(plan).toMatchObject({
      program: "/runtime/node",
      cwd: root,
      env: { ELECTRON_RUN_AS_NODE: "1" },
    });
    expect(plan.args).toEqual([
      path.resolve("/extension/resources/run/format/pnw-clang-format-runner.cjs"),
      "--project",
      root,
    ]);
  });

  it("creates a Windows-only bundled CAA launch plan", async () => {
    const root = await fixture();
    const result = await pnwDiscoverRunWorkspace(root, { platform: "win32" });
    const target = result.targets.find((item) => item.action === "caa-run" && item.sourceKind === "bundled")!;
    const plan = pnwCreateBundledCaaLaunchPlan(target, {
      platform: "win32",
      resourceRoot: "C:/extension/resources/run",
      caaVersion: "20",
      relatedProjectRoots: [
        "C:/workspace/PNXOneWsp",
        "c:\\workspace\\PNXOneWsp\\",
        "C:/workspace/PNXTwoWsp",
      ],
    });
    expect(plan.program).toBe("cmd.exe");
    expect(plan.args).toContain("run");
    expect(plan.env.CAA_MK_VERSION).toBe("20");
    expect(plan.args.filter((arg) => arg === "--preq")).toHaveLength(2);
    expect(plan.args).toEqual(expect.arrayContaining(["C:/workspace/PNXOneWsp", "C:/workspace/PNXTwoWsp"]));
  });

  it("rejects shell control characters in bundled CAA paths", async () => {
    const root = await fixture();
    const result = await pnwDiscoverRunWorkspace(root, { platform: "win32" });
    const target = result.targets.find((item) => item.action === "caa-build" && item.sourceKind === "bundled")!;
    expect(() => pnwCreateBundledCaaLaunchPlan(target, {
      platform: "win32",
      resourceRoot: "C:/extension/resources/run",
      caaVersion: "20",
      relatedProjectRoots: ["C:/workspace/PNXOneWsp&echo unsafe"],
    })).toThrow(/Invalid CAA related project path/u);
  });

  it("keeps aggregate CMake, nested CMake and CAA workspace roots without promoting CAA framework folders", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pnw-run-node-"));
    roots.push(root);
    await writeFile(path.join(root, "CMakeLists.txt"), "project(Aggregate)\nadd_subdirectory(KtCore)\n", "utf8");
    await mkdir(path.join(root, "KtCore", "lib"), { recursive: true });
    await writeFile(path.join(root, "KtCore", "CMakeLists.txt"), "project(KtCore)\n", "utf8");
    await writeFile(path.join(root, "KtCore", "buildAll.bat"), "@echo off\n", "utf8");
    await writeFile(path.join(root, "KtCore", "lib", "CMakeLists.txt"), "add_library(lib)\n", "utf8");
    await mkdir(path.join(root, "FeatureWsp", "FeatureFrm", "IdentityCard"), { recursive: true });
    await writeFile(path.join(root, "FeatureWsp", "mk.ps1"), "Write-Output build\n", "utf8");

    const result = await pnwDiscoverRunWorkspace(root, { platform: "darwin" });
    expect(result.projects.map((project) => project.relativePath)).toEqual([".", "FeatureWsp", "KtCore"]);
    expect(result.projects.find((project) => project.relativePath === ".")?.kinds).toEqual(["cmake-cpp"]);
    expect(result.projects.find((project) => project.relativePath === "FeatureWsp")?.kinds).toEqual(["caa"]);
  });
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "pnw-run-node-"));
  roots.push(root);
  await mkdir(path.join(root, "KtCore"), { recursive: true });
  await writeFile(path.join(root, "KtCore", "CMakeLists.txt"), "project(KtCore)\n", "utf8");
  await mkdir(path.join(root, "KtCore", "src", "library"), { recursive: true });
  await writeFile(path.join(root, "KtCore", "src", "library", "CMakeLists.txt"), "add_library(KtCoreLib)\n", "utf8");
  await writeFile(path.join(root, "KtCore", "buildAll.bat"), "@echo off\n", "utf8");
  await mkdir(path.join(root, "PNXBomAnalysisWsp", "IdentityCard"), { recursive: true });
  await mkdir(path.join(root, "PNXBomAnalysisWsp", ".vscode"), { recursive: true });
  await writeFile(path.join(root, "PNXBomAnalysisWsp", ".vscode", "tasks.json"), `{
    // Nested CAA build task
    "version": "2.0.0",
    "tasks": [{
      "label": "mkmk workspace",
      "type": "shell",
      "command": "./mk.ps1",
      "options": { "cwd": "\${workspaceFolder}" },
      "problemMatcher": "$msCompile",
    }],
  }`, "utf8");
  return root;
}
