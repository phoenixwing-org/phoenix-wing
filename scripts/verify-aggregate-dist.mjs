import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const required = [
  "index.js",
  "index.d.ts",
  "style.css",
  "components/PnwChoiceDialogHost.js",
  "components/PnwChoiceDialogHost.vue.d.ts",
  "components/PnwDockableToolWindow.js",
  "components/PnwDockableToolWindow.vue.d.ts",
  "components/PnwEditorDrawerHost.js",
  "components/PnwEditorDrawerHost.vue.d.ts",
  "components/PnwIconRenderer.js",
  "components/PnwIconRenderer.vue.d.ts",
  "components/PnwOverlayThemeProvider.js",
  "components/PnwOverlayThemeProvider.vue.d.ts",
  "components/PnwRecentWorkspaceList.js",
  "components/PnwRecentWorkspaceList.vue.d.ts",
  "components/PnwSelect.js",
  "components/PnwSelect.vue.d.ts",
  "components/PnwWorkspaceTypeSelect.js",
  "components/PnwWorkspaceTypeSelect.vue.d.ts",
  "components/PnwFloatingWindowMenu.js",
  "components/PnwFloatingWindowMenu.vue.d.ts",
  "components/PnwViewDialogHost.js",
  "components/PnwViewDialogHost.vue.d.ts",
  "components/PnwViewPresentationPortal.js",
  "components/PnwViewPresentationPortal.vue.d.ts",
  "composables/pnwChoiceDialog.js",
  "composables/pnwChoiceDialog.d.ts",
  "composables/usePnwOverlayTheme.js",
  "composables/usePnwOverlayTheme.d.ts",
  "composables/usePnwViewDialogHost.js",
  "composables/usePnwViewDialogHost.d.ts",
  "composables/usePnwViewPresentationContext.js",
  "composables/usePnwViewPresentationContext.d.ts",
  "composables/pnwIconRegistry.js",
  "composables/pnwIconRegistry.d.ts",
  "layout/PnwPageHeader.js",
  "layout/PnwPageHeader.vue.d.ts",
  "layout/PnwDockablePrimarySection.js",
  "layout/PnwDockablePrimarySection.vue.d.ts",
  "layout/PnwPrimaryPanel.js",
  "layout/PnwPrimaryPanel.vue.d.ts",
  "layout/PnwPrimarySection.js",
  "layout/PnwPrimarySection.vue.d.ts",
  "layout/PnwWorkspaceWelcome.js",
  "layout/PnwWorkspaceWelcome.vue.d.ts",
  "layout/PnwWorkspaceGate.js",
  "layout/PnwWorkspaceGate.vue.d.ts",
  "layout/PnwWorkbenchHome.js",
  "layout/PnwWorkbenchHome.vue.d.ts",
  "types/PnwDiagnostics.d.ts",
  "types/PnwDockableTool.d.ts",
  "types/PnwEditorDrawer.d.ts",
  "types/PnwIcon.d.ts",
  "types/PnwLocale.d.ts",
  "types/PnwSelect.d.ts",
  "types/PnwPresentationFrame.d.ts",
  "types/PnwViewPresentation.d.ts",
  "types/PnwViewDialog.d.ts",
  "types/PnwViewDialogHost.d.ts",
  "types/PnwRibbonConfig.js",
  "types/PnwRibbonConfig.d.ts",
  "types/PnwWorkbench.d.ts",
  "types/PnwWorkbenchVue.d.ts",
  "types/PnwWorkbenchWeb.d.ts",
  "types/PnwWorkbenchHome.d.ts",
  "types/pnwComboTypes.d.ts",
  "types/pnwPageProperties.d.ts",
  "utils/pnwIconId.js",
  "utils/pnwIconId.d.ts",
  "utils/pnwDockableTool.js",
  "utils/pnwDockableTool.d.ts",
  "utils/pnwViewDialog.js",
  "utils/pnwViewDialog.d.ts",
  "utils/pnwPresentationFrame.js",
  "utils/pnwPresentationFrame.d.ts",
  "utils/pnwFloatingWindowStack.js",
  "utils/pnwFloatingWindowStack.d.ts",
  "utils/pnwViewPresentation.js",
  "utils/pnwViewPresentation.d.ts",
  "utils/pnwViewPresentationLease.js",
  "utils/pnwViewPresentationLease.d.ts",
  "utils/pnwWorkspaceGate.js",
  "utils/pnwWorkspaceGate.d.ts",
  "utils/pnwWorkspaceTypes.js",
  "utils/pnwWorkspaceTypes.d.ts",
  "utils/pnwWorkbenchHome.js",
  "utils/pnwWorkbenchHome.d.ts",
];

for (const relative of required) {
  const file = path.join(dist, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`aggregate dist is missing ${relative}`);
  }
}
const forbiddenTypeOnlyRuntimeEntries = [
  "types/PnwDiagnostics.js",
  "types/PnwDockableTool.js",
  "types/PnwEditorDrawer.js",
  "types/PnwIcon.js",
  "types/PnwLocale.js",
  "types/PnwSelect.js",
  "types/PnwPresentationFrame.js",
  "types/PnwViewPresentation.js",
  "types/PnwViewDialog.js",
  "types/PnwViewDialogHost.js",
  "types/PnwWorkbench.js",
  "types/PnwWorkbenchVue.js",
  "types/PnwWorkbenchWeb.js",
  "types/PnwWorkbenchHome.js",
  "types/pnwComboTypes.js",
  "types/pnwPageProperties.js",
];
for (const relative of forbiddenTypeOnlyRuntimeEntries) {
  if (fs.existsSync(path.join(dist, relative))) {
    throw new Error(`aggregate dist emitted type-only JavaScript entry ${relative}`);
  }
}
if (manifest.main !== "./dist/index.js" || manifest.types !== "./dist/index.d.ts") {
  throw new Error("aggregate manifest must resolve root runtime/types from dist");
}
if (manifest.exports["./types/*"]?.import !== undefined) {
  throw new Error("type-only ./types/* wildcard must not declare a runtime import target");
}
if (manifest.exports["./types/PnwRibbonConfig"]?.import !== "./dist/types/PnwRibbonConfig.js") {
  throw new Error("runtime PnwRibbonConfig type subpath must retain its explicit import target");
}
for (const [subpath, target] of Object.entries(manifest.exports)) {
  if (subpath === "./style.css") continue;
  if (subpath === "./assets/phoenix-wing-mark.svg") {
    if (target !== "./assets/phoenix-wing-mark.svg") {
      throw new Error("Phoenix Wing mark asset must resolve from ./assets/phoenix-wing-mark.svg");
    }
    continue;
  }
  if (subpath === "./fixtures/*") {
    if (target !== "./fixtures/*") throw new Error("aggregate fixtures must resolve from ./fixtures/*");
    continue;
  }
  const serialized = JSON.stringify(target);
  if (serialized.includes("./src/") || !serialized.includes("./dist/")) {
    throw new Error(`aggregate export ${subpath} must resolve only from dist`);
  }
}

const rootEntry = fs.readFileSync(path.join(dist, "index.js"), "utf8");
const hostEntry = fs.readFileSync(path.join(dist, "components/PnwChoiceDialogHost.js"), "utf8");
if (!rootEntry.startsWith('import "./style.css";')) {
  throw new Error("aggregate root does not inject aggregate styles");
}
if (!rootEntry.includes("./composables/pnwChoiceDialog.js")) {
  throw new Error("aggregate root does not share the compiled choice-dialog module");
}
if (!hostEntry.includes("../composables/pnwChoiceDialog.js")) {
  throw new Error("choice-dialog host does not share the compiled choice-dialog module");
}
if (!hostEntry.startsWith('import "../style.css";')) {
  throw new Error("compiled choice-dialog host does not inject aggregate styles");
}

for (const file of walk(dist).filter((item) => item.endsWith(".js"))) {
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("/src/") || /from\s+["'][^"']+\.vue["']/u.test(source)) {
    throw new Error(`${path.relative(root, file)} still exposes source/SFC runtime imports`);
  }
}

process.stdout.write(`[verify] aggregate dist ${required.length} required files and singleton import graph passed\n`);

function walk(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, result);
    else result.push(absolute);
  }
  return result;
}
