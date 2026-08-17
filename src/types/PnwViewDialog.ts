import type { PnwColorScheme } from "../utils/pnwColorScheme.js";

/**
 * View 对话框的实际呈现。
 *
 * desktop-dialog 是父窗口关联的非模态 Webview 窗口，不是系统消息框、独立进程或
 * 独立工作空间；web-floating 是应用内部无蒙层浮窗。
 */
export type PnwViewDialogPresentation = "desktop-dialog" | "web-floating";

/** 默认单实例；parallel 只用于少量、彼此独立的对话框请求。 */
export type PnwViewDialogInstancePolicy = "single" | "parallel";

export interface PnwViewDialogSize {
  readonly width: number;
  readonly height: number;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
}

/**
 * 由调用 View 创建的受控请求。props 必须能被 Host 使用的跨 Webview 通道序列化；
 * Wing 不接受 URL、组件或 Router 作为对话框身份。
 */
export interface PnwViewDialogRequest<TProps = unknown> {
  readonly requestId: string;
  readonly viewId: string;
  readonly title: string;
  readonly props: TProps;
  readonly parentId?: string;
  readonly size?: Partial<PnwViewDialogSize>;
  readonly instancePolicy?: PnwViewDialogInstancePolicy;
  readonly maxInstances?: number;
  readonly colorScheme?: PnwColorScheme;
}

export interface PnwResolvedViewDialogRequest<TProps = unknown>
  extends Omit<PnwViewDialogRequest<TProps>, "size" | "instancePolicy" | "maxInstances"> {
  readonly size: PnwViewDialogSize;
  readonly instancePolicy: PnwViewDialogInstancePolicy;
  readonly maxInstances: number;
}

export type PnwViewDialogCloseReason =
  | "cancelled"
  | "window-close"
  | "parent-close"
  | "app-exit"
  | "programmatic";

export type PnwViewDialogFailureCode =
  | "invalid-request"
  | "already-open"
  | "instance-limit"
  | "host-error";

export type PnwViewDialogOutcome<TResult = unknown> =
  | {
      readonly status: "submitted";
      readonly value: TResult;
    }
  | {
      readonly status: "closed";
      readonly reason: PnwViewDialogCloseReason;
    }
  | {
      readonly status: "failed";
      readonly code: PnwViewDialogFailureCode;
      readonly message: string;
    };

/** Host 对一个呈现 adapter 的真实能力声明；不得仅凭是否存在 window 对象推断。 */
export interface PnwViewDialogCapabilities {
  readonly presentation: PnwViewDialogPresentation;
  readonly supportsParentRelationship: boolean;
  readonly keepsParentInteractive: boolean;
  readonly supportsOutsideParentBounds: boolean;
  readonly maxOpenDialogs: number;
}

/**
 * 平台 adapter 边界。Tauri 实现留在 Host；Web adapter 通常复用 PnwFloatingPanel。
 * 两种呈现都必须保持主 View / Primary 可交互，不得增加背景遮罩、aria-modal 或禁用父窗口。
 * open 必须在提交、关闭、父窗口退出和异常路径之一最终 settle。
 */
export interface PnwViewDialogHostAdapter {
  readonly capabilities: PnwViewDialogCapabilities;
  open(
    request: PnwResolvedViewDialogRequest<unknown>,
  ): Promise<PnwViewDialogOutcome<unknown>>;
  close(requestId: string, reason: PnwViewDialogCloseReason): Promise<void>;
}

export interface PnwViewDialogController {
  open<TProps, TResult = unknown>(
    request: PnwViewDialogRequest<TProps>,
  ): Promise<PnwViewDialogOutcome<TResult>>;
  close(requestId: string, reason?: PnwViewDialogCloseReason): Promise<void>;
  activeRequests(): readonly PnwResolvedViewDialogRequest<unknown>[];
}

export interface PnwViewDialogControllerOptions {
  readonly webFloating: PnwViewDialogHostAdapter;
  readonly desktopDialog?: PnwViewDialogHostAdapter;
}
