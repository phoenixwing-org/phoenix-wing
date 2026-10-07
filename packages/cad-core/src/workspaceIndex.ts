import {
  pnwCadXlinkRuleLabel, pnwInferBomFieldsFromFilename, pnwResolveXlinkTarget,
  type PnwCadBomFields, type PnwCadEmbeddedBomFields, type PnwCadXlinkResolveStatus,
} from "./index.js";

/** Host-supplied, stable file snapshot. No filesystem or ZIP driver is owned here. */
export interface PnwCadIndexRecord {
  readonly relativePath: string;
  readonly filename: string;
  readonly documentKind: string;
  readonly sizeBytes: number;
  readonly modifiedAtMs: number;
  readonly objectCount: number;
  readonly xlinks: readonly { readonly file: string; readonly label: string | null }[];
  readonly embeddedFields?: Partial<PnwCadEmbeddedBomFields>;
  readonly parseError?: string;
}

export interface PnwCadIndexAsset extends PnwCadIndexRecord {
  readonly fields: Readonly<PnwCadBomFields>;
}

export interface PnwCadIndexReference {
  readonly hostRelativePath: string;
  readonly file: string;
  readonly label: string;
  readonly status: PnwCadXlinkResolveStatus;
  readonly targetRelativePath: string | null;
  readonly candidates: readonly string[];
  readonly targetFields: Readonly<PnwCadBomFields>;
  readonly quantity: number;
}

export interface PnwCadIndexBomLine {
  readonly assemblyRelativePath: string;
  readonly partRelativePath: string;
  readonly hostRelativePath: string;
  readonly file: string;
  readonly label: string;
  readonly depth: number;
  readonly bomPath: string;
  readonly treePath: string;
  readonly partKey: string;
  readonly quantity: number;
  readonly cycleDetected: boolean;
}

export interface PnwCadWorkspaceIndexPlan {
  readonly assets: readonly PnwCadIndexAsset[];
  readonly references: readonly PnwCadIndexReference[];
  readonly bomLines: readonly PnwCadIndexBomLine[];
  readonly parseFailures: number;
}

/** Strict canonical key, intentionally case-preserving and independent of the host OS. */
export function pnwCadIndexRelativePath(value: string): string {
  const raw = String(value).replaceAll("\\", "/");
  if (!raw || raw.startsWith("/") || /^[A-Za-z]:/.test(raw) || /[\u0000-\u001f]/.test(raw)) {
    throw new Error(`Invalid CAD index relative path: ${value}`);
  }
  const segments = raw.split("/").filter(part => part !== "." && part !== "");
  if (!segments.length || segments.includes("..")) throw new Error(`Invalid CAD index relative path: ${value}`);
  return segments.join("/");
}

function basename(value: string): string { return value.split("/").at(-1) || ""; }
function folded(value: string): string { return value.toLowerCase(); }

export const PNW_CAD_INDEX_EXCLUDED_DIRECTORIES = Object.freeze([".git", ".phoenix", "node_modules", ".venv", "__pycache__"]);

/** Shared coverage definition; excluded directories retain their previous records. */
export function pnwCadIndexIncludesPath(value: string): boolean {
  const parts = pnwCadIndexRelativePath(value).split("/");
  return /\.fcstd$/i.test(parts.at(-1)!)
    && !parts.slice(0, -1).some(part => PNW_CAD_INDEX_EXCLUDED_DIRECTORIES.includes(part));
}

function directTarget(host: string, file: string): string | null {
  if (!file || file.startsWith("/") || /^[A-Za-z]:/.test(file)) return null;
  const segments = host.split("/").slice(0, -1);
  for (const part of file.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (!segments.length) return null; segments.pop(); }
    else segments.push(part);
  }
  return segments.join("/") || null;
}

/**
 * Shared lightweight FCStd index planning. File discovery, completeness checks,
 * cancellation and reading Document.xml belong to the host. This is not a
 * geometric/manufacturing BOM: quantity counts explicit XLink instances only.
 */
export function pnwBuildCadWorkspaceIndex(records: readonly PnwCadIndexRecord[]): PnwCadWorkspaceIndexPlan {
  const keys = new Set<string>();
  const assets: PnwCadIndexAsset[] = records.map(record => {
    const relativePath = pnwCadIndexRelativePath(record.relativePath);
    if (!pnwCadIndexIncludesPath(relativePath)) throw new Error(`Outside CAD index coverage: ${relativePath}`);
    if (keys.has(folded(relativePath))) throw new Error(`Duplicate or case-colliding CAD path: ${relativePath}`);
    keys.add(folded(relativePath));
    if (![record.sizeBytes, record.modifiedAtMs, record.objectCount].every(value => Number.isFinite(value) && value >= 0)) {
      throw new Error(`Invalid CAD snapshot: ${relativePath}`);
    }
    const fields = pnwInferBomFieldsFromFilename(relativePath);
    for (const key of ["PartNumber", "PartVersion", "TypeCode", "ModelSeries", "PartName", "label"] as const) {
      const embedded = record.embeddedFields?.[key]?.trim();
      if (embedded) fields[key] = embedded;
    }
    return Object.freeze({ ...record, relativePath, filename: basename(relativePath),
      embeddedFields: record.embeddedFields ? Object.freeze({ ...record.embeddedFields }) : undefined,
      xlinks: Object.freeze(record.xlinks.map(link => Object.freeze({ ...link }))), fields: Object.freeze(fields) });
  }).sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
  const byPath = new Map(assets.map(asset => [folded(asset.relativePath), asset]));
  const byBasename = new Map<string, string[]>();
  for (const asset of assets) {
    const key = folded(asset.filename);
    byBasename.set(key, [...(byBasename.get(key) || []), asset.relativePath]);
  }
  const references: PnwCadIndexReference[] = [];
  for (const asset of assets) {
    if (asset.parseError) continue; // Failed XML must never masquerade as an empty successful graph.
    const links = new Map<string, { file: string; label: string; quantity: number }>();
    for (const link of asset.xlinks) {
      const file = String(link.file || "").trim().replaceAll("\\", "/");
      if (!file) continue;
      const previous = links.get(file);
      if (previous) previous.quantity += 1;
      else links.set(file, { file, label: String(link.label || "").trim(), quantity: 1 });
    }
    for (const link of links.values()) {
      const candidates = byBasename.get(folded(basename(link.file))) || [];
      const direct = directTarget(asset.relativePath, link.file);
      const resolved = pnwResolveXlinkTarget({ hostRel: asset.relativePath, xlinkFile: link.file,
        candidateRels: candidates, existingCandidateRels: candidates,
        directTargetRel: direct ? byPath.get(folded(direct))?.relativePath : null });
      // Ambiguous candidates remain suggestions, not committed target identities.
      const target = resolved.status === "resolved" || resolved.status === "self"
        ? resolved.targetRel?.replace(/^\.\//, "") || null : null;
      const fallback = basename(link.file) || "unknown.FCStd";
      const fields = (target ? byPath.get(folded(target))?.fields : undefined)
        || pnwInferBomFieldsFromFilename(fallback);
      references.push(Object.freeze({ hostRelativePath: asset.relativePath, ...link,
        label: link.label || pnwCadXlinkRuleLabel(undefined, link.file, target), status: resolved.status,
        targetRelativePath: target, candidates: Object.freeze(resolved.candidates.map(value => value.replace(/^\.\//, ""))),
        targetFields: Object.freeze(fields) }));
    }
  }
  const adjacency = new Map<string, PnwCadIndexReference[]>();
  for (const reference of references) adjacency.set(reference.hostRelativePath, [...(adjacency.get(reference.hostRelativePath) || []), reference]);
  const bomLines: PnwCadIndexBomLine[] = [];
  const visit = (root: string, host: string, ancestors: string[], indexes: number[], quantity: number): void => {
    const edges = adjacency.get(host) || [];
    if (edges.length && ancestors.length > 32) throw new Error("CAD BOM depth exceeds 32; index not complete");
    edges.forEach((edge, index) => {
      if (edge.status === "non_fcstd") return;
      if (bomLines.length >= 100_000) throw new Error("CAD BOM exceeds 100000 rows; index not complete");
      const target = edge.targetRelativePath || basename(edge.file);
      const cycleDetected = ancestors.includes(target);
      const instanceQuantity = quantity * edge.quantity;
      if (!Number.isSafeInteger(instanceQuantity)) throw new Error("CAD BOM quantity exceeds safe integer range");
      const path = [...indexes, index];
      bomLines.push(Object.freeze({ assemblyRelativePath: root, hostRelativePath: host,
        partRelativePath: target, file: edge.file, label: edge.label, depth: ancestors.length,
        bomPath: [...ancestors, target].join(" > "), treePath: path.join("/"),
        partKey: edge.targetFields.PartNumber && edge.targetFields.PartVersion
          ? `${edge.targetFields.PartNumber}.${edge.targetFields.PartVersion}` : "",
        quantity: instanceQuantity, cycleDetected }));
      if (edge.status === "resolved" && !cycleDetected) visit(root, target, [...ancestors, target], path, instanceQuantity);
    });
  };
  for (const asset of assets) visit(asset.relativePath, asset.relativePath, [asset.relativePath], [], 1);
  return Object.freeze({ assets: Object.freeze(assets), references: Object.freeze(references),
    bomLines: Object.freeze(bomLines), parseFailures: assets.filter(asset => asset.parseError).length });
}
