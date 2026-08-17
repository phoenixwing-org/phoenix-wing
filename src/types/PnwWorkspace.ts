export type PnwWorkspaceCapability =
  | "read"
  | "write"
  | "watch"
  | "database"
  | "native-directory-picker";

export type PnwWorkspaceAvailability =
  | "available"
  | "missing"
  | "unauthorized"
  | "unknown";

export type PnwWorkspacePhase =
  | "closed"
  | "opening"
  | "open"
  | "preparing-switch"
  | "opening-target"
  | "preparing-close";

export type PnwWorkspaceTransitionKind = "open" | "switch" | "close";

/**
 * Workspace 对工作台入口的约束。
 *
 * - required：没有当前 Workspace 时只能停留在 Welcome；
 * - optional：Host 可显式允许用户在没有 Workspace 时进入 Workbench。
 */
export type PnwWorkspaceEntryPolicy = "required" | "optional";

/** Welcome 与实际 Workbench 的受控呈现模式。 */
export type PnwWorkspaceGateMode = "welcome" | "workbench";

/** Workspace 生命周期动作在 Welcome 外壳中的投影位置。 */
export type PnwWorkspaceGateActionPlacement = "auto" | "rail" | "head" | "none";

export type PnwBuiltinWorkspaceTypeId = "mixed" | "code" | "cad" | "lighting";

/** Workspace 类型仅描述 Host 的分类意图，不触发目录扫描或权限判断。 */
export interface PnwWorkspaceTypeDefinition {
  readonly typeId: string;
  readonly label: string;
  /** 省略时排在所有显式顺序之后；数值越小越靠前。 */
  readonly order?: number;
  readonly builtin?: boolean;
}

export interface PnwWorkspaceGateResolution {
  readonly mode: PnwWorkspaceGateMode;
  readonly requestedMode: PnwWorkspaceGateMode;
  readonly policy: PnwWorkspaceEntryPolicy;
  readonly hasWorkspace: boolean;
  readonly canEnterWorkbench: boolean;
  readonly canReturnToWorkbench: boolean;
  readonly forcedWelcome: boolean;
}

export type PnwWorkspaceErrorCode =
  | "cancelled"
  | "unsupported"
  | "invalid-request"
  | "invalid-descriptor"
  | "workspace-mismatch"
  | "participant-rejected"
  | "host-failure"
  | "participant-failure"
  | "subscriber-failure"
  | "recent-store-failure"
  | "invalid-relative-path"
  | "readonly"
  | "superseded";

export interface PnwWorkspaceDescriptor {
  readonly workspaceId: string;
  readonly workspaceTypeId?: string;
  readonly name: string;
  /** Host 校验并 canonicalize 后的真实绝对目录。仅用于显示和 Host 身份，不可绕过 Host 直接读写。 */
  readonly rootPath: string;
  readonly rootUri?: string;
  readonly readonly: boolean;
  readonly capabilities: readonly PnwWorkspaceCapability[];
}

export interface PnwRecentWorkspaceEntry {
  readonly workspaceId: string;
  readonly workspaceTypeId?: string;
  readonly rootPath: string;
  readonly name: string;
  readonly availability: PnwWorkspaceAvailability;
  readonly lastOpenedAt?: string;
}

export interface PnwWorkspaceFailure {
  readonly code: PnwWorkspaceErrorCode;
  readonly message: string;
  readonly participantId?: string;
}

export interface PnwWorkspaceState {
  readonly current?: PnwWorkspaceDescriptor;
  readonly recent: readonly PnwRecentWorkspaceEntry[];
  readonly phase: PnwWorkspacePhase;
  readonly revision: number;
  readonly pendingRootPath?: string;
  readonly error?: PnwWorkspaceFailure;
}

export interface PnwWorkspacePickRequest {
  readonly title?: string;
  readonly signal?: AbortSignal;
}

export type PnwWorkspacePickResult =
  | { readonly status: "selected"; readonly rootPath: string }
  | { readonly status: "cancelled" };

export interface PnwWorkspaceOpenRequest {
  /** 省略时必须由 Host 的目录选择器获得，纯 Web 不得自行伪造本机绝对路径。 */
  readonly rootPath?: string;
  readonly source?: "directory-picker" | "path" | "recent";
  readonly expectedWorkspaceId?: string;
  readonly title?: string;
  readonly signal?: AbortSignal;
}

export interface PnwWorkspaceCloseRequest {
  readonly signal?: AbortSignal;
}

export interface PnwWorkspaceHostOpenRequest {
  readonly rootPath: string;
  readonly expectedWorkspaceId?: string;
  readonly signal?: AbortSignal;
}

export interface PnwWorkspaceValidation {
  readonly availability: PnwWorkspaceAvailability;
  readonly descriptor?: PnwWorkspaceDescriptor;
  readonly message?: string;
}

export interface PnwWorkspaceHostAdapter {
  readonly pickDirectory?: (request: PnwWorkspacePickRequest) => Promise<PnwWorkspacePickResult>;
  readonly open: (request: PnwWorkspaceHostOpenRequest) => Promise<PnwWorkspaceDescriptor>;
  readonly close?: (workspace: PnwWorkspaceDescriptor, signal?: AbortSignal) => Promise<void>;
  readonly validate?: (
    workspace: PnwWorkspaceDescriptor,
    signal?: AbortSignal,
  ) => Promise<PnwWorkspaceValidation>;
}

export interface PnwWorkspaceTransitionContext {
  readonly kind: PnwWorkspaceTransitionKind;
  readonly revision: number;
  readonly current?: PnwWorkspaceDescriptor;
  readonly target?: PnwWorkspaceDescriptor;
  readonly targetRootPath?: string;
  readonly signal: AbortSignal;
}

export interface PnwWorkspaceTransitionVote {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface PnwWorkspaceLifecycleParticipant {
  readonly id: string;
  /** 只能预检或暂存；不得在 prepare 中不可逆释放当前 Workspace。 */
  readonly prepare?: (
    context: PnwWorkspaceTransitionContext,
  ) => Promise<PnwWorkspaceTransitionVote | void>;
  /** 提交 session、watcher、数据库和任务等工作空间资源切换。 */
  readonly commit?: (context: PnwWorkspaceTransitionContext) => Promise<void>;
  /** prepare/commit/Host 失败时幂等恢复；按参与者逆序调用。 */
  readonly rollback?: (context: PnwWorkspaceTransitionContext) => Promise<void>;
}

export interface PnwRecentWorkspaceStore {
  readonly load: () => Promise<readonly PnwRecentWorkspaceEntry[]>;
  readonly save: (entries: readonly PnwRecentWorkspaceEntry[]) => Promise<void>;
}

export type PnwWorkspaceTransitionStatus =
  | "opened"
  | "switched"
  | "closed"
  | "unchanged"
  | "cancelled"
  | "superseded"
  | "rejected";

export interface PnwWorkspaceTransitionResult {
  readonly status: PnwWorkspaceTransitionStatus;
  readonly workspace?: PnwWorkspaceDescriptor;
  readonly previous?: PnwWorkspaceDescriptor;
  readonly error?: PnwWorkspaceFailure;
}

export interface PnwWorkspaceControllerOptions {
  readonly host: PnwWorkspaceHostAdapter;
  readonly participants?: readonly PnwWorkspaceLifecycleParticipant[];
  readonly recentStore?: PnwRecentWorkspaceStore;
  readonly recentLimit?: number;
  readonly now?: () => Date;
  readonly onError?: (error: PnwWorkspaceFailure) => void;
}

export interface PnwWorkspaceController {
  readonly getSnapshot: () => PnwWorkspaceState;
  readonly subscribe: (listener: (state: PnwWorkspaceState) => void) => () => void;
  readonly initialize: () => Promise<PnwWorkspaceState>;
  readonly requestOpen: (request?: PnwWorkspaceOpenRequest) => Promise<PnwWorkspaceTransitionResult>;
  readonly requestSwitch: (request: PnwWorkspaceOpenRequest) => Promise<PnwWorkspaceTransitionResult>;
  readonly requestClose: (request?: PnwWorkspaceCloseRequest) => Promise<PnwWorkspaceTransitionResult>;
  readonly removeRecent: (workspaceId: string) => Promise<readonly PnwRecentWorkspaceEntry[]>;
  readonly markRecentAvailability: (
    workspaceId: string,
    availability: PnwWorkspaceAvailability,
  ) => Promise<readonly PnwRecentWorkspaceEntry[]>;
}

export interface PnwWorkspaceResourceRef {
  readonly workspace: PnwWorkspaceDescriptor;
  readonly relativePath: string;
}

export interface PnwWorkspaceResourceReadRequest extends PnwWorkspaceResourceRef {
  readonly format?: "text" | "bytes";
  readonly signal?: AbortSignal;
}

export interface PnwWorkspaceResourceReadResult {
  readonly relativePath: string;
  readonly data: string | Uint8Array;
  readonly mediaType?: string;
}

export interface PnwWorkspaceResourceWriteRequest extends PnwWorkspaceResourceRef {
  readonly data: string | Uint8Array;
  readonly overwrite?: boolean;
  readonly signal?: AbortSignal;
}

export interface PnwWorkspaceSaveTargetRequest {
  readonly workspace: PnwWorkspaceDescriptor;
  readonly suggestedRelativePath?: string;
  readonly extensions?: readonly string[];
  readonly signal?: AbortSignal;
}

export interface PnwWorkspaceResourcePort {
  readonly read: (request: PnwWorkspaceResourceReadRequest) => Promise<PnwWorkspaceResourceReadResult>;
  readonly write: (request: PnwWorkspaceResourceWriteRequest) => Promise<void>;
  readonly pickSaveTarget?: (request: PnwWorkspaceSaveTargetRequest) => Promise<string | undefined>;
}

export interface PnwWorkspaceStorage {
  readonly read: <T = unknown>(
    workspace: PnwWorkspaceDescriptor,
    namespace: string,
    key: string,
  ) => Promise<T | undefined>;
  readonly write: <T = unknown>(
    workspace: PnwWorkspaceDescriptor,
    namespace: string,
    key: string,
    value: T,
  ) => Promise<void>;
  readonly delete: (
    workspace: PnwWorkspaceDescriptor,
    namespace: string,
    key: string,
  ) => Promise<void>;
}
