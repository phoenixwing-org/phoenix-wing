export type PnwRunPlatform = "win32" | "darwin" | "linux";
export type PnwRunProjectKind = "caa" | "cmake-cpp" | "generic";
export type PnwRunSourceKind =
  | "native-task"
  | "imported-task"
  | "configured"
  | "project-script"
  | "bundled"
  | "executable";
export type PnwRunAction =
  | "caa-build"
  | "caa-run"
  | "cmake-configure"
  | "cmake-build"
  | "cmake-test"
  | "cmake-clean"
  | "clang-format"
  | "task"
  | "script"
  | "executable";
export type PnwRunMatcherFidelity = "native" | "named" | "degraded" | "none";
export type PnwRunRisk = "normal" | "review" | "high";

export interface PnwRunProjectEvidence {
  readonly path: string;
  readonly kind: Exclude<PnwRunProjectKind, "generic">;
  readonly weight: number;
  readonly reason: string;
}

export interface PnwRunProject {
  readonly id: string;
  readonly workspaceFolderUri: string;
  readonly rootUri: string;
  readonly relativePath: string;
  readonly label: string;
  readonly kinds: readonly PnwRunProjectKind[];
  readonly evidence: readonly PnwRunProjectEvidence[];
}

export interface PnwRunTarget {
  readonly id: string;
  readonly projectId: string;
  readonly label: string;
  readonly action: PnwRunAction;
  readonly sourceKind: PnwRunSourceKind;
  readonly sourceUri?: string;
  readonly platforms: readonly PnwRunPlatform[];
  readonly cwd: string;
  readonly program?: string;
  readonly args: readonly string[];
  readonly envKeys: readonly string[];
  readonly problemMatchers: readonly string[];
  readonly matcherFidelity: PnwRunMatcherFidelity;
  readonly risk: PnwRunRisk;
  readonly priority: number;
  readonly disabledReason?: string;
}

export interface PnwRunLogicalTarget {
  readonly projectId: string;
  readonly action: PnwRunAction;
  readonly recommended: PnwRunTarget;
  readonly alternatives: readonly PnwRunTarget[];
}
