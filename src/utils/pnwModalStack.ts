import { PNW_WORKBENCH_OVERLAY_LAYERS } from "./pnwOverlayStacking.js";

export type PnwModalCloseReason = "escape" | "owner-disposed";
export interface PnwModalLayerState {
  readonly zIndex: number;
  readonly isTopmost: boolean;
}
export interface PnwModalLayerOptions {
  /** 模态内容根；必须和遮罩一起放在同一 document 的顶级叠层中。 */
  readonly element: () => HTMLElement | null;
  /** 包含第三方实际遮罩层级的下限，不是独立递增计数器。 */
  readonly baseZIndex?: number;
  readonly parentLayer?: PnwModalLayer;
  /** 第三方无法暂停 focus trap 时，提供父内容内的子模态 Teleport 容器。不得裁剪或隔离子模态。 */
  readonly childContainer?: () => HTMLElement | null;
  readonly initialFocus?: (element: HTMLElement) => HTMLElement | null | undefined;
  readonly onClose?: (reason: PnwModalCloseReason) => void;
  /** 更新遮罩 z-index；第三方也在此暂停非顶层的独立焦点限制。 */
  readonly onChange?: (state: PnwModalLayerState) => void;
}
export interface PnwModalLayer {
  readonly id: symbol;
  readonly childContainer: HTMLElement | null;
  readonly state: PnwModalLayerState;
  readonly disposed: boolean;
  focus(): void;
  updateBaseZIndex(value: number): void;
  dispose(): void;
}
export interface PnwDocumentModalStack {
  readonly topLayer: PnwModalLayer | undefined;
  register(options: PnwModalLayerOptions): PnwModalLayer;
}
interface PnwModalEntry {
  options: PnwModalLayerOptions;
  layer: PnwModalLayer;
  base: number;
  state: PnwModalLayerState;
  trigger: HTMLElement | null;
  parent?: PnwModalLayer;
  disposed: boolean;
}
const PNW_MODAL_STACKS = new WeakMap<Document, PnwDocumentModalStack>();
const PNW_MODAL_FOCUSABLE = "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex='-1'])";
function pnwModalFocusables(element: HTMLElement): HTMLElement[] {
  return [...element.querySelectorAll<HTMLElement>(PNW_MODAL_FOCUSABLE)].filter(item => {
    if ((item.hasAttribute("tabindex") && Number(item.getAttribute("tabindex")) < 0) || item.matches(":disabled,input[type=hidden]") || item.closest("[hidden],[inert],[aria-hidden='true']")) return false;
    for (let ancestor: HTMLElement | null = item; ancestor; ancestor = ancestor.parentElement) {
      const style = element.ownerDocument.defaultView?.getComputedStyle(ancestor);
      if (style?.display === "none" || style?.visibility === "hidden") return false;
      if (ancestor === element) break;
    }
    return true;
  });
}
/** 同一 document 的公共模态所有权域；不扫描或猜测第三方弹窗 DOM。 */
export function pnwGetDocumentModalStack(ownerDocument: Document): PnwDocumentModalStack {
  const existing = PNW_MODAL_STACKS.get(ownerDocument);
  if (existing) return existing;
  const entries: PnwModalEntry[] = [];
  const view = ownerDocument.defaultView;
  let redirecting = false;
  const top = () => entries.at(-1);
  const focus = (entry: PnwModalEntry) => {
    if (top() !== entry || entry.disposed) return;
    const element = entry.options.element();
    if (!element?.isConnected) return;
    const target = entry.options.initialFocus?.(element) ?? pnwModalFocusables(element)[0] ?? element;
    if (!element.contains(target)) return;
    redirecting = true;
    try { target.focus({ preventScroll: true }); } finally { redirecting = false; }
  };
  const notify = () => {
    let zIndex: number = PNW_WORKBENCH_OVERLAY_LAYERS.modal - 1;
    for (const entry of entries) {
      zIndex = Math.max(zIndex + 1, entry.base);
      entry.state = { zIndex, isTopmost: entry === top() };
      entry.options.onChange?.(entry.state);
    }
  };
  const onKeydown = (event: KeyboardEvent) => {
    const entry = top();
    if (!entry) return;
    if (event.key === "Escape") {
      event.preventDefault(); event.stopImmediatePropagation();
      entry.options.onClose?.("escape");
      return;
    }
    if (event.key !== "Tab") return;
    // Native Tab may proceed inside the top layer, but ancestor traps must not handle it again.
    event.stopImmediatePropagation();
    const element = entry.options.element();
    if (!element) return;
    const items = pnwModalFocusables(element);
    const active = ownerDocument.activeElement;
    if (!items.length) { event.preventDefault(); focus(entry); return; }
    if (!items.includes(active as HTMLElement) || (!event.shiftKey && active === items.at(-1)) || (event.shiftKey && active === items[0])) {
      event.preventDefault();
      (event.shiftKey ? items.at(-1) : items[0])?.focus({ preventScroll: true });
    }
  };
  const onFocusIn = (event: FocusEvent) => {
    if (redirecting) return;
    const entry = top(); const element = entry?.options.element();
    if (entry && element && event.target instanceof (view?.Node ?? Node) && !element.contains(event.target as Node)) focus(entry);
  };
  const listen = (enabled: boolean) => {
    if (enabled) {
      view?.addEventListener("keydown", onKeydown, true);
      view?.addEventListener("focusin", onFocusIn, true);
    } else {
      view?.removeEventListener("keydown", onKeydown, true);
      view?.removeEventListener("focusin", onFocusIn, true);
    }
  };
  const stack: PnwDocumentModalStack = {
    get topLayer() { return top()?.layer; },
    register(options) {
      const requestedParent = options.parentLayer ?? top()?.layer;
      const parent = entries.find(item => item.layer.id === requestedParent?.id)?.layer;
      if (requestedParent && !parent) throw new TypeError("parentLayer must be live in the same document");
      const active = ownerDocument.activeElement;
      const entry = { options, base: Number.isFinite(options.baseZIndex) ? options.baseZIndex! : PNW_WORKBENCH_OVERLAY_LAYERS.modal,
        trigger: active instanceof (view?.HTMLElement ?? HTMLElement) ? active as HTMLElement : null,
        parent, disposed: false, state: { zIndex: 0, isTopmost: false } } as PnwModalEntry;
      const layer: PnwModalLayer = {
        id: Symbol("pnw.modal.layer"),
        get childContainer() { return entry.options.childContainer?.() ?? null; },
        get state() { return entry.state; },
        get disposed() { return entry.disposed; },
        focus: () => focus(entry),
        updateBaseZIndex(value) { if (!Number.isFinite(value)) throw new TypeError("baseZIndex must be finite"); entry.base = value; if (!entry.disposed) notify(); },
        dispose() {
          if (entry.disposed) return;
          const wasTopmost = top() === entry;
          // Explicit owner closure cancels descendants before restoring focus.
          for (const child of [...entries].reverse()) {
            if (child.parent !== layer) continue;
            child.layer.dispose();
            child.options.onClose?.("owner-disposed");
          }
          entry.disposed = true;
          entry.state = { ...entry.state, isTopmost: false };
          entries.splice(entries.indexOf(entry), 1);
          notify();
          entry.options.onChange?.(entry.state);
          if (!entries.length) listen(false);
          if (wasTopmost || !top()?.options.element()?.contains(ownerDocument.activeElement)) {
            const current = top();
            if (entry.trigger?.isConnected && (!current || current.options.element()?.contains(entry.trigger))) entry.trigger.focus({ preventScroll: true });
            else if (current) focus(current);
          }
        },
      };
      entry.layer = layer;
      if (!entries.length) listen(true);
      entries.push(entry); notify(); focus(entry);
      return layer;
    },
  };
  PNW_MODAL_STACKS.set(ownerDocument, stack);
  return stack;
}
