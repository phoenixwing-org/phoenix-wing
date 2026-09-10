// SPDX-License-Identifier: Apache-2.0

import {
  pnwProjectGitCommitGraphRows,
  type PnwGitCommitGraphCommit,
  type PnwGitCommitGraphDecoration,
  type PnwGitCommitGraphRow,
} from "@phoenix-wing/git-core";
import { pnwRunGitCommand, type PnwGitCommandOptions } from "./git-runner.js";
import {
  pnwCanonicalGitRoot,
  pnwGitReadCommandOptions,
  pnwNormalizeFullGitOid,
  pnwParseGitLogIdentity,
  pnwValidateGitReadLimit,
} from "./read-utils.js";

// Version 1 used topo-order. Its skip/lane state cannot continue a date-order walk.
export const PNW_GIT_COMMIT_GRAPH_CURSOR_VERSION = 2;

export type PnwGitCommitGraphRefsScope =
  | "head"
  | "local-branches"
  | "local-branches-and-tags";

export interface PnwGitCommitGraphPageReadOptions {
  /** Optional on the first page; all continuation cursors always guard the observed HEAD. */
  readonly expectedHeadOid?: string;
  /** Opaque cursor returned by nextBeforeCursor. Never construct or edit it in a consumer. */
  readonly beforeCursor?: string;
  /** Maximum commits returned. Defaults to 5; accepted range is 1..1000. */
  readonly limit?: number;
  /** Revisions included in the graph walk. Defaults to local-branches. */
  readonly refsScope?: PnwGitCommitGraphRefsScope;
  readonly gitExecutable?: string;
  readonly signal?: AbortSignal;
}

export interface PnwGitCommitGraphPage {
  readonly root: string;
  readonly headOid: string;
  readonly refsScope: PnwGitCommitGraphRefsScope;
  /** Committer-date order across branches, with every child before its parents. */
  readonly commits: readonly PnwGitCommitGraphCommit[];
  /** Pure lane projection aligned one-to-one with commits. */
  readonly graphRows: readonly PnwGitCommitGraphRow[];
  readonly nextBeforeCursor?: string;
  readonly hasMore: boolean;
}

interface PnwGitCommitGraphCursorPayload {
  readonly version: typeof PNW_GIT_COMMIT_GRAPH_CURSOR_VERSION;
  readonly expectedHeadOid: string;
  readonly refsScope: PnwGitCommitGraphRefsScope;
  readonly revisionOids: readonly string[];
  readonly skip: number;
  readonly laneOids: readonly string[];
}

const PNW_GIT_GRAPH_LOG_FORMAT = "%H%x00%P%x00%an%x00%ae%x00%at%x00%ai%x00%cn%x00%ce%x00%ct%x00%ci%x00%s%x00%(decorate:prefix=,suffix=,separator=%x1f,tag=tag:%x20)";
const PNW_GIT_GRAPH_LOG_FIELD_COUNT = 12;
const PNW_GIT_GRAPH_CURSOR_MAX_LENGTH = 512 * 1024;
const PNW_GIT_GRAPH_CURSOR_MAX_OIDS = 4_096;

/**
 * Reads one bounded commit graph page without status, checkout, full snapshots or per-commit spawns.
 */
export async function pnwReadGitCommitGraphPage(
  startPath: string,
  options: PnwGitCommitGraphPageReadOptions = {},
): Promise<PnwGitCommitGraphPage> {
  const limit = pnwValidateGitReadLimit(options.limit ?? 5, "limit");
  const requestedHeadOid = options.expectedHeadOid === undefined
    ? undefined
    : pnwNormalizeFullGitOid(options.expectedHeadOid, "expectedHeadOid");
  const root = await pnwCanonicalGitRoot(startPath, options.gitExecutable, options.signal);
  const commandOptions = pnwGitReadCommandOptions(root, options.gitExecutable, options.signal);
  const headOid = pnwNormalizeFullGitOid(
    (await pnwRunGitCommand(["rev-parse", "--verify", "HEAD"], commandOptions)).stdout.trim(),
    "HEAD",
  );

  const cursor = options.beforeCursor === undefined
    ? undefined
    : pnwDecodeGitCommitGraphCursor(options.beforeCursor);
  const expectedHeadOid = cursor?.expectedHeadOid ?? requestedHeadOid ?? headOid;
  if (requestedHeadOid && cursor && requestedHeadOid !== cursor.expectedHeadOid) {
    throw new Error("Git commit graph cursor does not match expectedHeadOid");
  }
  if (headOid !== expectedHeadOid) {
    throw new Error(`Git HEAD changed: expected ${expectedHeadOid}, got ${headOid}`);
  }

  const refsScope = cursor?.refsScope ?? options.refsScope ?? "local-branches";
  pnwAssertGitCommitGraphRefsScope(refsScope);
  if (cursor && options.refsScope && options.refsScope !== cursor.refsScope) {
    throw new Error("Git commit graph cursor does not match refsScope");
  }

  const revisionOids = cursor?.revisionOids
    ?? await pnwReadGitCommitGraphRevisionOids(commandOptions, headOid, refsScope);
  const skip = cursor?.skip ?? 0;
  const candidates = await pnwReadGitCommitGraphCommits(
    commandOptions,
    revisionOids,
    skip,
    limit + 1,
  );
  const hasMore = candidates.length > limit;
  const commits = candidates.slice(0, limit);
  const projection = pnwProjectGitCommitGraphRows(commits, cursor?.laneOids ?? []);
  const nextBeforeCursor = hasMore
    ? pnwEncodeGitCommitGraphCursor({
      version: PNW_GIT_COMMIT_GRAPH_CURSOR_VERSION,
      expectedHeadOid,
      refsScope,
      revisionOids,
      skip: skip + commits.length,
      laneOids: projection.nextLaneOids,
    })
    : undefined;

  return {
    root,
    headOid,
    refsScope,
    commits,
    graphRows: projection.rows,
    ...(nextBeforeCursor ? { nextBeforeCursor } : {}),
    hasMore,
  };
}

async function pnwReadGitCommitGraphRevisionOids(
  options: PnwGitCommandOptions,
  headOid: string,
  refsScope: PnwGitCommitGraphRefsScope,
): Promise<readonly string[]> {
  if (refsScope === "head") return [headOid];
  const prefixes = refsScope === "local-branches-and-tags"
    ? ["refs/heads", "refs/tags"]
    : ["refs/heads"];
  const result = await pnwRunGitCommand([
    "for-each-ref",
    "--sort=refname",
    "--format=%(objecttype)%09%(objectname)%09%(*objecttype)%09%(*objectname)",
    ...prefixes,
  ], options);
  const refOids = result.stdout.split(/\r?\n/u).filter(Boolean).flatMap((line) => {
    const [objectType, objectOid, peeledType, peeledOid] = line.split("\t");
    const oid = objectType === "commit"
      ? objectOid
      : peeledType === "commit"
        ? peeledOid
        : undefined;
    return oid ? [pnwNormalizeFullGitOid(oid, "graph revision oid")] : [];
  });
  const revisionOids = [...new Set([headOid, ...refOids])];
  if (revisionOids.length > PNW_GIT_GRAPH_CURSOR_MAX_OIDS) {
    throw new Error(`Git commit graph refs exceed ${PNW_GIT_GRAPH_CURSOR_MAX_OIDS} tips`);
  }
  return revisionOids;
}

async function pnwReadGitCommitGraphCommits(
  options: PnwGitCommandOptions,
  revisionOids: readonly string[],
  skip: number,
  limit: number,
): Promise<readonly PnwGitCommitGraphCommit[]> {
  const result = await pnwRunGitCommand([
    "log",
    "--no-color",
    "--no-show-signature",
    "--date-order",
    "--decorate=full",
    "--decorate-refs=HEAD",
    "--decorate-refs=refs/heads/*",
    "--decorate-refs=refs/tags/*",
    `--max-count=${limit}`,
    ...(skip > 0 ? [`--skip=${skip}`] : []),
    "-z",
    `--format=${PNW_GIT_GRAPH_LOG_FORMAT}`,
    ...revisionOids,
    "--",
  ], options);
  return pnwParseGitCommitGraphCommits(result.stdout);
}

function pnwParseGitCommitGraphCommits(output: string): readonly PnwGitCommitGraphCommit[] {
  if (output.length === 0) return [];
  const fields = output.split("\0");
  if (fields.at(-1) === "") fields.pop();
  if (fields.length % PNW_GIT_GRAPH_LOG_FIELD_COUNT !== 0) {
    throw new Error(`Unexpected NUL-delimited git graph output: ${fields.length} fields`);
  }
  const commits: PnwGitCommitGraphCommit[] = [];
  for (let offset = 0; offset < fields.length; offset += PNW_GIT_GRAPH_LOG_FIELD_COUNT) {
    const [oid, parents, authorName, authorEmail, authorTime, authorDate, committerName,
      committerEmail, committerTime, committerDate, subject, decorations] = fields.slice(
      offset,
      offset + PNW_GIT_GRAPH_LOG_FIELD_COUNT,
    );
    commits.push({
      oid: pnwNormalizeFullGitOid(oid!, "graph commit oid"),
      parentOids: parents ? parents.split(" ").map((parent) => pnwNormalizeFullGitOid(parent, "graph parent oid")) : [],
      author: pnwParseGitLogIdentity(authorName!, authorEmail!, authorTime!, authorDate!),
      committer: pnwParseGitLogIdentity(committerName!, committerEmail!, committerTime!, committerDate!),
      subject: subject!,
      decorations: pnwParseGitCommitGraphDecorations(decorations!),
    });
  }
  return commits;
}

function pnwParseGitCommitGraphDecorations(value: string): readonly PnwGitCommitGraphDecoration[] {
  const parsed: PnwGitCommitGraphDecoration[] = [];
  const names = value ? value.split("\x1f") : [];
  const add = (decoration: PnwGitCommitGraphDecoration) => {
    if (!parsed.some(({ name }) => name === decoration.name)) parsed.push(decoration);
  };
  for (const name of names) {
    if (name === "HEAD") {
      add({ name: "HEAD", displayName: "HEAD", kind: "head" });
      continue;
    }
    if (name.startsWith("HEAD -> ")) {
      add({ name: "HEAD", displayName: "HEAD", kind: "head" });
      pnwAddGitCommitGraphRefDecoration(add, name.slice("HEAD -> ".length));
      continue;
    }
    pnwAddGitCommitGraphRefDecoration(add, name);
  }
  return parsed;
}

function pnwAddGitCommitGraphRefDecoration(
  add: (decoration: PnwGitCommitGraphDecoration) => void,
  decoratedName: string,
): void {
  const name = decoratedName.startsWith("tag: ")
    ? decoratedName.slice("tag: ".length)
    : decoratedName;
  if (name.startsWith("refs/heads/")) {
    add({ name, displayName: name.slice("refs/heads/".length), kind: "local-branch" });
  } else if (name.startsWith("refs/tags/")) {
    add({ name, displayName: name.slice("refs/tags/".length), kind: "tag" });
  }
}

function pnwEncodeGitCommitGraphCursor(payload: PnwGitCommitGraphCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function pnwDecodeGitCommitGraphCursor(cursor: string): PnwGitCommitGraphCursorPayload {
  try {
    if (!cursor || cursor.length > PNW_GIT_GRAPH_CURSOR_MAX_LENGTH || !/^[A-Za-z0-9_-]+$/u.test(cursor)) {
      throw new Error("invalid encoding");
    }
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<PnwGitCommitGraphCursorPayload>;
    if (value.version !== PNW_GIT_COMMIT_GRAPH_CURSOR_VERSION) throw new Error("unsupported version");
    const expectedHeadOid = pnwNormalizeFullGitOid(String(value.expectedHeadOid ?? ""), "cursor HEAD");
    pnwAssertGitCommitGraphRefsScope(value.refsScope);
    if (!Array.isArray(value.revisionOids) || !value.revisionOids.length
      || value.revisionOids.length > PNW_GIT_GRAPH_CURSOR_MAX_OIDS) {
      throw new Error("invalid revisions");
    }
    if (!Array.isArray(value.laneOids) || value.laneOids.length > PNW_GIT_GRAPH_CURSOR_MAX_OIDS) {
      throw new Error("invalid lanes");
    }
    if (!Number.isSafeInteger(value.skip) || Number(value.skip) < 1) throw new Error("invalid skip");
    return {
      version: PNW_GIT_COMMIT_GRAPH_CURSOR_VERSION,
      expectedHeadOid,
      refsScope: value.refsScope,
      revisionOids: value.revisionOids.map((oid) => pnwNormalizeFullGitOid(String(oid), "cursor revision oid")),
      skip: Number(value.skip),
      laneOids: value.laneOids.map((oid) => pnwNormalizeFullGitOid(String(oid), "cursor lane oid")),
    };
  } catch (error) {
    throw new Error("Invalid Git commit graph cursor", { cause: error });
  }
}

function pnwAssertGitCommitGraphRefsScope(
  value: unknown,
): asserts value is PnwGitCommitGraphRefsScope {
  if (value !== "head" && value !== "local-branches" && value !== "local-branches-and-tags") {
    throw new Error(`Unsupported Git commit graph refsScope: ${String(value)}`);
  }
}
