export interface PnwGitIdentity {
  readonly name: string;
  readonly email: string;
  /** Git-compatible date including an explicit timezone. */
  readonly date: string;
}

/**
 * Commit fields needed by read-only history lists and message summaries.
 *
 * Unlike {@link PnwGitCommitRecord}, this deliberately omits tree, signature
 * and extra-header data used by history rewrite safety checks.
 */
export interface PnwGitCommitSummary {
  readonly oid: string;
  readonly author: PnwGitIdentity;
  readonly committer: PnwGitIdentity;
  readonly subject: string;
  readonly body: string;
}

export interface PnwGitCommitRecord extends PnwGitCommitSummary {
  readonly parentOids: readonly string[];
  readonly treeOid: string;
  readonly hasSignature: boolean;
  readonly extraHeaders: readonly string[];
}

export type PnwGitOperationState =
  | "idle"
  | "merge"
  | "rebase"
  | "cherry-pick"
  | "revert"
  | "bisect";

export interface PnwGitRefTarget {
  readonly name: string;
  readonly oid: string;
}
