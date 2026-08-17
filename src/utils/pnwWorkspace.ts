import { pnwNormalizeWorkspacePath } from "@phoenix-wing/code-core";
import type {
  PnwRecentWorkspaceEntry,
  PnwWorkspaceAvailability,
  PnwWorkspaceController,
  PnwWorkspaceControllerOptions,
  PnwWorkspaceDescriptor,
  PnwWorkspaceErrorCode,
  PnwWorkspaceFailure,
  PnwWorkspaceHostOpenRequest,
  PnwWorkspaceLifecycleParticipant,
  PnwWorkspaceOpenRequest,
  PnwWorkspacePhase,
  PnwWorkspaceResourceRef,
  PnwWorkspaceState,
  PnwWorkspaceTransitionContext,
  PnwWorkspaceTransitionKind,
  PnwWorkspaceTransitionResult,
} from "../types/PnwWorkspace.js";
import { pnwNormalizeWorkspaceTypeId } from "./pnwWorkspaceTypes.js";

const PNW_WORKSPACE_CAPABILITIES = new Set([
  "read",
  "write",
  "watch",
  "database",
  "native-directory-picker",
]);

const PNW_WORKSPACE_AVAILABILITIES = new Set([
  "available",
  "missing",
  "unauthorized",
  "unknown",
]);

const PNW_DEFAULT_RECENT_WORKSPACE_LIMIT = 12;

class PnwWorkspaceFlowInterrupt extends Error {
  constructor(readonly status: "cancelled" | "superseded") {
    super(status);
    this.name = "PnwWorkspaceFlowInterrupt";
  }
}

export class PnwWorkspaceError extends Error {
  readonly code: PnwWorkspaceErrorCode;
  readonly participantId?: string;

  constructor(code: PnwWorkspaceErrorCode, message: string, participantId?: string) {
    super(message);
    this.name = "PnwWorkspaceError";
    this.code = code;
    this.participantId = participantId;
  }
}

function pnwWorkspaceFailure(error: unknown, fallbackCode: PnwWorkspaceErrorCode): PnwWorkspaceFailure {
  if (error instanceof PnwWorkspaceError) {
    return Object.freeze({
      code: error.code,
      message: error.message,
      participantId: error.participantId,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return Object.freeze({ code: fallbackCode, message });
}

function pnwIsAbsoluteWorkspaceRoot(value: string): boolean {
  return value.startsWith("/") || /^[a-z]:[\\/]/iu.test(value) || value.startsWith("\\\\");
}

export function pnwNormalizeWorkspaceDescriptor(
  value: PnwWorkspaceDescriptor,
): PnwWorkspaceDescriptor {
  const workspaceId = value.workspaceId.trim();
  const name = value.name.trim();
  const rootPath = value.rootPath.trim();
  if (!workspaceId || !name || !rootPath || !pnwIsAbsoluteWorkspaceRoot(rootPath)) {
    throw new PnwWorkspaceError(
      "invalid-descriptor",
      "Workspace descriptor requires workspaceId, name, and a canonical absolute rootPath",
    );
  }
  const capabilities = [...new Set(value.capabilities)];
  if (capabilities.some((item) => !PNW_WORKSPACE_CAPABILITIES.has(item))) {
    throw new PnwWorkspaceError("invalid-descriptor", "Workspace descriptor contains an unknown capability");
  }
  if (!capabilities.includes("read")) {
    throw new PnwWorkspaceError("invalid-descriptor", "An opened local Workspace must provide read capability");
  }
  if (value.readonly && capabilities.includes("write")) {
    throw new PnwWorkspaceError("invalid-descriptor", "A readonly Workspace cannot provide write capability");
  }
  return Object.freeze({
    workspaceId,
    workspaceTypeId: pnwNormalizeWorkspaceTypeId(value.workspaceTypeId),
    name,
    rootPath,
    rootUri: value.rootUri?.trim() || undefined,
    readonly: Boolean(value.readonly),
    capabilities: Object.freeze(capabilities),
  });
}

function pnwRecentWorkspaceKey(value: PnwRecentWorkspaceEntry): string {
  return `${value.workspaceId.trim()}\u0000${value.rootPath.trim()}`;
}

export function pnwNormalizeRecentWorkspaces(
  entries: readonly PnwRecentWorkspaceEntry[],
  limit = PNW_DEFAULT_RECENT_WORKSPACE_LIMIT,
): readonly PnwRecentWorkspaceEntry[] {
  const normalized: PnwRecentWorkspaceEntry[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  const boundedLimit = Math.max(1, Math.trunc(limit));
  for (const entry of entries) {
    const workspaceId = entry.workspaceId.trim();
    const rootPath = entry.rootPath.trim();
    const name = entry.name.trim();
    if (!workspaceId || !rootPath || !name || !pnwIsAbsoluteWorkspaceRoot(rootPath)) continue;
    if (!PNW_WORKSPACE_AVAILABILITIES.has(entry.availability)) continue;
    if (ids.has(workspaceId) || paths.has(rootPath) || normalized.some((item) => pnwRecentWorkspaceKey(item) === pnwRecentWorkspaceKey(entry))) {
      continue;
    }
    ids.add(workspaceId);
    paths.add(rootPath);
    normalized.push(Object.freeze({
      workspaceId,
      workspaceTypeId: pnwNormalizeWorkspaceTypeId(entry.workspaceTypeId),
      rootPath,
      name,
      availability: entry.availability,
      lastOpenedAt: entry.lastOpenedAt?.trim() || undefined,
    }));
    if (normalized.length >= boundedLimit) break;
  }
  return Object.freeze(normalized);
}

export function pnwNormalizeWorkspaceRelativePath(value: string): string {
  const normalized = pnwNormalizeWorkspacePath(value);
  if (!normalized || normalized === ".") {
    throw new PnwWorkspaceError(
      "invalid-relative-path",
      "Workspace resources require a non-root normalized relative path",
    );
  }
  return normalized;
}

export function pnwCreateWorkspaceResourceRef(
  workspace: PnwWorkspaceDescriptor,
  relativePath: string,
): PnwWorkspaceResourceRef {
  return Object.freeze({
    workspace: pnwNormalizeWorkspaceDescriptor(workspace),
    relativePath: pnwNormalizeWorkspaceRelativePath(relativePath),
  });
}

function pnwStablePhase(current: PnwWorkspaceDescriptor | undefined): PnwWorkspacePhase {
  return current ? "open" : "closed";
}

function pnwSnapshot(input: PnwWorkspaceState): PnwWorkspaceState {
  return Object.freeze({
    ...input,
    recent: Object.freeze([...input.recent]),
  });
}

function pnwLinkAbortSignal(signal: AbortSignal | undefined, controller: AbortController): () => void {
  if (!signal) return () => undefined;
  if (signal.aborted) {
    controller.abort(signal.reason);
    return () => undefined;
  }
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  return () => signal.removeEventListener("abort", abort);
}

function pnwSameWorkspace(
  left: PnwWorkspaceDescriptor | undefined,
  right: PnwWorkspaceDescriptor,
): boolean {
  return Boolean(left && (left.workspaceId === right.workspaceId || left.rootPath === right.rootPath));
}

export function pnwCreateWorkspaceController(
  options: PnwWorkspaceControllerOptions,
): PnwWorkspaceController {
  const participants = [...(options.participants ?? [])];
  const duplicateParticipant = participants.find(
    (item, index) => !item.id.trim() || participants.findIndex((candidate) => candidate.id === item.id) !== index,
  );
  if (duplicateParticipant) {
    throw new PnwWorkspaceError(
      "invalid-request",
      "Workspace participants require unique non-empty ids",
      duplicateParticipant.id || undefined,
    );
  }
  const recentLimit = Math.max(1, Math.trunc(options.recentLimit ?? PNW_DEFAULT_RECENT_WORKSPACE_LIMIT));
  const now = options.now ?? (() => new Date());
  const listeners = new Set<(state: PnwWorkspaceState) => void>();
  let state = pnwSnapshot({ phase: "closed", recent: [], revision: 0 });
  let requestedRevision = 0;
  let activeAbort: AbortController | undefined;
  let transitionTail: Promise<void> = Promise.resolve();

  const report = (failure: PnwWorkspaceFailure): void => {
    try {
      options.onError?.(failure);
    } catch {
      // Error observers are diagnostic only and must not break a Workspace transition.
    }
  };

  const publish = (next: PnwWorkspaceState): void => {
    state = pnwSnapshot(next);
    for (const listener of listeners) {
      try {
        listener(state);
      } catch (error) {
        report(pnwWorkspaceFailure(error, "subscriber-failure"));
      }
    }
  };

  const publishFor = (
    revision: number,
    patch: Partial<Omit<PnwWorkspaceState, "revision">>,
  ): void => {
    if (revision !== requestedRevision) return;
    publish({ ...state, ...patch, revision });
  };

  const persistRecent = async (entries: readonly PnwRecentWorkspaceEntry[]): Promise<void> => {
    if (!options.recentStore) return;
    try {
      await options.recentStore.save(entries);
    } catch (error) {
      report(pnwWorkspaceFailure(error, "recent-store-failure"));
    }
  };

  const setRecent = async (entries: readonly PnwRecentWorkspaceEntry[]): Promise<void> => {
    const recent = pnwNormalizeRecentWorkspaces(entries, recentLimit);
    publish({ ...state, recent });
    await persistRecent(recent);
  };

  const touchRecent = async (workspace: PnwWorkspaceDescriptor): Promise<void> => {
    const next: PnwRecentWorkspaceEntry = {
      workspaceId: workspace.workspaceId,
      workspaceTypeId: workspace.workspaceTypeId,
      rootPath: workspace.rootPath,
      name: workspace.name,
      availability: "available",
      lastOpenedAt: now().toISOString(),
    };
    await setRecent([next, ...state.recent]);
  };

  const ensureLive = (revision: number, signal: AbortSignal): void => {
    if (revision !== requestedRevision) throw new PnwWorkspaceFlowInterrupt("superseded");
    if (signal.aborted) throw new PnwWorkspaceFlowInterrupt("cancelled");
  };

  const rollback = async (
    prepared: readonly PnwWorkspaceLifecycleParticipant[],
    context: PnwWorkspaceTransitionContext,
  ): Promise<void> => {
    for (const participant of [...prepared].reverse()) {
      if (!participant.rollback) continue;
      try {
        await participant.rollback(context);
      } catch (error) {
        report(pnwWorkspaceFailure(
          new PnwWorkspaceError(
            "participant-failure",
            error instanceof Error ? error.message : String(error),
            participant.id,
          ),
          "participant-failure",
        ));
      }
    }
  };

  const prepare = async (
    context: PnwWorkspaceTransitionContext,
  ): Promise<readonly PnwWorkspaceLifecycleParticipant[]> => {
    const prepared: PnwWorkspaceLifecycleParticipant[] = [];
    for (const participant of participants) {
      ensureLive(context.revision, context.signal);
      try {
        const vote = await participant.prepare?.(context);
        prepared.push(participant);
        if (vote && !vote.allowed) {
          throw new PnwWorkspaceError(
            "participant-rejected",
            vote.reason || `Workspace transition rejected by ${participant.id}`,
            participant.id,
          );
        }
      } catch (error) {
        await rollback(prepared, context);
        if (error instanceof PnwWorkspaceError) throw error;
        throw new PnwWorkspaceError(
          "participant-failure",
          error instanceof Error ? error.message : String(error),
          participant.id,
        );
      }
    }
    return prepared;
  };

  const commit = async (
    prepared: readonly PnwWorkspaceLifecycleParticipant[],
    context: PnwWorkspaceTransitionContext,
  ): Promise<void> => {
    for (const participant of prepared) {
      ensureLive(context.revision, context.signal);
      if (!participant.commit) continue;
      try {
        await participant.commit(context);
      } catch (error) {
        throw new PnwWorkspaceError(
          "participant-failure",
          error instanceof Error ? error.message : String(error),
          participant.id,
        );
      }
    }
  };

  const closeHost = async (
    workspace: PnwWorkspaceDescriptor | undefined,
    signal?: AbortSignal,
  ): Promise<void> => {
    if (!workspace || !options.host.close) return;
    try {
      await options.host.close(workspace, signal);
    } catch (error) {
      throw new PnwWorkspaceError("host-failure", error instanceof Error ? error.message : String(error));
    }
  };

  const openHost = async (request: PnwWorkspaceHostOpenRequest): Promise<PnwWorkspaceDescriptor> => {
    try {
      const descriptor = pnwNormalizeWorkspaceDescriptor(await options.host.open(request));
      if (request.expectedWorkspaceId && descriptor.workspaceId !== request.expectedWorkspaceId) {
        throw new PnwWorkspaceError(
          "workspace-mismatch",
          `Expected Workspace ${request.expectedWorkspaceId}, received ${descriptor.workspaceId}`,
        );
      }
      return descriptor;
    } catch (error) {
      if (error instanceof PnwWorkspaceError) throw error;
      throw new PnwWorkspaceError("host-failure", error instanceof Error ? error.message : String(error));
    }
  };

  const resolveRootPath = async (
    request: PnwWorkspaceOpenRequest,
    signal: AbortSignal,
  ): Promise<string | undefined> => {
    const explicit = request.rootPath?.trim();
    if (explicit) return explicit;
    if (!options.host.pickDirectory) {
      throw new PnwWorkspaceError(
        "unsupported",
        "This Host does not provide a controlled directory picker",
      );
    }
    const result = await options.host.pickDirectory({ title: request.title, signal });
    return result.status === "selected" ? result.rootPath.trim() : undefined;
  };

  const executeOpen = async (
    request: PnwWorkspaceOpenRequest,
    revision: number,
    signal: AbortSignal,
  ): Promise<PnwWorkspaceTransitionResult> => {
    const previous = state.current;
    const rootPath = await resolveRootPath(request, signal);
    ensureLive(revision, signal);
    if (!rootPath) {
      publishFor(revision, { phase: pnwStablePhase(previous), pendingRootPath: undefined, error: undefined });
      return { status: "cancelled", workspace: previous };
    }
    const kind: PnwWorkspaceTransitionKind = previous ? "switch" : "open";
    publishFor(revision, {
      phase: previous ? "preparing-switch" : "opening",
      pendingRootPath: rootPath,
      error: undefined,
    });
    const prepareContext: PnwWorkspaceTransitionContext = Object.freeze({
      kind,
      revision,
      current: previous,
      targetRootPath: rootPath,
      signal,
    });
    const prepared = await prepare(prepareContext);
    let target: PnwWorkspaceDescriptor | undefined;
    try {
      publishFor(revision, {
        phase: previous ? "opening-target" : "opening",
        pendingRootPath: rootPath,
      });
      target = await openHost({
        rootPath,
        expectedWorkspaceId: request.expectedWorkspaceId,
        signal,
      });
      ensureLive(revision, signal);
      if (pnwSameWorkspace(previous, target)) {
        await rollback(prepared, { ...prepareContext, target });
        publishFor(revision, {
          phase: "open",
          current: previous,
          pendingRootPath: undefined,
          error: undefined,
        });
        if (previous) await touchRecent(previous);
        return { status: "unchanged", workspace: previous };
      }
      const commitContext: PnwWorkspaceTransitionContext = Object.freeze({
        ...prepareContext,
        target,
      });
      await commit(prepared, commitContext);
      await closeHost(previous);
      publish({
        ...state,
        revision: requestedRevision,
        current: target,
        phase: "open",
        pendingRootPath: undefined,
        error: undefined,
      });
      await touchRecent(target);
      return {
        status: previous ? "switched" : "opened",
        workspace: target,
        previous,
      };
    } catch (error) {
      const context = Object.freeze({ ...prepareContext, target });
      await rollback(prepared, context);
      if (target && !pnwSameWorkspace(previous, target)) {
        try {
          await closeHost(target);
        } catch (cleanupError) {
          report(pnwWorkspaceFailure(cleanupError, "host-failure"));
        }
      }
      throw error;
    }
  };

  const executeClose = async (
    revision: number,
    signal: AbortSignal,
  ): Promise<PnwWorkspaceTransitionResult> => {
    const previous = state.current;
    if (!previous) {
      publishFor(revision, { phase: "closed", pendingRootPath: undefined, error: undefined });
      return { status: "unchanged" };
    }
    publishFor(revision, { phase: "preparing-close", pendingRootPath: undefined, error: undefined });
    const context: PnwWorkspaceTransitionContext = Object.freeze({
      kind: "close",
      revision,
      current: previous,
      signal,
    });
    const prepared = await prepare(context);
    try {
      await commit(prepared, context);
      await closeHost(previous);
      publish({
        ...state,
        revision: requestedRevision,
        current: undefined,
        phase: "closed",
        pendingRootPath: undefined,
        error: undefined,
      });
      return { status: "closed", previous };
    } catch (error) {
      await rollback(prepared, context);
      throw error;
    }
  };

  const enqueue = (
    signal: AbortSignal | undefined,
    run: (revision: number, signal: AbortSignal) => Promise<PnwWorkspaceTransitionResult>,
  ): Promise<PnwWorkspaceTransitionResult> => {
    requestedRevision += 1;
    const revision = requestedRevision;
    activeAbort?.abort(new PnwWorkspaceFlowInterrupt("superseded"));
    const controller = new AbortController();
    activeAbort = controller;
    const unlink = pnwLinkAbortSignal(signal, controller);
    const execute = async (): Promise<PnwWorkspaceTransitionResult> => {
      if (revision !== requestedRevision) return { status: "superseded", workspace: state.current };
      try {
        return await run(revision, controller.signal);
      } catch (error) {
        if (revision !== requestedRevision) {
          return { status: "superseded", workspace: state.current };
        }
        if (controller.signal.aborted) {
          publishFor(revision, {
            phase: pnwStablePhase(state.current),
            pendingRootPath: undefined,
            error: undefined,
          });
          return { status: "cancelled", workspace: state.current };
        }
        if (error instanceof PnwWorkspaceFlowInterrupt) {
          if (error.status === "cancelled" && revision === requestedRevision) {
            publishFor(revision, {
              phase: pnwStablePhase(state.current),
              pendingRootPath: undefined,
              error: undefined,
            });
          }
          return { status: error.status, workspace: state.current };
        }
        const failure = pnwWorkspaceFailure(error, "host-failure");
        if (revision === requestedRevision) {
          publishFor(revision, {
            phase: pnwStablePhase(state.current),
            pendingRootPath: undefined,
            error: failure,
          });
          report(failure);
        }
        return { status: "rejected", workspace: state.current, error: failure };
      } finally {
        unlink();
        if (activeAbort === controller) activeAbort = undefined;
      }
    };
    const result = transitionTail.then(execute, execute);
    transitionTail = result.then(() => undefined, () => undefined);
    return result;
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      try {
        listener(state);
      } catch (error) {
        report(pnwWorkspaceFailure(error, "subscriber-failure"));
      }
      return () => listeners.delete(listener);
    },
    async initialize() {
      if (!options.recentStore) return state;
      try {
        const loaded = await options.recentStore.load();
        const recent = pnwNormalizeRecentWorkspaces([...state.recent, ...loaded], recentLimit);
        publish({ ...state, recent });
      } catch (error) {
        const failure = pnwWorkspaceFailure(error, "recent-store-failure");
        publish({ ...state, error: failure });
        report(failure);
      }
      return state;
    },
    requestOpen(request = {}) {
      return enqueue(request.signal, (revision, signal) => executeOpen(request, revision, signal));
    },
    requestSwitch(request) {
      return enqueue(request.signal, (revision, signal) => executeOpen(request, revision, signal));
    },
    requestClose(request = {}) {
      return enqueue(request.signal, (revision, signal) => executeClose(revision, signal));
    },
    async removeRecent(workspaceId) {
      await setRecent(state.recent.filter((item) => item.workspaceId !== workspaceId));
      return state.recent;
    },
    async markRecentAvailability(workspaceId, availability: PnwWorkspaceAvailability) {
      await setRecent(state.recent.map((item) => item.workspaceId === workspaceId
        ? { ...item, availability }
        : item));
      return state.recent;
    },
  };
}
