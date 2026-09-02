import type { Component } from "vue";
import type {
  PnwFloatingPanelBounds,
  PnwFloatingPanelPosition,
} from "../utils/pnwFloatingPanel.js";
import type { PnwPresentationResizeMode } from "./PnwPresentationFrame.js";
import type {
  PnwResolvedViewDialogRequest,
  PnwViewDialogCloseReason,
  PnwViewDialogOutcome,
  PnwViewDialogRequest,
} from "./PnwViewDialog.js";

/** 交给全局 Vue Host 的请求；rendererId 只引用 Host 白名单，不接受组件或任意 URL。 */
export interface PnwViewDialogHostRequest<TProps = unknown>
  extends Omit<PnwViewDialogRequest<TProps>, "instancePolicy" | "maxInstances"> {
  readonly rendererId: string;
  /** 同一 owner View + renderer 需要多个独立实例时必须显式提供。 */
  readonly instanceKey?: string;
  readonly position?: PnwFloatingPanelPosition;
}

export interface PnwResolvedViewDialogHostRequest<TProps = unknown>
  extends Omit<PnwResolvedViewDialogRequest<TProps>, "instancePolicy" | "maxInstances"> {
  readonly rendererId: string;
  readonly instanceKey?: string;
  readonly position: PnwFloatingPanelPosition;
}

/**
 * Host 本地登记的 Vue renderer。component 是运行时资源，不进入请求、持久化或跨 Webview
 * 通道；业务 props 仍必须通过可序列化 request.props 传递。
 */
export interface PnwViewDialogRendererDefinition {
  readonly rendererId: string;
  readonly component: Component;
  readonly movable?: boolean;
  readonly resizable?: boolean | PnwPresentationResizeMode;
}

/** renderer 唯一需要接收的 prop；submit/cancel 由 Wing 统一 settle。 */
export interface PnwViewDialogRendererContext<TProps = unknown, TResult = unknown> {
  readonly request: PnwResolvedViewDialogHostRequest<TProps>;
  readonly props: TProps;
  submit(value: TResult): void;
  cancel(): void;
}

export interface PnwViewDialogHostEntry {
  readonly request: PnwResolvedViewDialogHostRequest<unknown>;
  readonly bounds: PnwFloatingPanelBounds;
  readonly focusRevision: number;
}

export type PnwViewDialogHostListener = (
  entries: readonly PnwViewDialogHostEntry[],
) => void;

export interface PnwViewDialogHostController {
  registerRenderer(definition: PnwViewDialogRendererDefinition): () => void;
  resolveRenderer(rendererId: string): PnwViewDialogRendererDefinition | undefined;
  open<TProps, TResult = unknown>(
    request: PnwViewDialogHostRequest<TProps>,
  ): Promise<PnwViewDialogOutcome<TResult>>;
  submit<TResult = unknown>(requestId: string, value: TResult): void;
  cancel(requestId: string): Promise<void>;
  close(requestId: string, reason?: PnwViewDialogCloseReason): Promise<void>;
  closeByView(viewId: string, reason?: PnwViewDialogCloseReason): Promise<void>;
  closeAll(reason?: PnwViewDialogCloseReason): Promise<void>;
  focus(requestId: string): boolean;
  updateBounds(requestId: string, bounds: PnwFloatingPanelBounds): void;
  activeDialogs(): readonly PnwViewDialogHostEntry[];
  subscribe(listener: PnwViewDialogHostListener): () => void;
}

export interface PnwViewDialogHostControllerOptions {
  readonly maxOpenDialogs?: number;
  readonly defaultPosition?: PnwFloatingPanelPosition;
  readonly positionStep?: number;
}
