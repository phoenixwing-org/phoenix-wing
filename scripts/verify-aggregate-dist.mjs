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
  "components/PnwEditorDrawerHost.js",
  "components/PnwEditorDrawerHost.vue.d.ts",
  "composables/pnwChoiceDialog.js",
  "composables/pnwChoiceDialog.d.ts",
  "layout/PnwPageHeader.js",
  "layout/PnwPageHeader.vue.d.ts",
];

for (const relative of required) {
  const file = path.join(dist, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`aggregate dist is missing ${relative}`);
  }
}
if (manifest.main !== "./dist/index.js" || manifest.types !== "./dist/index.d.ts") {
  throw new Error("aggregate manifest must resolve root runtime/types from dist");
}
for (const [subpath, target] of Object.entries(manifest.exports)) {
  if (subpath === "./style.css") continue;
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
