import type {
  PnwRunAction,
  PnwRunLogicalTarget,
  PnwRunPlatform,
  PnwRunProject,
  PnwRunProjectEvidence,
  PnwRunProjectKind,
  PnwRunTarget,
} from "./types.js";

export interface PnwRunProjectClassification {
  readonly kinds: readonly PnwRunProjectKind[];
  readonly evidence: readonly PnwRunProjectEvidence[];
}

export interface PnwBuiltInRunTargetOptions {
  readonly clangFormatFile?: string;
}

export function pnwClassifyRunProject(relativePaths: readonly string[]): PnwRunProjectClassification {
  const evidence: PnwRunProjectEvidence[] = [];
  for (const rawPath of relativePaths) {
    const value = rawPath.replaceAll("\\", "/");
    const name = value.split("/").at(-1) ?? value;
    if (name === "CMakeLists.txt") evidence.push({ path: value, kind: "cmake-cpp", weight: 6, reason: "cmake-lists" });
    if (name === "CMakePresets.json") evidence.push({ path: value, kind: "cmake-cpp", weight: 5, reason: "cmake-presets" });
    if (/\.(?:sln|vcxproj)$/iu.test(name)) evidence.push({ path: value, kind: "cmake-cpp", weight: 2, reason: "msvc-project" });
    if (name === "IdentityCard") evidence.push({ path: value, kind: "caa", weight: 6, reason: "identity-card" });
    if (name === "Imakefile.mk") evidence.push({ path: value, kind: "caa", weight: 6, reason: "imakefile" });
    if (name === "CNext") evidence.push({ path: value, kind: "caa", weight: 3, reason: "cnext" });
    if (value.split("/").some((segment) => segment.endsWith(".m"))) {
      evidence.push({ path: value, kind: "caa", weight: 3, reason: "caa-module" });
    }
  }
  const score = (kind: Exclude<PnwRunProjectKind, "generic">) => evidence
    .filter((item) => item.kind === kind)
    .reduce((sum, item) => sum + item.weight, 0);
  const kinds: PnwRunProjectKind[] = [];
  if (score("caa") >= 6) kinds.push("caa");
  if (score("cmake-cpp") >= 5) kinds.push("cmake-cpp");
  if (kinds.length === 0) kinds.push("generic");
  return { kinds, evidence };
}

export function pnwEnsureBuiltInRunTargets(
  project: PnwRunProject,
  targets: readonly PnwRunTarget[],
  options: PnwBuiltInRunTargetOptions = {},
): PnwRunTarget[] {
  const result = [...targets];
  if (project.kinds.includes("caa")) {
    ensureAction(result, project, "caa-build", "MK", ["win32"], ["$pnwCaaMsCompile"]);
    ensureAction(result, project, "caa-run", "Run", ["win32"], []);
  }
  if (project.kinds.includes("cmake-cpp")) {
    ensureCmakeAction(result, project, "cmake-configure", "CMake Configure", ["-S", ".", "-B", "build"]);
    ensureCmakeAction(result, project, "cmake-build", "CMake Build", ["--build", "build"]);
    ensureCmakeAction(result, project, "cmake-test", "CMake Test", ["--build", "build", "--target", "test"]);
    ensureCmakeAction(result, project, "cmake-clean", "CMake Clean", ["--build", "build", "--target", "clean"]);
  }
  if (options.clangFormatFile) ensureClangFormatAction(result, project, options.clangFormatFile);
  return result;
}

export function pnwGroupRunTargets(targets: readonly PnwRunTarget[]): PnwRunLogicalTarget[] {
  const groups = new Map<string, PnwRunTarget[]>();
  for (const target of targets) {
    const key = `${target.projectId}\0${target.action}`;
    const values = groups.get(key) ?? [];
    values.push(target);
    groups.set(key, values);
  }
  return [...groups.values()].map((values) => {
    const ordered = [...values].sort((left, right) => right.priority - left.priority || left.label.localeCompare(right.label));
    return {
      projectId: ordered[0]!.projectId,
      action: ordered[0]!.action,
      recommended: ordered[0]!,
      alternatives: ordered.slice(1),
    };
  });
}

export function pnwFilterRunTargetsByPlatform(
  targets: readonly PnwRunTarget[],
  currentPlatform: PnwRunPlatform,
  currentOnly: boolean,
): PnwRunTarget[] {
  if (!currentOnly) return [...targets];
  return targets.filter((target) => target.platforms.includes(currentPlatform));
}

function ensureAction(
  result: PnwRunTarget[],
  project: PnwRunProject,
  action: PnwRunAction,
  label: string,
  platforms: readonly PnwRunPlatform[],
  problemMatchers: readonly string[],
): void {
  if (result.some((target) => target.projectId === project.id && target.action === action && target.sourceKind === "bundled")) return;
  result.push({
    id: `${project.id}:${action}:bundled`,
    projectId: project.id,
    label,
    action,
    sourceKind: "bundled",
    platforms,
    cwd: project.rootUri,
    args: [],
    envKeys: ["CAA_MK_VERSION"],
    problemMatchers,
    matcherFidelity: problemMatchers.length > 0 ? "named" : "none",
    risk: "review",
    priority: 200,
  });
}

function ensureCmakeAction(
  result: PnwRunTarget[],
  project: PnwRunProject,
  action: PnwRunAction,
  label: string,
  args: readonly string[],
): void {
  if (result.some((target) => target.projectId === project.id && target.action === action && target.sourceKind === "bundled")) return;
  result.push({
    id: `${project.id}:${action}:builtin`,
    projectId: project.id,
    label,
    action,
    sourceKind: "bundled",
    platforms: ["win32", "darwin", "linux"],
    cwd: project.rootUri,
    program: "cmake",
    args,
    envKeys: [],
    problemMatchers: ["$pnwCmake"],
    matcherFidelity: "named",
    risk: "normal",
    priority: 200,
  });
}

function ensureClangFormatAction(
  result: PnwRunTarget[],
  project: PnwRunProject,
  clangFormatFile: string,
): void {
  if (result.some((target) => target.projectId === project.id
    && target.action === "clang-format"
    && target.sourceKind === "bundled")) return;
  result.push({
    id: `${project.id}:clang-format:bundled`,
    projectId: project.id,
    label: "Clang Format",
    action: "clang-format",
    sourceKind: "bundled",
    sourceUri: clangFormatFile,
    platforms: ["win32", "darwin", "linux"],
    cwd: project.rootUri,
    args: [],
    envKeys: [],
    problemMatchers: [],
    matcherFidelity: "none",
    risk: "high",
    priority: 200,
  });
}
