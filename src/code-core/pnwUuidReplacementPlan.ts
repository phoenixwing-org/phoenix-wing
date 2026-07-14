import { pnwFindUuidOccurrences, pnwFormatUuidForTemplate, pnwIsUuid, pnwNormalizeUuid, type PnwUuidKind } from "./pnwUuid.js";

export type PnwUuidReplacementStrategy = "map_per_value" | "fresh_per_hit";

/** A text snapshot supplied by a host; `id` is opaque and safe to serialize. */
export type PnwUuidPlanFile = {
  readonly id: string;
  readonly text: string;
};

export type PnwUuidReplacementPlanOptions = {
  readonly strategy?: PnwUuidReplacementStrategy;
  /** Host-owned UUID source (for example VS Code's Node crypto); never serialized in the result. */
  readonly createUuid: () => string;
};

export type PnwUuidReplacementPlanHit = {
  readonly id: string;
  readonly groupId: string;
  readonly fileId: string;
  readonly offset: number;
  readonly length: number;
  readonly line: number;
  readonly column: number;
  readonly kind: PnwUuidKind;
  readonly from: string;
  readonly normalized: string;
  readonly to: string;
  readonly formattedTo: string;
};

export type PnwUuidReplacementPlanGroup = {
  readonly id: string;
  readonly from: string;
  readonly normalized: string;
  readonly to: string;
  readonly hitIds: readonly string[];
};

/** JSON-safe preview used by all hosts before they choose hits and write files. */
export type PnwUuidReplacementPlan = {
  readonly version: 1;
  readonly valid: boolean;
  readonly strategy: PnwUuidReplacementStrategy;
  readonly groups: readonly PnwUuidReplacementPlanGroup[];
  readonly hits: readonly PnwUuidReplacementPlanHit[];
  readonly diagnostics: readonly string[];
};

export type PnwUuidPlanApplyResult = {
  readonly text: string;
  readonly appliedHitIds: readonly string[];
  readonly skippedHitIds: readonly string[];
  readonly diagnostics: readonly string[];
};

/**
 * Plans UUID replacements from immutable text snapshots. It never reads files or
 * generates bytes itself: the host supplies the UUID generator and later checks
 * its snapshot before calling `pnwApplyUuidReplacementPlan`.
 */
export function pnwPlanUuidReplacements(
  files: readonly PnwUuidPlanFile[],
  options: PnwUuidReplacementPlanOptions,
): PnwUuidReplacementPlan {
  const strategy = options.strategy ?? "map_per_value";
  const diagnostics: string[] = [];
  if (strategy !== "map_per_value" && strategy !== "fresh_per_hit") diagnostics.push("不支持的 UUID 替换策略");
  if (files.some((file) => !file.id)) diagnostics.push("UUID 计划文件 id 不能为空");
  if (new Set(files.map((file) => file.id)).size !== files.length) diagnostics.push("UUID 计划文件 id 必须唯一");
  if (diagnostics.length) return pnwEmptyUuidPlan(strategy, diagnostics);

  const sourceValues = new Set(files.flatMap((file) => pnwFindUuidOccurrences(file.text).map((hit) => hit.normalized)));
  const usedTargets = new Set(sourceValues);
  const targetsByIdentity = new Map<string, string>();
  const groups = new Map<string, { from: string; normalized: string; to: string; hitIds: string[] }>();
  const hits: PnwUuidReplacementPlanHit[] = [];
  for (const file of files) {
    for (const occurrence of pnwFindUuidOccurrences(file.text)) {
      const hitId = `${file.id}:${occurrence.offset}:${occurrence.kind}`;
      const identity = strategy === "map_per_value" ? occurrence.normalized : hitId;
      let to = targetsByIdentity.get(identity);
      if (!to) {
        to = pnwNextUuid(options.createUuid, usedTargets, diagnostics);
        if (!to) return pnwEmptyUuidPlan(strategy, diagnostics);
        targetsByIdentity.set(identity, to);
      }
      const groupId = strategy === "map_per_value" ? `value:${occurrence.normalized}` : `hit:${hitId}`;
      const group = groups.get(groupId) ?? { from: occurrence.value, normalized: occurrence.normalized, to, hitIds: [] };
      group.hitIds.push(hitId);
      groups.set(groupId, group);
      hits.push({
        id: hitId,
        groupId,
        fileId: file.id,
        offset: occurrence.offset,
        length: occurrence.value.length,
        line: occurrence.line,
        column: occurrence.column,
        kind: occurrence.kind,
        from: occurrence.value,
        normalized: occurrence.normalized,
        to,
        formattedTo: pnwFormatUuidForTemplate(occurrence.value, to),
      });
    }
  }
  return {
    version: 1,
    valid: true,
    strategy,
    groups: [...groups.entries()].map(([id, group]) => ({ id, ...group })),
    hits,
    diagnostics,
  };
}

/** Applies selected planned hits to one unchanged text snapshot without any filesystem effect. */
export function pnwApplyUuidReplacementPlan(
  text: string,
  fileId: string,
  plan: PnwUuidReplacementPlan,
  selectedHitIds?: ReadonlySet<string>,
): PnwUuidPlanApplyResult {
  if (!plan.valid) return { text, appliedHitIds: [], skippedHitIds: [], diagnostics: [...plan.diagnostics] };
  const hits = plan.hits.filter((hit) => hit.fileId === fileId && (!selectedHitIds || selectedHitIds.has(hit.id)));
  const diagnostics: string[] = [];
  const skippedHitIds: string[] = [];
  const applicable = hits.filter((hit) => {
    const matches = text.slice(hit.offset, hit.offset + hit.length) === hit.from;
    if (!matches) {
      skippedHitIds.push(hit.id);
      diagnostics.push(`命中已变化，跳过：${hit.id}`);
    }
    return matches;
  });
  let output = text;
  for (const hit of [...applicable].sort((left, right) => right.offset - left.offset)) {
    output = output.slice(0, hit.offset) + hit.formattedTo + output.slice(hit.offset + hit.length);
  }
  return { text: output, appliedHitIds: applicable.map((hit) => hit.id), skippedHitIds, diagnostics };
}

function pnwEmptyUuidPlan(strategy: PnwUuidReplacementStrategy, diagnostics: readonly string[]): PnwUuidReplacementPlan {
  return { version: 1, valid: false, strategy, groups: [], hits: [], diagnostics };
}

function pnwNextUuid(createUuid: () => string, used: Set<string>, diagnostics: string[]): string | undefined {
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const value = createUuid();
    if (!pnwIsUuid(value)) continue;
    const normalized = pnwNormalizeUuid(value);
    if (used.has(normalized)) continue;
    used.add(normalized);
    return value;
  }
  diagnostics.push("无法生成不与扫描值冲突的 UUID");
  return undefined;
}
