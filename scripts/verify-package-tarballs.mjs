import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const releaseMatrix = JSON.parse(fs.readFileSync(path.join(root, "release-matrix.json"), "utf8"));
const matrixVersionByPackage = new Map(
  releaseMatrix.packages.map(({ name, version }) => [name, version]),
);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phoenix-wing-package-tarballs-"));
const packRoot = path.join(tempRoot, "packs");
const consumerRoot = path.join(tempRoot, "consumer");
const packageNames = [
  "code-core",
  "git-core",
  "git-node",
  "run-core",
  "run-node",
  "kt-codegen",
  "cad-contracts",
  "cad-core",
  "db-node",
  "workspace-schema",
];
const requiredPackageFiles = {
  "code-core": [
    "src/fixtures/annotation_sep.cpp",
    "src/fixtures/pure-capabilities-v1.json",
  ],
  "kt-codegen": [
    "tests/fixtures/contracts/apply-projection-v1.json",
    "tests/fixtures/contracts/codegen-host-contract-v1.json",
  ],
  "cad-contracts": ["fixtures/query-contract-v1.json"],
  "workspace-schema": [
    "fixtures/workspace-schema-v13.json",
    "fixtures/workspace-schema-compatibility-v1.json",
  ],
};
const purePackageForbiddenDependencies = new Set([
  "vue",
  "pinia",
  "element-plus",
  "node-sqlite3-wasm",
]);

try {
  fs.mkdirSync(packRoot, { recursive: true });
  fs.mkdirSync(consumerRoot, { recursive: true });

  const aggregateTarball = packAggregatePackage();
  verifyAggregateManifest(aggregateTarball);
  const tarballs = packageNames.map(packPackage);
  for (const item of tarballs) verifyPackedManifest(item);
  const installTarballs = [aggregateTarball.tarball, ...tarballs.map((item) => item.tarball)];
  if (process.env.PNW_VERIFY_OFFLINE === "1") {
    installTarballs.push(packOfflineDependency("node-sqlite3-wasm"));
  }

  fs.writeFileSync(
    path.join(consumerRoot, "package.json"),
    `${JSON.stringify({ name: "phoenix-wing-tarball-consumer", private: true, type: "module" }, null, 2)}\n`,
  );
  const installArgs = [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...(process.env.PNW_VERIFY_OFFLINE === "1" ? ["--offline"] : []),
    "vue@3.5.13",
    "pinia@3.0.4",
    ...installTarballs,
  ];
  run(npmCommand(), installArgs, { cwd: consumerRoot });

  const smokeFile = path.join(consumerRoot, "smoke.mjs");
  fs.writeFileSync(smokeFile, `
import path from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  pnwMatchesWorkspacePath,
  pnwNormalizeUuid,
} from "@phoenix-wing/code-core";
import {
  pnwProjectNavigationTreeRows,
} from "@phoenix-wing/code-core/ui/model";
import { KtCodegenParam, ktCodegenCheckPlanCompatibility } from "@phoenix-wing/kt-codegen";
import { KT_CODEGEN_LEGACY_17_COLUMN_CSV_HEADERS } from "@phoenix-wing/kt-codegen/legacy";
import { ktCodegenValidateParam } from "@phoenix-wing/kt-codegen/model";
import { pnwNormalizeCadRelativePath } from "@phoenix-wing/cad-core";
import { PNW_CAD_NATIVE_PROTOCOL } from "@phoenix-wing/cad-contracts";
import {
  PNW_WORKSPACE_SCHEMA_ID,
  PNW_WORKSPACE_SCHEMA_VERSION,
  PNW_WORKSPACE_SCHEMA_V13_DDL,
} from "@phoenix-wing/workspace-schema";
import { pnwCreateDb } from "@phoenix-wing/db-node";
import {
  PNW_GIT_LAZY_HISTORY_DEFAULT_EXPANDED,
  pnwApplyGitLazyHistoryPage,
  pnwCreateGitLazyHistoryState,
  pnwFormatGitGroupSummary,
  pnwProjectGitCommitGraphRows,
  pnwRequestGitLazyHistoryPage,
  pnwSetGitLazyHistoryExpanded,
  pnwShortestUniqueGitOid,
} from "@phoenix-wing/git-core";
import { pnwReadGitCommitGraphPage, pnwRunGitCommand } from "@phoenix-wing/git-node";
import { pnwResolveRunCaaVersion } from "@phoenix-wing/run-core";
import { pnwCreateBundledCaaLaunchPlan } from "@phoenix-wing/run-node";

if (pnwNormalizeUuid("{550E8400-E29B-41D4-A716-446655440000}") !== "550e8400e29b41d4a716446655440000") {
  throw new Error("code-core export smoke failed");
}
const pureCapabilitiesFixture = JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(
  "@phoenix-wing/code-core/fixtures/pure-capabilities-v1.json",
)), "utf8"));
if (
  pureCapabilitiesFixture.schemaVersion !== 1
  || !pnwMatchesWorkspacePath("src/module/main.cpp", [{ path: "src/module", type: "dir" }])
) {
  throw new Error("code-core pure-capabilities fixture/path smoke failed");
}
if (pnwProjectNavigationTreeRows({
  expandedNodeIds: ["root"],
  nodes: [{ id: "root", label: "Root", children: [{ id: "child", label: "Child" }] }],
}).map((row) => row.node.id).join(",") !== "root,child") {
  throw new Error("code-core navigation-tree model export smoke failed");
}
if (new KtCodegenParam().kind !== "kt.codegen") {
  throw new Error("kt-codegen export smoke failed");
}
const codegenFixture = JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(
  "@phoenix-wing/kt-codegen/fixtures/codegen-host-contract-v1.json",
)), "utf8"));
if (codegenFixture.schemaVersion !== 1 || ktCodegenCheckPlanCompatibility({
  kind: "kt.codegen.plan",
  schemaVersion: 2,
}).code !== "contract.unsupported-schema-version") {
  throw new Error("kt-codegen contract fixture/version gate smoke failed");
}
if (KT_CODEGEN_LEGACY_17_COLUMN_CSV_HEADERS.length !== 17 || typeof ktCodegenValidateParam !== "function") {
  throw new Error("kt-codegen subpath export smoke failed");
}
if (pnwNormalizeCadRelativePath("a\\\\b.FCStd") !== "a/b.FCStd") {
  throw new Error("cad-core export smoke failed");
}
if (PNW_CAD_NATIVE_PROTOCOL !== "phoenix-cad-native") {
  throw new Error("cad-contracts export smoke failed");
}
if (PNW_WORKSPACE_SCHEMA_ID !== "phoenix-workspace" || PNW_WORKSPACE_SCHEMA_VERSION !== 13) {
  throw new Error("workspace-schema export smoke failed");
}
if (pnwShortestUniqueGitOid("4b4622df00") !== "4b4622d") {
  throw new Error("git-core export smoke failed");
}
const summaryHeadOid = "b245527fa4941655222c420df565cb59d70c5d83";
const summaryBody = [
  "- 统一根工作区、兼容包、manifest 与 descriptor 版本",
  "- 固定 0.7.0 的包名和部署示例",
].join("\\n");
const latestCommit = {
  oid: summaryHeadOid,
  author: { name: "Phoenix Wing", email: "wing@example.com", date: "1785919551 +0800" },
  committer: { name: "Phoenix Wing", email: "wing@example.com", date: "1785919551 +0800" },
  subject: "版本：升级 Open Issue 插件至 0.7.0",
  body: summaryBody,
};
const groupSummary = pnwFormatGitGroupSummary({
  repositoryName: "phoenix-open-issue",
  upstream: "origin/develop",
  commit: latestCommit,
  fallbackReviewer: "杨海华",
});
if (!groupSummary.text.includes(latestCommit.subject + " 审查：@杨海华\\n\\n" + summaryBody)
  || groupSummary.text.split(summaryBody).length !== 2) {
  throw new Error("git-core complete commit body smoke failed");
}
const lazyInitial = pnwCreateGitLazyHistoryState({
  expectedHeadOid: summaryHeadOid,
  latestCommit,
});
if (PNW_GIT_LAZY_HISTORY_DEFAULT_EXPANDED !== false
  || pnwRequestGitLazyHistoryPage(lazyInitial, 5).request !== undefined) {
  throw new Error("git-core collapsed lazy history performed work");
}
const lazyExpanded = pnwSetGitLazyHistoryExpanded(lazyInitial, true);
if (lazyExpanded.request?.beforeOid !== summaryHeadOid || lazyExpanded.request.limit !== 1
  || pnwSetGitLazyHistoryExpanded(lazyExpanded.state, true).request !== undefined) {
  throw new Error("git-core first lazy history expansion smoke failed");
}
const secondOid = "a".repeat(40);
const lazyAfterPage = pnwApplyGitLazyHistoryPage(lazyExpanded.state, {
  headOid: summaryHeadOid,
  commits: [{ ...latestCommit, oid: secondOid, subject: "上一条", body: "" }],
  nextBeforeOid: secondOid,
  hasMore: true,
});
const lazyCollapsed = pnwSetGitLazyHistoryExpanded(lazyAfterPage, false).state;
const lazyReopened = pnwSetGitLazyHistoryExpanded(lazyCollapsed, true);
if (lazyReopened.request?.beforeOid !== secondOid || lazyReopened.request.limit !== 1) {
  throw new Error("git-core repeated lazy history expansion smoke failed");
}
const gitVersion = await pnwRunGitCommand(["--version"], { cwd: process.cwd() });
if (!gitVersion.stdout.startsWith("git version")) throw new Error("git-node runtime smoke failed");
const graphRepository = path.join(process.cwd(), "graph-smoke");
mkdirSync(graphRepository);
await pnwRunGitCommand(["init", "-b", "main"], { cwd: graphRepository });
await pnwRunGitCommand(["config", "user.name", "Phoenix Wing"], { cwd: graphRepository });
await pnwRunGitCommand(["config", "user.email", "wing@example.com"], { cwd: graphRepository });
writeFileSync(path.join(graphRepository, "README.md"), "graph smoke\\n", "utf8");
await pnwRunGitCommand(["add", "README.md"], { cwd: graphRepository });
await pnwRunGitCommand(["commit", "-m", "Graph smoke"], { cwd: graphRepository });
const graphPage = await pnwReadGitCommitGraphPage(graphRepository, { limit: 5 });
if (graphPage.commits.length !== 1 || graphPage.graphRows[0]?.commitOid !== graphPage.commits[0]?.oid
  || typeof pnwProjectGitCommitGraphRows !== "function") {
  throw new Error("git commit graph exports/read smoke failed");
}
if (pnwResolveRunCaaVersion({ explicit: "B20" }).value !== "20") {
  throw new Error("run-core export smoke failed");
}
const runPlan = pnwCreateBundledCaaLaunchPlan({
  id: "smoke", projectId: "smoke", label: "Run", action: "caa-run", sourceKind: "bundled",
  platforms: ["win32"], cwd: process.cwd(), args: [], envKeys: ["CAA_MK_VERSION"],
  problemMatchers: [], matcherFidelity: "none", risk: "review", priority: 200,
}, { platform: "win32", resourceRoot: process.cwd(), caaVersion: "20" });
if (runPlan.program !== "cmd.exe") throw new Error("run-node export smoke failed");
const databasePath = path.join(process.cwd(), "consumer.sqlite");
const db = pnwCreateDb(databasePath);
try {
  db.exec(PNW_WORKSPACE_SCHEMA_V13_DDL);
  db.run("INSERT INTO phoenix_meta(key, value) VALUES (?, ?)", ["schema_version", "13"]);
  const row = db.get("SELECT value FROM phoenix_meta WHERE key = ?", ["schema_version"]);
  if (row?.value !== "13") throw new Error("db-node runtime smoke failed");
} finally {
  db.close();
}
process.stdout.write("[verify] clean npm consumer imports and SQLite smoke passed\\n");
`);
  run(process.execPath, [smokeFile], { cwd: consumerRoot });
  verifyAggregateUiConsumer();
  process.stdout.write(
    `[verify] ${process.platform}-${process.arch}: 1 aggregate + ${tarballs.length} small Wing package tarballs passed\n`,
  );
} finally {
  if (process.env.PNW_KEEP_VERIFY_DIR === "1") {
    process.stdout.write(`[verify] kept ${tempRoot}\n`);
  } else {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function packPackage(directoryName) {
  const packageRoot = path.join(root, "packages", directoryName);
  const sourceManifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  const expectedVersion = matrixVersionByPackage.get(sourceManifest.name);
  if (!expectedVersion) {
    throw new Error(`${sourceManifest.name} is missing a per-package release matrix version`);
  }
  const result = run(
    pnpmCommand(),
    ["pack", "--json", "--pack-destination", packRoot],
    { cwd: packageRoot, capture: true },
  );
  const marker = result.stdout.lastIndexOf("\n{");
  const parsed = JSON.parse(marker >= 0 ? result.stdout.slice(marker + 1) : result.stdout.slice(result.stdout.indexOf("{")));
  const info = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!info || typeof info.filename !== "string") {
    throw new Error(`pnpm pack returned no filename for ${directoryName}`);
  }
  return {
    directoryName,
    tarball: path.isAbsolute(info.filename) ? info.filename : path.join(packRoot, info.filename),
    expectedName: sourceManifest.name,
    expectedVersion,
  };
}

function packAggregatePackage() {
  const result = run(
    pnpmCommand(),
    ["pack", "--json", "--pack-destination", packRoot],
    { cwd: root, capture: true },
  );
  const marker = result.stdout.lastIndexOf("\n{");
  const info = JSON.parse(marker >= 0 ? result.stdout.slice(marker + 1) : result.stdout.slice(result.stdout.indexOf("{")));
  if (!info || typeof info.filename !== "string") {
    throw new Error("pnpm pack returned no filename for phoenix-wing aggregate");
  }
  return {
    directoryName: "aggregate",
    tarball: info.filename,
  };
}

function packOfflineDependency(packageName) {
  const linkedPath = path.join(root, "packages", "db-node", "node_modules", packageName);
  if (!fs.existsSync(linkedPath)) {
    throw new Error(`offline verification requires installed ${packageName}; run pnpm install first`);
  }
  const packageRoot = fs.realpathSync(linkedPath);
  const result = run(
    npmCommand(),
    ["pack", "--json", "--pack-destination", packRoot],
    { cwd: packageRoot, capture: true },
  );
  const info = parsePackJson(result.stdout)?.[0];
  if (!info || typeof info.filename !== "string") {
    throw new Error(`npm pack returned no filename for offline dependency ${packageName}`);
  }
  return path.join(packRoot, info.filename);
}

function parsePackJson(stdout) {
  const marker = stdout.lastIndexOf("\n[");
  const jsonText = marker >= 0 ? stdout.slice(marker + 1) : stdout.slice(stdout.indexOf("["));
  return JSON.parse(jsonText);
}

function verifyPackedManifest(item) {
  const unpackRoot = path.join(tempRoot, "unpacked", item.directoryName);
  fs.mkdirSync(unpackRoot, { recursive: true });
  run("tar", ["-xzf", item.tarball, "-C", unpackRoot]);
  const packageRoot = path.join(unpackRoot, "package");
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  if (manifest.name !== item.expectedName) {
    throw new Error(`${item.directoryName} packed name changed to ${JSON.stringify(manifest.name)}`);
  }
  if (manifest.version !== item.expectedVersion || manifest.private === true) {
    throw new Error(`${manifest.name} packed identity must remain public ${item.expectedVersion}`);
  }
  const serialized = JSON.stringify({
    dependencies: manifest.dependencies,
    optionalDependencies: manifest.optionalDependencies,
    peerDependencies: manifest.peerDependencies,
  });
  if (/(?:workspace:|file:|link:)/u.test(serialized)) {
    throw new Error(`${manifest.name} tarball still contains a local dependency specifier`);
  }
  for (const required of ["README.md", "LICENSE", "NOTICE", "dist/index.js", "dist/index.d.ts"]) {
    const file = path.join(packageRoot, required);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`${manifest.name} tarball is missing ${required}`);
    }
  }
  for (const required of requiredPackageFiles[item.directoryName] ?? []) {
    const file = path.join(packageRoot, required);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`${manifest.name} tarball is missing contract fixture ${required}`);
    }
  }
  if (item.directoryName !== "db-node") {
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.optionalDependencies,
      ...manifest.peerDependencies,
    };
    for (const forbidden of purePackageForbiddenDependencies) {
      if (dependencies[forbidden] !== undefined) {
        throw new Error(`${manifest.name} pure package must not depend on ${forbidden}`);
      }
    }
  }
}

function verifyAggregateManifest(item) {
  const unpackRoot = path.join(tempRoot, "unpacked", item.directoryName);
  fs.mkdirSync(unpackRoot, { recursive: true });
  run("tar", ["-xzf", item.tarball, "-C", unpackRoot]);
  const packageRoot = path.join(unpackRoot, "package");
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  if (manifest.name !== "phoenix-wing" || manifest.version !== releaseVersion) {
    throw new Error(`aggregate tarball identity changed to ${manifest.name}@${manifest.version}`);
  }
  const serialized = JSON.stringify({
    dependencies: manifest.dependencies,
    optionalDependencies: manifest.optionalDependencies,
    peerDependencies: manifest.peerDependencies,
  });
  if (/(?:workspace:|file:|link:)/u.test(serialized)) {
    throw new Error("phoenix-wing aggregate tarball still contains a local dependency specifier");
  }
  for (const dependency of ["@phoenix-wing/code-core", "@phoenix-wing/db-node"]) {
    const expectedVersion = matrixVersionByPackage.get(dependency);
    if (manifest.dependencies?.[dependency] !== expectedVersion) {
      throw new Error(`${dependency} must match matrix version ${expectedVersion}`);
    }
  }
  for (const required of [
    "README.md",
    "LICENSE",
    "assets/phoenix-wing-mark.svg",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/style.css",
    "dist/components/PnwChoiceDialogHost.js",
    "dist/components/PnwChoiceDialogHost.vue.d.ts",
    "dist/components/PnwDockableToolWindow.js",
    "dist/components/PnwDockableToolWindow.vue.d.ts",
    "dist/components/PnwOverlayThemeProvider.js",
    "dist/components/PnwOverlayThemeProvider.vue.d.ts",
    "dist/components/PnwRecentWorkspaceList.js",
    "dist/components/PnwRecentWorkspaceList.vue.d.ts",
    "dist/components/PnwSelect.js",
    "dist/components/PnwSelect.vue.d.ts",
    "dist/components/PnwWorkspaceTypeSelect.js",
    "dist/components/PnwWorkspaceTypeSelect.vue.d.ts",
    "dist/components/PnwFloatingWindowMenu.js",
    "dist/components/PnwFloatingWindowMenu.vue.d.ts",
    "dist/components/PnwViewPresentationPortal.js",
    "dist/components/PnwViewPresentationPortal.vue.d.ts",
    "dist/composables/pnwChoiceDialog.js",
    "dist/composables/usePnwOverlayTheme.js",
    "dist/layout/PnwPrimaryPanel.js",
    "dist/layout/PnwPrimaryPanel.vue.d.ts",
    "dist/layout/PnwDockablePrimarySection.js",
    "dist/layout/PnwDockablePrimarySection.vue.d.ts",
    "dist/layout/PnwPrimarySection.js",
    "dist/layout/PnwPrimarySection.vue.d.ts",
    "dist/layout/PnwWorkspaceWelcome.js",
    "dist/layout/PnwWorkspaceWelcome.vue.d.ts",
    "dist/layout/PnwWorkspaceGate.js",
    "dist/layout/PnwWorkspaceGate.vue.d.ts",
    "dist/layout/PnwWorkbenchHome.js",
    "dist/layout/PnwWorkbenchHome.vue.d.ts",
    "dist/types/PnwDiagnostics.d.ts",
    "dist/types/PnwDockableTool.d.ts",
    "dist/types/PnwSelect.d.ts",
    "dist/types/PnwPresentationFrame.d.ts",
    "dist/types/PnwViewPresentation.d.ts",
    "dist/types/PnwViewDialog.d.ts",
    "dist/types/PnwWorkspace.d.ts",
    "dist/types/PnwWorkbenchWeb.d.ts",
    "dist/types/PnwWorkbenchHome.d.ts",
    "dist/types/PnwRibbonConfig.js",
    "dist/types/PnwRibbonConfig.d.ts",
    "dist/utils/pnwDockableTool.js",
    "dist/utils/pnwDockableTool.d.ts",
    "dist/utils/pnwViewDialog.js",
    "dist/utils/pnwViewDialog.d.ts",
    "dist/utils/pnwPresentationFrame.js",
    "dist/utils/pnwPresentationFrame.d.ts",
    "dist/utils/pnwFloatingWindowStack.js",
    "dist/utils/pnwFloatingWindowStack.d.ts",
    "dist/utils/pnwViewPresentation.js",
    "dist/utils/pnwViewPresentation.d.ts",
    "dist/utils/pnwViewPresentationLease.js",
    "dist/utils/pnwViewPresentationLease.d.ts",
    "dist/utils/pnwWorkspace.js",
    "dist/utils/pnwWorkspace.d.ts",
    "dist/utils/pnwWorkspaceGate.js",
    "dist/utils/pnwWorkspaceGate.d.ts",
    "dist/utils/pnwWorkspaceTypes.js",
    "dist/utils/pnwWorkspaceTypes.d.ts",
    "dist/utils/pnwWorkbenchHome.js",
    "dist/utils/pnwWorkbenchHome.d.ts",
    "dist/utils/pnwTauriWorkspace.js",
    "dist/utils/pnwTauriWorkspace.d.ts",
    "fixtures/ribbon-contribution-v1.json",
    "fixtures/pnw-workspace-v1.json",
  ]) {
    const file = path.join(packageRoot, required);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`phoenix-wing aggregate tarball is missing ${required}`);
    }
  }
  for (const forbidden of [
    "dist/types/PnwDiagnostics.js",
    "dist/types/PnwDockableTool.js",
    "dist/types/PnwEditorDrawer.js",
    "dist/types/PnwIcon.js",
    "dist/types/PnwLocale.js",
    "dist/types/PnwSelect.js",
    "dist/types/PnwPresentationFrame.js",
    "dist/types/PnwViewPresentation.js",
    "dist/types/PnwViewDialog.js",
    "dist/types/PnwWorkbench.js",
    "dist/types/PnwWorkbenchVue.js",
    "dist/types/PnwWorkbenchWeb.js",
    "dist/types/pnwComboTypes.js",
    "dist/types/pnwPageProperties.js",
  ]) {
    if (fs.existsSync(path.join(packageRoot, forbidden))) {
      throw new Error(`phoenix-wing aggregate tarball emitted type-only JavaScript ${forbidden}`);
    }
  }
  if (manifest.exports?.["./types/*"]?.import !== undefined) {
    throw new Error("phoenix-wing type-only wildcard must not expose a runtime import target");
  }
  if (manifest.exports?.["./types/PnwRibbonConfig"]?.import !== "./dist/types/PnwRibbonConfig.js") {
    throw new Error("phoenix-wing runtime PnwRibbonConfig subpath export changed");
  }
  if (manifest.exports?.["./assets/phoenix-wing-mark.svg"] !== "./assets/phoenix-wing-mark.svg") {
    throw new Error("phoenix-wing brand mark asset export changed");
  }
  const pnwPhoenixWingMarkAsset = fs.readFileSync(
    path.join(packageRoot, "assets/phoenix-wing-mark.svg"),
    "utf8",
  );
  if (!pnwPhoenixWingMarkAsset.includes('viewBox="0 0 128 128"')
    || !pnwPhoenixWingMarkAsset.includes("pnw-phoenix-wing-mark-left-wing")) {
    throw new Error("phoenix-wing brand mark asset geometry changed or is unreadable");
  }
  for (const file of walk(packageRoot)) {
    const relative = path.relative(packageRoot, file).split(path.sep).join("/");
    if (relative.startsWith("src/") || /(?<!\.d)\.(?:ts|vue)$/u.test(relative)) {
      throw new Error(`phoenix-wing aggregate tarball exposes source file ${relative}`);
    }
  }
}

function verifyAggregateUiConsumer() {
  fs.writeFileSync(path.join(consumerRoot, "types-smoke.ts"), `
import type { PnwNavigationNode } from "phoenix-wing/types/PnwWorkbenchWeb";
import type {
  PnwDockableToolDefinition,
  PnwDockableToolState,
} from "phoenix-wing/types/PnwDockableTool";
import type { PnwSelectOption, PnwSelectSize } from "phoenix-wing/types/PnwSelect";
import type { PnwPresentationFrameDefinition } from "phoenix-wing/types/PnwPresentationFrame";
import type {
  PnwViewPresentationManagerState,
  PnwViewPresentationIdentity,
  PnwViewPresentationRecord,
} from "phoenix-wing/types/PnwViewPresentation";
import type {
  PnwViewDialogCapabilities,
  PnwViewDialogRequest,
} from "phoenix-wing/types/PnwViewDialog";
import type {
  PnwWorkspaceDescriptor,
  PnwWorkspaceLifecycleParticipant,
} from "phoenix-wing/types/PnwWorkspace";
import {
  PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION,
  pnwCheckRibbonContributionCompatibility,
} from "phoenix-wing/types/PnwRibbonConfig";

const node: PnwNavigationNode = { id: "dashboard", label: "Dashboard" };
const dialogRequest: PnwViewDialogRequest<{ id: string }> = {
  requestId: "smoke.dialog",
  viewId: "smoke.view",
  title: "Smoke dialog",
  props: { id: "record-1" },
};
const dialogCapabilities: PnwViewDialogCapabilities = {
  presentation: "web-floating",
  supportsParentRelationship: false,
  keepsParentInteractive: true,
  supportsOutsideParentBounds: false,
  maxOpenDialogs: 1,
};
const tool: PnwDockableToolDefinition = {
  id: "smoke.tool",
  title: "Smoke tool",
  scope: "application",
};
const frame: PnwPresentationFrameDefinition = {
  ownerKind: "view",
  movable: true,
  resizable: "both",
  recommendedSize: { width: 960, height: 640 },
  rememberBounds: true,
  closeBehavior: "reattach",
};
const presentationIdentity: PnwViewPresentationIdentity = {
  rendererId: "smoke.view",
  viewInstanceId: "smoke.view:1",
  ownerTabId: "tab:smoke.view:1",
  instanceKey: "smoke-view-1",
};
const presentationRecord = null as PnwViewPresentationRecord | null;
const presentationManager = null as PnwViewPresentationManagerState | null;
const toolState: PnwDockableToolState = {
  mode: "closed",
  floatingPosition: { x: 24, y: 64 },
  floatingSize: { width: 640, height: 480 },
  primaryPlacement: "last",
  primaryExpanded: true,
};
const selectSize: PnwSelectSize = "compact";
const selectOptions: readonly PnwSelectOption[] = [
  { value: "safe", label: "Safe" },
  { value: "locked", label: "Locked", disabled: true },
];
const workspaceDescriptor: PnwWorkspaceDescriptor = {
  workspaceId: "workspace-smoke",
  name: "Workspace Smoke",
  rootPath: "/workspaces/smoke",
  readonly: false,
  capabilities: ["read", "write"],
};
const workspaceParticipant: PnwWorkspaceLifecycleParticipant = { id: "smoke.session" };
if (node.id !== "dashboard" || PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION !== 1) {
  throw new Error("type subpath smoke failed");
}
if (tool.id !== "smoke.tool" || toolState.mode !== "closed") {
  throw new Error("dockable tool type subpath smoke failed");
}
if (frame.ownerKind !== "view" || presentationIdentity.ownerTabId !== "tab:smoke.view:1"
  || presentationRecord !== null || presentationManager !== null) {
  throw new Error("presentation frame type subpath smoke failed");
}
if (selectSize !== "compact" || selectOptions[1]?.disabled !== true) {
  throw new Error("select type subpath smoke failed");
}
if (dialogRequest.viewId !== "smoke.view"
  || dialogCapabilities.presentation !== "web-floating") {
  throw new Error("View dialog type subpath smoke failed");
}
if (workspaceDescriptor.workspaceId !== "workspace-smoke"
  || workspaceParticipant.id !== "smoke.session") {
  throw new Error("Workspace type subpath smoke failed");
}
pnwCheckRibbonContributionCompatibility({ schemaVersion: 1, tabs: [] });
`);
  fs.writeFileSync(path.join(consumerRoot, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      lib: ["ES2022", "DOM"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: "ES2022",
    },
    include: ["types-smoke.ts"],
  }, null, 2)}\n`);
  run(process.execPath, [
    path.join(root, "node_modules", "typescript", "bin", "tsc"),
    "-p",
    path.join(consumerRoot, "tsconfig.json"),
  ], { cwd: consumerRoot });

  const loader = path.join(consumerRoot, "css-loader.mjs");
  fs.writeFileSync(loader, `
export async function load(url, context, nextLoad) {
  if (url.endsWith(".css")) {
    return { format: "module", source: "export default undefined;", shortCircuit: true };
  }
  return nextLoad(url, context);
}
`);
  const smoke = path.join(consumerRoot, "ui-smoke.mjs");
  fs.writeFileSync(smoke, `
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import CompatChoiceDialogHost from "phoenix-wing/components/PnwChoiceDialogHost.vue";
import CompatDockableToolWindow from "phoenix-wing/components/PnwDockableToolWindow.vue";
import CompatOverlayThemeProvider from "phoenix-wing/components/PnwOverlayThemeProvider.vue";
import CompatRecentWorkspaceList from "phoenix-wing/components/PnwRecentWorkspaceList.vue";
import CompatSelect from "phoenix-wing/components/PnwSelect.vue";
import CompatWorkspaceTypeSelect from "phoenix-wing/components/PnwWorkspaceTypeSelect.vue";
import CompatFloatingWindowMenu from "phoenix-wing/components/PnwFloatingWindowMenu.vue";
import CompatViewPresentationPortal from "phoenix-wing/components/PnwViewPresentationPortal.vue";
import CompatDockablePrimarySection from "phoenix-wing/layout/PnwDockablePrimarySection.vue";
import CompatPrimaryPanel from "phoenix-wing/layout/PnwPrimaryPanel.vue";
import CompatPrimarySection from "phoenix-wing/layout/PnwPrimarySection.vue";
import CompatWorkspaceWelcome from "phoenix-wing/layout/PnwWorkspaceWelcome.vue";
import CompatWorkspaceGate from "phoenix-wing/layout/PnwWorkspaceGate.vue";
import CompatWorkbenchHome from "phoenix-wing/layout/PnwWorkbenchHome.vue";
import {
  PNW_RIBBON_CONTRIBUTION_SCHEMA_VERSION as PNW_RIBBON_SUBPATH_SCHEMA_VERSION,
} from "phoenix-wing/types/PnwRibbonConfig";
import {
  PNW_VERSION,
  PNW_DEFAULT_DOCKABLE_TOOL_STATE,
  PnwChoiceDialogHost,
  PnwDockablePrimarySection,
  PnwDockableToolWindow,
  PnwOverlayThemeProvider,
  PnwRecentWorkspaceList,
  PnwSelect,
  PnwWorkspaceTypeSelect,
  PnwFloatingWindowMenu,
  PnwViewPresentationPortal,
  PnwPrimaryPanel,
  PnwPrimarySection,
  PnwWorkspaceWelcome,
  PnwWorkspaceGate,
  PnwWorkbenchHome,
  pnwApplyColorScheme,
  pnwCreateFloatingWindowStack,
  pnwCreateViewPresentationLeaseRegistry,
  pnwCreateViewPresentationManagerState,
  pnwCreateViewPresentationRecord,
  pnwCheckRibbonContributionCompatibility,
  pnwChoiceDialogOpen,
  pnwIsDockableToolVisible,
  pnwReduceDockableToolState,
  pnwGetAppliedColorScheme,
  pnwPromptChoice,
  pnwResolveViewDialogPresentation,
  pnwSelectMostRecentEmbeddedEditorView,
  pnwResolveChoice,
  pnwCreateWorkspaceController,
  pnwCreateWorkspaceResourceRef,
  pnwNormalizeWorkspaceRelativePath,
  pnwNormalizeWorkspaceTypes,
  pnwResolveWorkspaceGate,
  pnwCreateWorkbenchHomeDefinition,
  PNW_DEFAULT_TAURI_WORKSPACE_COMMANDS,
} from "phoenix-wing";

if (PNW_VERSION !== "${releaseVersion}") {
  throw new Error("aggregate runtime version changed to " + PNW_VERSION);
}
if (pnwResolveViewDialogPresentation(undefined, "main") !== "web-floating") {
  throw new Error("aggregate View dialog fallback contract smoke failed");
}

const ribbonFixture = JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(
  "phoenix-wing/fixtures/ribbon-contribution-v1.json",
)), "utf8"));
if (!pnwCheckRibbonContributionCompatibility(ribbonFixture).compatible) {
  throw new Error("aggregate ribbon contribution fixture smoke failed");
}
const workspaceFixture = JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(
  "phoenix-wing/fixtures/pnw-workspace-v1.json",
)), "utf8"));
const workspaceController = pnwCreateWorkspaceController({
  host: { async open() { return workspaceFixture.current; } },
});
const workspaceResult = await workspaceController.requestOpen({
  rootPath: workspaceFixture.current.rootPath,
});
const workspaceRef = pnwCreateWorkspaceResourceRef(
  workspaceFixture.current,
  workspaceFixture.resourceExamples[0],
);
if (workspaceResult.status !== "opened"
  || workspaceController.getSnapshot().current?.workspaceId !== workspaceFixture.current.workspaceId
  || workspaceRef.relativePath !== pnwNormalizeWorkspaceRelativePath(workspaceFixture.resourceExamples[0])
  || PNW_DEFAULT_TAURI_WORKSPACE_COMMANDS.open !== "pnw_workspace_open") {
  throw new Error("aggregate Workspace controller/fixture smoke failed");
}
if (PNW_RIBBON_SUBPATH_SCHEMA_VERSION !== 1) {
  throw new Error("runtime PnwRibbonConfig subpath smoke failed");
}
if (PnwChoiceDialogHost !== CompatChoiceDialogHost) {
  throw new Error("root and compatibility subpath resolved different component instances");
}
if (PnwDockableToolWindow !== CompatDockableToolWindow
  || PnwDockablePrimarySection !== CompatDockablePrimarySection) {
  throw new Error("root and compatibility subpath resolved different dockable tool components");
}
if (PnwOverlayThemeProvider !== CompatOverlayThemeProvider) {
  throw new Error("root and compatibility subpath resolved different overlay theme providers");
}
if (PnwRecentWorkspaceList !== CompatRecentWorkspaceList
  || PnwWorkspaceWelcome !== CompatWorkspaceWelcome) {
  throw new Error("root and compatibility subpath resolved different Workspace welcome components");
}
if (PnwWorkspaceGate !== CompatWorkspaceGate
  || PnwWorkspaceTypeSelect !== CompatWorkspaceTypeSelect) {
  throw new Error("root and compatibility subpath resolved different Workspace entry components");
}
if (PnwWorkbenchHome !== CompatWorkbenchHome
  || pnwCreateWorkbenchHomeDefinition().isHome !== true) {
  throw new Error("aggregate Workbench Home contract smoke failed");
}
if (PnwSelect !== CompatSelect) {
  throw new Error("root and compatibility subpath resolved different Select components");
}
const workspaceGate = pnwResolveWorkspaceGate({
  state: { current: undefined },
  policy: "required",
  requestedMode: "workbench",
});
const workspaceTypes = pnwNormalizeWorkspaceTypes([
  { typeId: "simulation", label: "Simulation", order: 15 },
]);
if (workspaceGate.mode !== "welcome"
  || workspaceTypes.map((item) => item.typeId).join(",") !== "mixed,simulation,code,cad,lighting") {
  throw new Error("aggregate Workspace gate/type contract smoke failed");
}
if (PnwFloatingWindowMenu !== CompatFloatingWindowMenu) {
  throw new Error("root and compatibility subpath resolved different floating window menus");
}
if (PnwViewPresentationPortal !== CompatViewPresentationPortal) {
  throw new Error("root and compatibility subpath resolved different View presentation portals");
}
if (PnwPrimaryPanel !== CompatPrimaryPanel || PnwPrimarySection !== CompatPrimarySection) {
  throw new Error("root and compatibility subpath resolved different Primary components");
}
const dockableDefinition = { id: "smoke.tool", title: "Smoke tool", scope: "application" };
const floatingToolState = pnwReduceDockableToolState(PNW_DEFAULT_DOCKABLE_TOOL_STATE, {
  type: "open-floating",
});
if (floatingToolState.mode !== "floating"
  || !pnwIsDockableToolVisible(dockableDefinition, floatingToolState, "dashboard")) {
  throw new Error("aggregate dockable tool state contract smoke failed");
}
const viewRecord = pnwCreateViewPresentationRecord({
  rendererId: "smoke.view",
  viewInstanceId: "smoke.view:1",
  ownerTabId: "tab:smoke.view:1",
  instanceKey: "smoke-view-1",
}, { frame: { ownerKind: "view", recommendedSize: { width: 960, height: 640 } } });
if (viewRecord.dialogSize.width !== 960 || viewRecord.mode !== "embedded") {
  throw new Error("aggregate View presentation record smoke failed");
}
const viewManager = pnwCreateViewPresentationManagerState("smoke.view:1");
if (viewManager.editorActivationHistory[0] !== "smoke.view:1"
  || pnwSelectMostRecentEmbeddedEditorView(viewManager.editorActivationHistory, [{
    viewInstanceId: "smoke.view:1",
    open: true,
    presentationMode: "embedded",
  }]) !== "smoke.view:1") {
  throw new Error("aggregate View presentation MRU smoke failed");
}
const leaseRegistry = pnwCreateViewPresentationLeaseRegistry();
if (leaseRegistry.snapshot().length !== 0) {
  throw new Error("aggregate View presentation lease smoke failed");
}
const floatingStack = pnwCreateFloatingWindowStack();
const unregisterTool = floatingStack.register({ presentationId: "tool:resource", baseZIndex: 1400, focus() {} });
const unregisterView = floatingStack.register({ presentationId: "view:analysis", baseZIndex: 1400, focus() {} });
floatingStack.activate("tool:resource");
if (!floatingStack.isActive("tool:resource") || floatingStack.resolveZIndex("tool:resource") !== 1401) {
  throw new Error("aggregate floating window stack smoke failed");
}
unregisterTool();
unregisterView();
if (pnwApplyColorScheme("dark") !== "dark" || pnwGetAppliedColorScheme() !== "dark") {
  throw new Error("aggregate overlay color-scheme contract did not share applied state");
}
pnwApplyColorScheme("light");
const pending = pnwPromptChoice({
  title: "singleton smoke",
  message: "compiled entry",
  choices: [{ id: "ok", label: "OK" }],
});
if (pnwChoiceDialogOpen.value !== true) throw new Error("root choice-dialog state did not open");
pnwResolveChoice("ok");
const result = await pending;
if (result.choiceId !== "ok" || pnwChoiceDialogOpen.value !== false) {
  throw new Error("root choice-dialog state did not resolve through the compiled singleton");
}
`);
  run(process.execPath, ["--experimental-loader", loader, smoke], { cwd: consumerRoot });

  fs.writeFileSync(path.join(consumerRoot, "index.html"), '<div id="app"></div><script type="module" src="/ui-entry.js"></script>\n');
  fs.writeFileSync(path.join(consumerRoot, "ui-entry.js"), `
import {
  PnwChoiceDialogHost,
  PnwOverlayThemeProvider,
  PnwPrimaryPanel,
  PnwPrimarySection,
  pnwPromptChoice,
} from "phoenix-wing";
import {
  PnwNavigationTreeView,
  pnwCodeDefineNavigationTree,
} from "@phoenix-wing/code-core/ui";
import CompatChoiceDialogHost from "phoenix-wing/components/PnwChoiceDialogHost.vue";
import CompatOverlayThemeProvider from "phoenix-wing/components/PnwOverlayThemeProvider.vue";
import CompatPrimaryPanel from "phoenix-wing/layout/PnwPrimaryPanel.vue";
import CompatPrimarySection from "phoenix-wing/layout/PnwPrimarySection.vue";
if (PnwChoiceDialogHost !== CompatChoiceDialogHost
  || PnwOverlayThemeProvider !== CompatOverlayThemeProvider
  || PnwPrimaryPanel !== CompatPrimaryPanel
  || PnwPrimarySection !== CompatPrimarySection
  || typeof pnwPromptChoice !== "function") {
  throw new Error("aggregate UI exports are inconsistent");
}
if (typeof PnwNavigationTreeView !== "function" || typeof pnwCodeDefineNavigationTree !== "function") {
  throw new Error("code-core navigation-tree element export is inconsistent");
}
`);
  const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
  run(process.execPath, [viteCli, "build"], { cwd: consumerRoot });
  if (!fs.existsSync(path.join(consumerRoot, "dist", "index.html"))) {
    throw new Error("clean aggregate UI consumer did not produce a Vite build");
  }
  process.stdout.write("[verify] clean aggregate UI singleton and Vite consumer passed\n");
}

function walk(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, result);
    else result.push(absolute);
  }
  return result;
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: process.env,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = options.capture ? `\n${String(result.stderr).trim()}` : "";
    throw new Error(`${command} exited with ${result.status}${stderr}`);
  }
  return result;
}
