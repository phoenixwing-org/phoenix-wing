import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser";
import {
  pnwClassifyRunProject,
  pnwEnsureBuiltInRunTargets,
  type PnwRunAction,
  type PnwRunPlatform,
  type PnwRunProject,
  type PnwRunSourceKind,
  type PnwRunTarget,
} from "@phoenix-wing/run-core";

export interface PnwRunDiscoveryOptions {
  readonly platform: PnwRunPlatform;
  readonly maxFiles?: number;
  readonly maxTaskFiles?: number;
  readonly excludeDirectoryNames?: readonly string[];
}

export interface PnwRunDiscoveryDiagnostic {
  readonly code: string;
  readonly path?: string;
  readonly message: string;
}

export interface PnwRunDiscoveryResult {
  readonly workspaceRoot: string;
  readonly projects: readonly PnwRunProject[];
  readonly targets: readonly PnwRunTarget[];
  readonly diagnostics: readonly PnwRunDiscoveryDiagnostic[];
  readonly incomplete: boolean;
  readonly scannedFiles: number;
}

const DEFAULT_EXCLUDES = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  ".idea",
  ".vs",
]);
const SCRIPT_EXTENSIONS = new Set([".ps1", ".bat", ".cmd", ".sh", ".exe", ".com"]);

export async function pnwDiscoverRunWorkspace(
  workspaceRoot: string,
  options: PnwRunDiscoveryOptions,
): Promise<PnwRunDiscoveryResult> {
  const root = path.resolve(workspaceRoot);
  const maxFiles = options.maxFiles ?? 20_000;
  const maxTaskFiles = options.maxTaskFiles ?? 100;
  const excludeNames = new Set([...DEFAULT_EXCLUDES, ...(options.excludeDirectoryNames ?? [])]);
  const files: string[] = [];
  const directories: string[] = [root];
  const diagnostics: PnwRunDiscoveryDiagnostic[] = [];
  let incomplete = false;
  let taskFileCount = 0;

  const walk = async (directory: string): Promise<void> => {
    if (incomplete) return;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      diagnostics.push({ code: "directory-read-failed", path: directory, message: messageOf(error) });
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = slash(path.relative(root, absolute));
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (excludeNames.has(entry.name) || relative === ".phoenix/cache" || relative === ".phoenix/native-build") continue;
        directories.push(absolute);
        await walk(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
        if (isTasksFile(absolute)) taskFileCount += 1;
        if (files.length >= maxFiles || taskFileCount > maxTaskFiles) {
          incomplete = true;
          diagnostics.push({
            code: "scan-limit",
            path: root,
            message: `Run discovery stopped at ${files.length} files and ${taskFileCount} task files`,
          });
          return;
        }
      }
    }
  };
  await walk(root);

  const projectRoots = discoverProjectRoots(root, files, directories);
  const effectiveProjectRoots = projectRoots.length > 0 ? projectRoots : [root];
  const projects = effectiveProjectRoots.map((projectRoot) => createProject(
    root,
    projectRoot,
    effectiveProjectRoots,
    files,
    directories,
  ));
  const targets: PnwRunTarget[] = [];

  for (const taskFile of files.filter(isTasksFile)) {
    const taskProjectRoot = taskRoot(taskFile);
    const project = nearestProject(projects, taskProjectRoot) ?? projects[0]!;
    const native = path.resolve(taskFile) === path.join(root, ".vscode", "tasks.json");
    const taskTargets = await readTaskTargets(taskFile, project, native, diagnostics);
    targets.push(...taskTargets.map((target) => {
      const commandPath = target.program ? taskProgramPath(target.program, project.rootUri, target.cwd) : undefined;
      const owner = (commandPath ? nearestProject(projects, commandPath) : undefined)
        ?? nearestProject(projects, target.cwd)
        ?? project;
      const action = !owner.kinds.includes("caa") && (target.action === "caa-build" || target.action === "caa-run")
        ? "task"
        : target.action;
      return owner.id === target.projectId && action === target.action
        ? target
        : { ...target, projectId: owner.id, action };
    }));
  }
  for (const file of files) {
    const target = await scriptTarget(file, nearestProject(projects, file) ?? projects[0]!, options.platform);
    if (target) targets.push(target);
  }
  const completeTargets = projects.flatMap((project) => pnwEnsureBuiltInRunTargets(
    project,
    targets.filter((target) => target.projectId === project.id),
    {
      clangFormatFile: files.find((file) => path.dirname(file) === project.rootUri
        && path.basename(file) === ".clang-format"),
    },
  ));
  return { workspaceRoot: root, projects, targets: completeTargets, diagnostics, incomplete, scannedFiles: files.length };
}

function discoverProjectRoots(root: string, files: readonly string[], directories: readonly string[]): string[] {
  const cmakeRoots = new Set<string>();
  const caaRoots = new Set<string>();
  const fileSet = new Set(files.map((file) => path.resolve(file)));
  for (const file of files) {
    const name = path.basename(file);
    if (name === "CMakeLists.txt" || name === "CMakePresets.json") cmakeRoots.add(path.dirname(file));
    if (name === "IdentityCard") caaRoots.add(findCaaProjectRoot(root, path.dirname(file), fileSet));
  }
  for (const directory of directories) {
    if (path.basename(directory) === "IdentityCard") caaRoots.add(findCaaProjectRoot(root, path.dirname(directory), fileSet));
  }
  const roots = new Set([
    ...pruneNestedCmakeRoots(cmakeRoots, files),
    ...pruneNestedRoots(caaRoots),
  ]);
  if (roots.size === 0 && files.some((file) => isTasksFile(file)
    || path.basename(file) === ".clang-format"
    || SCRIPT_EXTENSIONS.has(path.extname(file).toLowerCase()))) {
    roots.add(root);
  }
  return [...roots].sort((left, right) => left.localeCompare(right));
}

function findCaaProjectRoot(root: string, start: string, files: ReadonlySet<string>): string {
  let current = path.resolve(start);
  const workspaceRoot = path.resolve(root);
  while (isInside(workspaceRoot, current)) {
    const name = path.basename(current);
    if (/(?:Wsp|Workspace)$/iu.test(name)
      || files.has(path.join(current, "mk.ps1"))
      || files.has(path.join(current, "mk.bat"))
      || files.has(path.join(current, "run.ps1"))
      || files.has(path.join(current, ".vscode", "tasks.json"))) return current;
    if (current === workspaceRoot) break;
    current = path.dirname(current);
  }
  return path.resolve(start);
}

function pruneNestedCmakeRoots(values: ReadonlySet<string>, files: readonly string[]): string[] {
  const ordered = [...values].sort((left, right) => left.length - right.length || left.localeCompare(right));
  const roots: string[] = [];
  for (const candidate of ordered) {
    const ancestor = roots.find((root) => root !== candidate && isInside(root, candidate));
    if (!ancestor || hasDirectExecutionMarker(candidate, files)) roots.push(candidate);
  }
  return roots;
}

function hasDirectExecutionMarker(directory: string, files: readonly string[]): boolean {
  return files.some((file) => path.dirname(file) === directory && (
    path.basename(file) === "CMakePresets.json"
    || isTasksFile(file)
    || SCRIPT_EXTENSIONS.has(path.extname(file).toLowerCase())
  ));
}

function pruneNestedRoots(values: ReadonlySet<string>): string[] {
  const ordered = [...values].sort((left, right) => left.length - right.length || left.localeCompare(right));
  const roots: string[] = [];
  for (const candidate of ordered) {
    if (!roots.some((root) => root !== candidate && isInside(root, candidate))) roots.push(candidate);
  }
  return roots;
}

function createProject(
  workspaceRoot: string,
  projectRoot: string,
  projectRoots: readonly string[],
  files: readonly string[],
  directories: readonly string[],
): PnwRunProject {
  const nestedRoots = projectRoots.filter((candidate) => candidate !== projectRoot && isInside(projectRoot, candidate));
  const belongsToProject = (entry: string) => isInside(projectRoot, entry)
    && !nestedRoots.some((nested) => isInside(nested, entry));
  const entries = [
    ...files.filter(belongsToProject),
    ...directories.filter(belongsToProject),
  ].map((entry) => slash(path.relative(projectRoot, entry)));
  const classification = pnwClassifyRunProject(entries);
  const relativePath = slash(path.relative(workspaceRoot, projectRoot)) || ".";
  return {
    id: `project:${relativePath}`,
    workspaceFolderUri: pathToFileURL(workspaceRoot).href,
    rootUri: projectRoot,
    relativePath,
    label: relativePath === "." ? path.basename(workspaceRoot) : path.basename(projectRoot),
    kinds: classification.kinds,
    evidence: classification.evidence,
  };
}

async function readTaskTargets(
  file: string,
  project: PnwRunProject,
  native: boolean,
  diagnostics: PnwRunDiscoveryDiagnostic[],
): Promise<PnwRunTarget[]> {
  const errors: ParseError[] = [];
  const document = parse(await readFile(file, "utf8"), errors, { allowTrailingComma: true, disallowComments: false }) as {
    tasks?: unknown[];
  } | undefined;
  if (errors.length > 0 || !document || !Array.isArray(document.tasks)) {
    diagnostics.push({
      code: "tasks-json-invalid",
      path: file,
      message: errors.map((error) => printParseErrorCode(error.error)).join(", ") || "tasks must be an array",
    });
    return [];
  }
  return document.tasks.flatMap((value, index) => {
    if (!isRecord(value)) return [];
    const label = stringValue(value.label) ?? stringValue(value.taskName) ?? `Task ${index + 1}`;
    const command = stringValue(value.command);
    const args = Array.isArray(value.args) ? value.args.filter((item): item is string => typeof item === "string") : [];
    const matcher = parseProblemMatchers(value.problemMatcher);
    const sourceKind: PnwRunSourceKind = native ? "native-task" : "imported-task";
    const action = actionFromLabel(label, command);
    const cwd = taskCwd(value, project.rootUri);
    const platforms = action === "caa-build" || action === "caa-run"
      ? ["win32"] as const
      : inferPlatforms(command ?? label);
    const type = stringValue(value.type);
    const supportedImported = native || type === undefined || type === "shell" || type === "process";
    return [{
      id: `${project.id}:task:${slash(path.relative(project.rootUri, file))}:${index}`,
      projectId: project.id,
      label,
      action,
      sourceKind,
      sourceUri: file,
      platforms,
      cwd,
      ...(command ? { program: command } : {}),
      args,
      envKeys: [],
      problemMatchers: matcher.names,
      matcherFidelity: native ? "native" : matcher.fidelity,
      risk: "normal",
      priority: native ? 400 : 350,
      ...(!supportedImported || (!native && !command)
        ? { disabledReason: "nested-task-requires-native-provider" }
        : {}),
    } satisfies PnwRunTarget];
  });
}

async function scriptTarget(
  file: string,
  project: PnwRunProject,
  platform: PnwRunPlatform,
): Promise<PnwRunTarget | undefined> {
  const extension = path.extname(file).toLowerCase();
  let executableWithoutExtension = false;
  if (!SCRIPT_EXTENSIONS.has(extension) && extension === "" && platform !== "win32") {
    try {
      executableWithoutExtension = ((await lstat(file)).mode & 0o111) !== 0;
    } catch {
      return undefined;
    }
  }
  if (!SCRIPT_EXTENSIONS.has(extension) && !executableWithoutExtension) return undefined;
  const name = path.basename(file);
  const lower = name.toLowerCase();
  const action = project.kinds.includes("caa") && /^(?:mk|mkmk)\.(?:ps1|bat|cmd)$/u.test(lower)
    ? "caa-build"
    : project.kinds.includes("caa") && /^(?:run|cnext)\.(?:ps1|bat|cmd|exe)$/u.test(lower)
      ? "caa-run"
      : extension === ".exe" || extension === ".com" || executableWithoutExtension ? "executable" : "script";
  const platforms = inferPlatforms(file);
  const isCaaBuild = action === "caa-build";
  return {
    id: `${project.id}:file:${slash(path.relative(project.rootUri, file))}`,
    projectId: project.id,
    label: name,
    action,
    sourceKind: action === "executable" ? "executable" : "project-script",
    sourceUri: file,
    platforms,
    cwd: action === "caa-build" || action === "caa-run" ? project.rootUri : path.dirname(file),
    program: file,
    args: [],
    envKeys: isCaaBuild || action === "caa-run" ? ["CAA_MK_VERSION"] : [],
    problemMatchers: isCaaBuild ? ["$pnwCaaMsCompile"] : [],
    matcherFidelity: isCaaBuild ? "named" : "none",
    risk: "review",
    priority: 300,
  };
}

function actionFromLabel(label: string, command?: string): PnwRunAction {
  const value = `${label} ${command ?? ""}`.toLowerCase();
  if (/\b(?:mkmk|mk workspace|mk\.ps1)\b/u.test(value)) return "caa-build";
  if (/\b(?:cnext|run\.ps1)\b/u.test(value)) return "caa-run";
  if (/cmake.*config/u.test(value)) return "cmake-configure";
  if (/cmake.*clean/u.test(value)) return "cmake-clean";
  if (/(?:ctest|cmake.*test)/u.test(value)) return "cmake-test";
  if (/cmake.*build/u.test(value)) return "cmake-build";
  return "task";
}

function parseProblemMatchers(value: unknown): { names: string[]; fidelity: PnwRunTarget["matcherFidelity"] } {
  if (typeof value === "string") return { names: [value], fidelity: "named" };
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return { names: value as string[], fidelity: "named" };
  }
  if (value && (Array.isArray(value) || isRecord(value))) return { names: [], fidelity: "degraded" };
  return { names: [], fidelity: "none" };
}

function taskCwd(task: Record<string, unknown>, projectRoot: string): string {
  const options = isRecord(task.options) ? task.options : undefined;
  const cwd = options ? stringValue(options.cwd) : undefined;
  if (!cwd || cwd === "${workspaceFolder}") return projectRoot;
  if (path.isAbsolute(cwd) || /^[A-Za-z]:[\\/]/u.test(cwd)) return cwd;
  const relative = cwd.replace(/^\$\{workspaceFolder\}[\\/]?/u, "").split(/[\\/]/u).filter(Boolean);
  return path.resolve(projectRoot, ...relative);
}

function taskProgramPath(program: string, workspaceRoot: string, cwd: string): string | undefined {
  const replaced = program.replace(/^\$\{workspaceFolder\}[\\/]?/u, "");
  if (replaced === program && !/[\\/]/u.test(program) && !program.startsWith(".")) return undefined;
  if (path.isAbsolute(replaced) || /^[A-Za-z]:[\\/]/u.test(replaced)) return replaced;
  const segments = replaced.split(/[\\/]/u).filter((segment) => segment && segment !== ".");
  return path.resolve(program.startsWith("${workspaceFolder}") ? workspaceRoot : cwd, ...segments);
}

function inferPlatforms(value: string): PnwRunPlatform[] {
  const lower = value.toLowerCase();
  if (/\.(?:ps1|bat|cmd|exe|com)$/u.test(lower) || /(?:^|[\\/])cmd\.exe$/u.test(lower)) return ["win32"];
  if (/\.sh$/u.test(lower)) return ["darwin", "linux"];
  return ["win32", "darwin", "linux"];
}

function taskRoot(file: string): string {
  const directory = path.dirname(file);
  return path.basename(directory) === ".vscode" ? path.dirname(directory) : directory;
}

function nearestProject(projects: readonly PnwRunProject[], candidate: string): PnwRunProject | undefined {
  return [...projects]
    .filter((project) => isInside(project.rootUri, candidate))
    .sort((left, right) => right.rootUri.length - left.rootUri.length)[0];
}

function isTasksFile(file: string): boolean {
  return path.basename(file).toLowerCase() === "tasks.json";
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function slash(value: string): string {
  return value.split(path.sep).join("/");
}
