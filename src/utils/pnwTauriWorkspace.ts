import type {
  PnwWorkspaceDescriptor,
  PnwWorkspaceHostAdapter,
  PnwWorkspacePickRequest,
  PnwWorkspaceResourcePort,
  PnwWorkspaceResourceReadResult,
  PnwWorkspaceValidation,
} from "../types/PnwWorkspace.js";
import {
  PnwWorkspaceError,
  pnwCreateWorkspaceResourceRef,
  pnwNormalizeWorkspaceDescriptor,
  pnwNormalizeWorkspaceRelativePath,
} from "./pnwWorkspace.js";

export type PnwTauriWorkspaceInvoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

export interface PnwTauriWorkspaceCommandNames {
  readonly pickDirectory: string | false;
  readonly open: string;
  readonly close: string | false;
  readonly validate: string | false;
  readonly readResource: string;
  readonly writeResource: string;
  readonly pickSaveTarget: string | false;
}

export const PNW_DEFAULT_TAURI_WORKSPACE_COMMANDS: PnwTauriWorkspaceCommandNames = Object.freeze({
  pickDirectory: "pnw_workspace_pick_directory",
  open: "pnw_workspace_open",
  close: "pnw_workspace_close",
  validate: "pnw_workspace_validate",
  readResource: "pnw_workspace_read_resource",
  writeResource: "pnw_workspace_write_resource",
  pickSaveTarget: "pnw_workspace_pick_save_target",
});

export interface PnwTauriWorkspaceAdapterOptions {
  readonly invoke: PnwTauriWorkspaceInvoke;
  /** 可直接注入 @tauri-apps/plugin-dialog 的目录选择结果；Wing 本身不依赖 Tauri 包。 */
  readonly pickDirectory?: (request: PnwWorkspacePickRequest) => Promise<string | null | undefined>;
  readonly commands?: Partial<PnwTauriWorkspaceCommandNames>;
}

export interface PnwTauriWorkspaceAdapter {
  readonly host: PnwWorkspaceHostAdapter;
  readonly resources: PnwWorkspaceResourcePort;
}

interface PnwTauriWorkspaceReadResponse {
  readonly relativePath: string;
  readonly data: string | Uint8Array | readonly number[];
  readonly mediaType?: string;
}

function pnwResolveTauriWorkspaceCommands(
  commands: Partial<PnwTauriWorkspaceCommandNames> | undefined,
): PnwTauriWorkspaceCommandNames {
  return Object.freeze({ ...PNW_DEFAULT_TAURI_WORKSPACE_COMMANDS, ...commands });
}

function pnwWorkspaceInvokeArgs(
  workspace: PnwWorkspaceDescriptor,
  relativePath?: string,
): Record<string, unknown> {
  return {
    workspaceId: workspace.workspaceId,
    ...(relativePath ? { relativePath } : {}),
  };
}

function pnwThrowIfWorkspaceAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new PnwWorkspaceError("cancelled", "Workspace operation was cancelled");
  }
}

/**
 * 创建无运行时 Tauri 依赖的桥接器。Host command 必须重新根据 workspaceId 找到 canonical
 * root，并在 realpath 后检查 symlink 未越界；前端的相对路径校验不是文件系统安全边界。
 */
export function pnwCreateTauriWorkspaceAdapter(
  options: PnwTauriWorkspaceAdapterOptions,
): PnwTauriWorkspaceAdapter {
  const commands = pnwResolveTauriWorkspaceCommands(options.commands);
  const host: PnwWorkspaceHostAdapter = {
    ...(options.pickDirectory || commands.pickDirectory !== false
      ? {
          async pickDirectory(request: PnwWorkspacePickRequest) {
            pnwThrowIfWorkspaceAborted(request.signal);
            const rootPath = options.pickDirectory
              ? await options.pickDirectory(request)
              : await options.invoke<string | null | undefined>(commands.pickDirectory as string, {
                  title: request.title,
                });
            pnwThrowIfWorkspaceAborted(request.signal);
            return rootPath?.trim()
              ? { status: "selected" as const, rootPath: rootPath.trim() }
              : { status: "cancelled" as const };
          },
        }
      : {}),
    async open(request) {
      pnwThrowIfWorkspaceAborted(request.signal);
      const descriptor = await options.invoke<PnwWorkspaceDescriptor>(commands.open, {
        rootPath: request.rootPath,
        expectedWorkspaceId: request.expectedWorkspaceId,
      });
      pnwThrowIfWorkspaceAborted(request.signal);
      return pnwNormalizeWorkspaceDescriptor(descriptor);
    },
    ...(commands.close !== false
      ? {
          async close(workspace: PnwWorkspaceDescriptor, signal?: AbortSignal) {
            pnwThrowIfWorkspaceAborted(signal);
            await options.invoke<void>(commands.close as string, {
              workspaceId: workspace.workspaceId,
            });
            pnwThrowIfWorkspaceAborted(signal);
          },
        }
      : {}),
    ...(commands.validate !== false
      ? {
          async validate(workspace: PnwWorkspaceDescriptor, signal?: AbortSignal) {
            pnwThrowIfWorkspaceAborted(signal);
            const result = await options.invoke<PnwWorkspaceValidation>(commands.validate as string, {
              workspaceId: workspace.workspaceId,
            });
            pnwThrowIfWorkspaceAborted(signal);
            return result.descriptor
              ? { ...result, descriptor: pnwNormalizeWorkspaceDescriptor(result.descriptor) }
              : result;
          },
        }
      : {}),
  };

  const resources: PnwWorkspaceResourcePort = {
    async read(request) {
      pnwThrowIfWorkspaceAborted(request.signal);
      const ref = pnwCreateWorkspaceResourceRef(request.workspace, request.relativePath);
      if (!ref.workspace.capabilities.includes("read")) {
        throw new PnwWorkspaceError("unsupported", "Workspace does not provide read capability");
      }
      const result = await options.invoke<PnwTauriWorkspaceReadResponse>(commands.readResource, {
        ...pnwWorkspaceInvokeArgs(ref.workspace, ref.relativePath),
        format: request.format ?? "text",
      });
      pnwThrowIfWorkspaceAborted(request.signal);
      const relativePath = pnwNormalizeWorkspaceRelativePath(result.relativePath);
      const data = typeof result.data === "string" || result.data instanceof Uint8Array
        ? result.data
        : Uint8Array.from(result.data);
      const normalized: PnwWorkspaceResourceReadResult = {
        relativePath,
        data,
        mediaType: result.mediaType,
      };
      return normalized;
    },
    async write(request) {
      pnwThrowIfWorkspaceAborted(request.signal);
      const ref = pnwCreateWorkspaceResourceRef(request.workspace, request.relativePath);
      if (ref.workspace.readonly || !ref.workspace.capabilities.includes("write")) {
        throw new PnwWorkspaceError("readonly", "Workspace does not allow writes");
      }
      await options.invoke<void>(commands.writeResource, {
        ...pnwWorkspaceInvokeArgs(ref.workspace, ref.relativePath),
        data: request.data,
        overwrite: request.overwrite ?? false,
      });
      pnwThrowIfWorkspaceAborted(request.signal);
    },
    ...(commands.pickSaveTarget !== false
      ? {
          async pickSaveTarget(request) {
            pnwThrowIfWorkspaceAborted(request.signal);
            if (request.workspace.readonly || !request.workspace.capabilities.includes("write")) {
              throw new PnwWorkspaceError("readonly", "Workspace does not allow save targets");
            }
            const suggestedRelativePath = request.suggestedRelativePath
              ? pnwNormalizeWorkspaceRelativePath(request.suggestedRelativePath)
              : undefined;
            const selected = await options.invoke<string | null | undefined>(
              commands.pickSaveTarget as string,
              {
                workspaceId: request.workspace.workspaceId,
                suggestedRelativePath,
                extensions: request.extensions,
              },
            );
            pnwThrowIfWorkspaceAborted(request.signal);
            return selected?.trim()
              ? pnwNormalizeWorkspaceRelativePath(selected)
              : undefined;
          },
        }
      : {}),
  };

  return Object.freeze({ host: Object.freeze(host), resources: Object.freeze(resources) });
}
