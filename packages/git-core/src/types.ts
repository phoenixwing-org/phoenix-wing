export interface PnwGitIdentity {
  readonly name: string;
  readonly email: string;
  /** Git-compatible date including an explicit timezone. */
  readonly date: string;
}

export interface PnwGitCommitRecord {
  readonly oid: string;
  readonly parentOids: readonly string[];
  readonly treeOid: string;
  readonly author: PnwGitIdentity;
  readonly committer: PnwGitIdentity;
  readonly subject: string;
  readonly body: string;
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
