import type { PnwGitCommitSummary } from "./types.js";

export interface PnwGitGroupSummaryInput {
  /** Retained for host compatibility; group lines use the Git ref, not a local directory name. */
  readonly repositoryName: string;
  readonly branch?: string;
  readonly upstream?: string;
  readonly commit: PnwGitCommitSummary;
  readonly visibleOids?: readonly string[];
  /** @deprecated Repository directory names are no longer optional summary content. */
  readonly includeRepositoryContext?: boolean;
  /** Append the committer time to the first line. Defaults to false. */
  readonly includeCommitTime?: boolean;
  /** Prefix the effective reviewer with @. Defaults to true. */
  readonly mentionReviewer?: boolean;
  /** Used only when neither an inline reviewer nor a Reviewed-by trailer exists. */
  readonly fallbackReviewer?: string;
}

export interface PnwGitGroupSummary {
  readonly text: string;
  readonly shortOid: string;
  readonly referenceLabel: string;
  readonly reviewer?: string;
}

export interface PnwGitGroupSummariesInput extends Omit<PnwGitGroupSummaryInput, "commit" | "includeRepositoryContext"> {
  readonly commits: readonly PnwGitCommitSummary[];
  readonly remoteUrl?: string;
  readonly includeRemoteUrl?: boolean;
}

export interface PnwGitGroupSummaries {
  readonly text: string;
  readonly summaries: readonly PnwGitGroupSummary[];
}

export function pnwShortestUniqueGitOid(
  oid: string,
  visibleOids: readonly string[] = [],
  minimumLength = 7,
): string {
  const normalized = normalizeOid(oid);
  const candidates = visibleOids.map(normalizeOid).filter((candidate) => candidate !== normalized);
  const lowerBound = Math.min(Math.max(1, minimumLength), normalized.length);
  for (let length = lowerBound; length < normalized.length; length += 1) {
    const prefix = normalized.slice(0, length);
    if (!candidates.some((candidate) => candidate.startsWith(prefix))) return prefix;
  }
  return normalized;
}

export function pnwFormatGitGroupSummary(input: PnwGitGroupSummaryInput): PnwGitGroupSummary {
  const shortOid = pnwShortestUniqueGitOid(input.commit.oid, input.visibleOids);
  const referenceLabel = input.upstream?.trim()
    || (input.branch?.trim() ? `local/${input.branch.trim()}` : `detached/${shortOid}`);
  const inline = extractInlineReviewer(input.commit.subject);
  const trailer = inline ? undefined : extractReviewedByTrailer(input.commit.body);
  const fallback = normalizeReviewer(input.fallbackReviewer);
  const reviewer = inline?.reviewer ?? trailer ?? fallback;
  const reviewerLabel = reviewer ? `${input.mentionReviewer === false ? "" : "@"}${reviewer}` : undefined;
  const subject = inline
    ? `${input.commit.subject.slice(0, inline.start)}审查：${reviewerLabel}${input.commit.subject.slice(inline.end)}`
    : reviewerLabel ? `${input.commit.subject} 审查：${reviewerLabel}` : input.commit.subject;
  const body = normalizeCommitBody(input.commit.body);
  const message = body ? `${subject.trim()}\n\n${body}` : subject.trim();
  const repository = input.includeRepositoryContext === false ? "" : `${input.repositoryName.trim()} `;
  const time = input.includeCommitTime === true ? ` · ${formatCommitTime(input.commit.committer.date)}` : "";
  return {
    text: `${repository}${referenceLabel} **Commit:** ${shortOid} ++${time}\n${message}`,
    shortOid,
    referenceLabel,
    ...(reviewer ? { reviewer } : {}),
  };
}

function normalizeCommitBody(value: string): string {
  return value.replace(/\r\n?/gu, "\n").trim();
}

export function pnwFormatGitGroupSummaries(input: PnwGitGroupSummariesInput): PnwGitGroupSummaries {
  if (input.commits.length === 0) throw new Error("At least one Git commit is required");
  const remoteUrl = input.includeRemoteUrl === true ? normalizeRemoteUrl(input.remoteUrl) : undefined;
  const summaries = input.commits.map((commit) => pnwFormatGitGroupSummary({
    repositoryName: input.repositoryName,
    ...(input.branch ? { branch: input.branch } : {}),
    ...(input.upstream ? { upstream: input.upstream } : {}),
    commit,
    ...(input.visibleOids ? { visibleOids: input.visibleOids } : {}),
    includeRepositoryContext: !remoteUrl,
    ...(input.includeCommitTime !== undefined ? { includeCommitTime: input.includeCommitTime } : {}),
    ...(input.mentionReviewer !== undefined ? { mentionReviewer: input.mentionReviewer } : {}),
    ...(input.fallbackReviewer !== undefined ? { fallbackReviewer: input.fallbackReviewer } : {}),
  }));
  return {
    text: [remoteUrl, ...summaries.map((summary) => summary.text)].filter(Boolean).join("\n"),
    summaries,
  };
}

function normalizeRemoteUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (normalized.length > 2048 || /[\r\n]/u.test(normalized)) throw new Error("Invalid Git remote URL");
  return normalized;
}

function formatCommitTime(value: string): string {
  const raw = /^(\d+) ([+-])(\d{2})(\d{2})$/u.exec(value.trim());
  if (raw) {
    const offsetMinutes = (Number(raw[3]) * 60 + Number(raw[4])) * (raw[2] === "-" ? -1 : 1);
    const local = new Date(Number(raw[1]) * 1_000 + offsetMinutes * 60_000);
    return local.toISOString().slice(0, 16).replace("T", " ");
  }
  const iso = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?([+-]\d{2}:?\d{2}|Z)$/u.exec(value.trim());
  if (iso) {
    return `${iso[1]} ${iso[2]}`;
  }
  return value.trim();
}

function normalizeReviewer(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/^@+/u, "");
  if (!normalized) return undefined;
  if (normalized.length > 80 || /[\r\n<>]/u.test(normalized)) throw new Error("Invalid fallback Git reviewer");
  return normalized;
}

function normalizeOid(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{4,128}$/u.test(normalized)) throw new Error(`Invalid Git object id: ${value}`);
  return normalized;
}

function extractInlineReviewer(subject: string): { reviewer: string; start: number; end: number } | undefined {
  const match = /审查\s*[：:]\s*@?([^\s,，;；]+)/u.exec(subject);
  if (!match || match.index === undefined) return undefined;
  const reviewer = match[1]?.trim();
  if (!reviewer) return undefined;
  return { reviewer, start: match.index, end: match.index + match[0].length };
}

function extractReviewedByTrailer(body: string): string | undefined {
  for (const line of body.split(/\r?\n/u)) {
    const match = /^Reviewed-by:\s*@?(.+?)(?:\s*<[^>]+>)?\s*$/iu.exec(line.trim());
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}
