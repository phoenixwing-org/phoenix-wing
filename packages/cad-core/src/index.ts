export type PnwCadBomFields = {
  repo_rel_path: string;
  filename: string;
  PartNumber: string;
  PartVersion: string;
  TypeCode: string;
  ModelSeries: string;
  PartName: string;
  label: string;
};

export type PnwCadDocumentKinds = {
  part: boolean;
  assembly: boolean;
  drawing: boolean;
  display: string;
  recommended_suffix: string;
};

export type PnwCadXlinkRef = {
  file: string;
  label: string;
};

export type PnwCadXlinkResolveStatus = "resolved" | "ambiguous" | "missing" | "self" | "non_fcstd";

export type PnwCadResolvedXlinkTarget = {
  targetRel: string | null;
  status: PnwCadXlinkResolveStatus;
  candidates: string[];
};

export type PnwCadXlinkTargetInput = {
  hostRel: string;
  xlinkFile: string;
  candidateRels: readonly string[];
  existingCandidateRels: readonly string[];
  directTargetRel?: string | null;
};

export type PnwCadXlinkTargetAsset = {
  label?: string | null;
  part_number?: string | null;
  part_version?: string | null;
  part_name?: string | null;
};

export type PnwCadGraphEdge = {
  host_repo_rel_path?: string | null;
  target_repo_rel_path?: string | null;
  resolve_status?: string | null;
  xlink_file_attr?: string | null;
  target_basename?: string | null;
  target_part_number?: string | null;
  target_part_version?: string | null;
  target_type_code?: string | null;
  target_model_series?: string | null;
  target_part_name?: string | null;
  target_asset_label?: string | null;
  link_label?: string | null;
  rule_label?: string | null;
};

export type PnwCadIncomingHost<T extends PnwCadGraphEdge = PnwCadGraphEdge> = {
  host_repo_rel_path: string;
  depth: number;
  usage_kind: "direct" | "indirect";
  via_chain: string[];
  direct_refs: T[];
};

export type PnwCadAssemblyTreeNode = {
  id: string;
  host_repo_rel: string;
  repo_rel_path: string;
  basename: string;
  resolve_status: string;
  xlink_file_attr: string;
  part_number: string;
  part_version: string;
  part_key: string;
  TypeCode: string;
  ModelSeries: string;
  PartName: string;
  label: string;
  link_label: string;
  link_labels: string[];
  xref_instances: Array<{ xlink_file_attr: string; link_label: string }>;
  rule_label: string;
  ref_count: number;
  file_role: "part" | "assembly" | "drawing";
  children: PnwCadAssemblyTreeNode[];
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanUpper(value: unknown): string {
  return clean(value).toUpperCase();
}

function basename(relativePath: string): string {
  return relativePath.slice(relativePath.lastIndexOf("/") + 1);
}

export function pnwNormalizeCadRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").trim().replace(/^\.\//, "");
  const parts = normalized.split("/");
  if (
    !normalized
    || normalized.startsWith("/")
    || /^[A-Za-z]:\//.test(normalized)
    || parts.includes("..")
  ) {
    throw new Error(`Invalid workspace relative path: ${relativePath}`);
  }
  return normalized;
}

export function pnwInferFcstdSuffix(filename: string): string {
  if (/\.drawing\.fcstd$/i.test(filename)) return ".Drawing.FCStd";
  if (/\.assy\.fcstd$/i.test(filename)) return ".ASSY.FCStd";
  return ".FCStd";
}

function stripKnownFcstdSuffix(filename: string): string {
  return filename
    .replace(/\.drawing\.fcstd$/i, "")
    .replace(/\.assy\.fcstd$/i, "")
    .replace(/\.fcstd$/i, "");
}

export function pnwComposeBomLabel(fields: Partial<PnwCadBomFields>): string {
  const partNumber = clean(fields.PartNumber);
  const partVersion = clean(fields.PartVersion);
  if (!partNumber || !partVersion) return "";
  const tail = clean(fields.PartName) || clean(fields.label);
  return tail ? `${partNumber}.${partVersion}-${tail}` : `${partNumber}.${partVersion}`;
}

export function pnwInferBomFieldsFromFilename(relativePath: string): PnwCadBomFields {
  const safeRelativePath = pnwNormalizeCadRelativePath(relativePath);
  const filename = basename(safeRelativePath);
  const stem = stripKnownFcstdSuffix(filename);
  const fields: PnwCadBomFields = {
    repo_rel_path: safeRelativePath,
    filename,
    PartNumber: "",
    PartVersion: "",
    TypeCode: "",
    ModelSeries: "",
    PartName: "",
    label: "",
  };
  const pieces = stem.split("-").map((piece) => piece.trim()).filter(Boolean);
  const head = pieces.shift() || stem;
  const headMatch = /^([^.]+)\.([^.]+)$/.exec(head);
  if (headMatch) {
    fields.PartNumber = headMatch[1];
    fields.PartVersion = headMatch[2];
  } else if (head) {
    fields.PartName = head;
  }

  if (pieces.length) {
    if (/^[A-Za-z]$/.test(pieces[0])) fields.TypeCode = pieces.shift()!.toUpperCase();
    if (fields.TypeCode !== "S" && pieces.length >= 2 && /^[A-Za-z0-9_]+$/.test(pieces[0])) {
      fields.ModelSeries = pieces.shift()!;
    }
    fields.PartName = pieces.join("-") || fields.PartName;
  }
  fields.label = pnwComposeBomLabel(fields);
  return fields;
}

export function pnwInferBomDocumentKinds(relativePathOrFilename: string): PnwCadDocumentKinds {
  const filename = basename(relativePathOrFilename.replace(/\\/g, "/"));
  const drawing = /\.drawing\.fcstd$/i.test(filename);
  const assembly = /\.assy\.fcstd$/i.test(filename);
  const part = !drawing && !assembly;
  const display = part ? "Part" : assembly ? "Assembly" : drawing ? "Drawing" : "Unknown";
  return {
    part,
    assembly,
    drawing,
    display,
    recommended_suffix: pnwInferFcstdSuffix(filename),
  };
}

export function pnwComposeRecommendedBomFilename(
  fields: Partial<PnwCadBomFields>,
  suffix = ".FCStd",
): string {
  const partNumber = clean(fields.PartNumber);
  const partVersion = clean(fields.PartVersion);
  if (!partNumber || !partVersion) return "";
  const typeCode = cleanUpper(fields.TypeCode);
  const modelSeries = cleanUpper(fields.ModelSeries);
  const partName = clean(fields.PartName) || clean(fields.label);
  const parts = [`${partNumber}.${partVersion}`];
  if (typeCode) parts.push(typeCode);
  if (typeCode !== "S" && modelSeries) parts.push(modelSeries);
  const prefix = parts.join("-");
  return `${partName ? `${prefix}-${partName}` : prefix}${suffix}`;
}

function decodeXmlAttribute(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function xmlTagAttribute(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag);
  return match ? decodeXmlAttribute(match[2]) : "";
}

function isFcstdReference(value: string): boolean {
  return basename(value.replace(/\\/g, "/")).toLowerCase().endsWith(".fcstd");
}

export function pnwExtractXlinksFromDocumentXml(xml: string): PnwCadXlinkRef[] {
  const byFile = new Map<string, PnwCadXlinkRef>();
  const addFromFragment = (fragment: string, objectLabel: string): void => {
    const xlinkPattern = /<XLink\b[^>]*>/gi;
    for (const match of fragment.matchAll(xlinkPattern)) {
      const file = xmlTagAttribute(match[0], "file").trim();
      if (!isFcstdReference(file)) continue;
      const label = objectLabel || xmlTagAttribute(match[0], "label").trim();
      const existing = byFile.get(file);
      if (!existing) byFile.set(file, { file, label });
      else if (!existing.label && label) existing.label = label;
    }
  };

  const objectPattern = /<Object(?:\s[^>]*)?>([\s\S]*?)<\/Object>/gi;
  for (const objectMatch of xml.matchAll(objectPattern)) {
    const block = objectMatch[0];
    const labelMatch = /<Property\b[^>]*\bname\s*=\s*(["'])Label\1[^>]*>[\s\S]*?<String\b[^>]*\bvalue\s*=\s*(["'])([\s\S]*?)\2/i.exec(block);
    addFromFragment(block, labelMatch ? decodeXmlAttribute(labelMatch[3]) : "");
  }
  addFromFragment(xml, "");
  return [...byFile.values()];
}

function indexRelativePath(value: string): string {
  const normalized = String(value || "").replace(/\\/g, "/").trim().replace(/^(\.\/)+/, "");
  return normalized ? `./${normalized}` : "";
}

function relativeParts(value: string): string[] {
  return indexRelativePath(value).replace(/^\.\//, "").split("/").filter(Boolean);
}

function relativeDirectory(value: string): string {
  const parts = relativeParts(value);
  parts.pop();
  return parts.length ? `./${parts.join("/")}` : ".";
}

function freecadWorkspaceDirectory(directory: string): string {
  const parts = relativeParts(directory);
  if (parts.at(-1)?.toLowerCase() === "freecad") return `./${parts.join("/")}`;
  if (parts.at(-2)?.toLowerCase() === "freecad") return `./${parts.slice(0, -1).join("/")}`;
  return parts.length ? `./${parts.join("/")}` : ".";
}

function relativeDistance(fromDirectory: string, toFile: string): number {
  const from = relativeParts(fromDirectory);
  const to = relativeParts(toFile);
  let common = 0;
  while (common < from.length && common < to.length && from[common] === to[common]) common += 1;
  return [...from.slice(common).map(() => ".."), ...to.slice(common)].join("/").length;
}

function resolvedTarget(targetRel: string, hostRel: string): PnwCadResolvedXlinkTarget {
  return {
    targetRel,
    status: targetRel === indexRelativePath(hostRel) ? "self" : "resolved",
    candidates: [],
  };
}

export function pnwResolveXlinkTarget(input: PnwCadXlinkTargetInput): PnwCadResolvedXlinkTarget {
  const hostRel = indexRelativePath(input.hostRel);
  const xlinkFile = String(input.xlinkFile || "").replace(/\\/g, "/").trim();
  const targetBasename = basename(xlinkFile);
  if (!targetBasename.toLowerCase().endsWith(".fcstd")) {
    return { targetRel: null, status: "non_fcstd", candidates: [] };
  }
  const directTarget = indexRelativePath(input.directTargetRel || "");
  if (directTarget) return resolvedTarget(directTarget, hostRel);

  const normalizedCandidates = [...new Set(input.candidateRels.map(indexRelativePath).filter(Boolean))];
  const existingSet = new Set(input.existingCandidateRels.map(indexRelativePath).filter(Boolean));
  let existing = normalizedCandidates.filter((candidate) => existingSet.has(candidate));
  if (existing.length === 1) return resolvedTarget(existing[0], hostRel);

  const documentDirectory = relativeDirectory(hostRel);
  const currentDirectory = freecadWorkspaceDirectory(documentDirectory);
  const inCurrent = existing.filter((candidate) => relativeDirectory(candidate) === currentDirectory);
  if (inCurrent.length === 1) return resolvedTarget(inCurrent[0], hostRel);
  if (inCurrent.length > 1) existing = inCurrent;

  const documentParts = relativeParts(documentDirectory);
  const projectVersion = documentParts.map((part) => /(\d{3})$/.exec(part)?.[1] || "").find(Boolean) || "";
  if (projectVersion && existing.length) {
    const sameVersion = existing.filter((candidate) => (
      new RegExp(`\\.${projectVersion}[-.]`).test(basename(candidate))
    ));
    if (sameVersion.length === 1) return resolvedTarget(sameVersion[0], hostRel);
    if (sameVersion.length) existing = sameVersion;
  }

  const documentMarkers = new Set(documentParts.filter((part) => /\d{3}$/.test(part)));
  if (documentMarkers.size && existing.length) {
    const sameProject = existing.filter((candidate) => (
      relativeParts(candidate).some((part) => documentMarkers.has(part))
    ));
    if (sameProject.length === 1) return resolvedTarget(sameProject[0], hostRel);
    if (sameProject.length) existing = sameProject;
  }

  if (!existing.length) {
    return { targetRel: null, status: "missing", candidates: normalizedCandidates.sort() };
  }
  if (existing.length > 1) {
    const best = [...existing].sort((left, right) => (
      relativeDistance(documentDirectory, left) - relativeDistance(documentDirectory, right)
    ))[0];
    return { targetRel: best, status: "ambiguous", candidates: [...existing].sort() };
  }
  return resolvedTarget(existing[0], hostRel);
}

export function pnwCadXlinkRuleLabel(
  asset: PnwCadXlinkTargetAsset | undefined,
  targetBase: string,
  targetRel: string | null,
): string {
  const label = clean(asset?.label);
  if (label) return label;
  const partNumber = clean(asset?.part_number);
  const partVersion = clean(asset?.part_version);
  const partName = clean(asset?.part_name);
  if (partNumber && partVersion) {
    return partName ? `${partNumber}.${partVersion}-${partName}` : `${partNumber}.${partVersion}`;
  }
  const filename = basename(targetBase || targetRel || "");
  for (const suffix of [".drawing.fcstd", ".assy.fcstd", ".fcstd"]) {
    if (filename.toLowerCase().endsWith(suffix)) return filename.slice(0, -suffix.length) || filename;
  }
  return filename;
}

const GRAPH_TARGET_STATUSES = new Set(["resolved", "ambiguous", "self"]);

export function pnwResolveIncomingXlinkHosts<T extends PnwCadGraphEdge>(
  edges: readonly T[],
  directRefs: readonly T[],
  targets: ReadonlySet<string>,
  transitive: boolean,
  limit: number,
): PnwCadIncomingHost<T>[] {
  const normalizedLimit = Math.max(0, Math.floor(limit));
  if (!transitive) {
    const hosts = new Map<string, PnwCadIncomingHost<T>>();
    for (const ref of directRefs) {
      const host = indexRelativePath(ref.host_repo_rel_path || "");
      if (!host) continue;
      if (!hosts.has(host)) hosts.set(host, {
        host_repo_rel_path: host,
        depth: 0,
        usage_kind: "direct",
        via_chain: [],
        direct_refs: [],
      });
      hosts.get(host)!.direct_refs.push(ref);
    }
    return [...hosts.values()].slice(0, normalizedLimit);
  }

  const parents = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!GRAPH_TARGET_STATUSES.has(String(edge.resolve_status || ""))) continue;
    const target = indexRelativePath(edge.target_repo_rel_path || "");
    const host = indexRelativePath(edge.host_repo_rel_path || "");
    if (!target || !host) continue;
    if (!parents.has(target)) parents.set(target, new Set());
    parents.get(target)!.add(host);
  }
  const refsForHost = (host: string): T[] => directRefs.filter((ref) => (
    indexRelativePath(ref.host_repo_rel_path || "") === indexRelativePath(host)
  ));
  const result: PnwCadIncomingHost<T>[] = [];
  const visited = new Set<string>();
  const queue: Array<{ host: string; depth: number; via_chain: string[] }> = [];
  for (const targetValue of targets) {
    const target = indexRelativePath(targetValue);
    for (const host of parents.get(target) || []) queue.push({ host, depth: 0, via_chain: [] });
  }
  while (queue.length && result.length < normalizedLimit) {
    const item = queue.shift()!;
    const host = indexRelativePath(item.host);
    if (!host || visited.has(host)) continue;
    visited.add(host);
    result.push({
      host_repo_rel_path: host,
      depth: item.depth,
      usage_kind: item.depth === 0 ? "direct" : "indirect",
      via_chain: item.via_chain,
      direct_refs: refsForHost(host),
    });
    for (const parent of parents.get(host) || []) {
      if (!visited.has(parent)) queue.push({
        host: parent,
        depth: item.depth + 1,
        via_chain: [host, ...item.via_chain],
      });
    }
  }
  return result;
}

function cadPartKey(partNumber: unknown, partVersion: unknown): string {
  const number = clean(partNumber);
  const version = clean(partVersion);
  return number && version ? `${number}.${version}` : "";
}

function cadFileRole(filename: string): "part" | "assembly" | "drawing" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".drawing.fcstd")) return "drawing";
  if (lower.endsWith(".assy.fcstd")) return "assembly";
  return "part";
}

export function pnwBuildAssemblyTreeFromXrefs(
  edges: readonly PnwCadGraphEdge[],
  hostRel: string,
  full = false,
): { node_count: number; nodes: PnwCadAssemblyTreeNode[] } {
  const hostKey = indexRelativePath(hostRel);
  const byHost = new Map<string, PnwCadGraphEdge[]>();
  for (const edge of edges) {
    const host = indexRelativePath(edge.host_repo_rel_path || "");
    if (!host) continue;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host)!.push(edge);
  }

  let nodeCount = 0;
  const build = (host: string, seen: ReadonlySet<string>): PnwCadAssemblyTreeNode[] => (
    (byHost.get(indexRelativePath(host)) || []).map((edge, index) => {
      const normalizedHost = indexRelativePath(host);
      const target = indexRelativePath(edge.target_repo_rel_path || "");
      const xlinkFile = clean(edge.xlink_file_attr);
      const targetBasename = clean(edge.target_basename) || basename(target || xlinkFile);
      const linkLabel = clean(edge.link_label);
      const canRecurse = Boolean(full && target && !seen.has(target) && byHost.has(target));
      nodeCount += 1;
      return {
        id: `${normalizedHost}::${xlinkFile || index}`,
        host_repo_rel: normalizedHost,
        repo_rel_path: target || "",
        basename: targetBasename,
        resolve_status: clean(edge.resolve_status) || "missing",
        xlink_file_attr: xlinkFile,
        part_number: clean(edge.target_part_number),
        part_version: clean(edge.target_part_version),
        part_key: cadPartKey(edge.target_part_number, edge.target_part_version),
        TypeCode: clean(edge.target_type_code),
        ModelSeries: clean(edge.target_model_series),
        PartName: clean(edge.target_part_name),
        label: clean(edge.target_asset_label),
        link_label: linkLabel,
        link_labels: linkLabel ? [linkLabel] : [],
        xref_instances: [{ xlink_file_attr: xlinkFile, link_label: linkLabel }],
        rule_label: clean(edge.rule_label),
        ref_count: 1,
        file_role: cadFileRole(targetBasename),
        children: canRecurse ? build(target, new Set([...seen, target])) : [],
      };
    })
  );
  const nodes = build(hostKey, new Set([hostKey]));
  return { node_count: nodeCount, nodes };
}
