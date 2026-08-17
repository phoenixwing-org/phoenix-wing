export type PnwColorScheme = "light" | "dark" | "system";
export type PnwResolvedColorScheme = Exclude<PnwColorScheme, "system">;

export interface PnwColorSchemeTransitionOrigin {
  x: number;
  y: number;
}

export interface PnwColorSchemeTransitionOptions {
  /** 当前受控值；system 会先解析为实际 light / dark。 */
  value: PnwColorScheme;
  /** 由 Host 更新受控状态；Wing 不持久化主题。 */
  update: (value: PnwResolvedColorScheme) => void | Promise<void>;
  /** 圆形揭示中心，通常取触发按钮中心。 */
  origin?: PnwColorSchemeTransitionOrigin;
  /** 动画时长；缺省 380ms。 */
  duration?: number;
  /** 多 Webview / iframe 可显式指定所属 document。 */
  ownerDocument?: Document;
}

export interface PnwColorSchemeTransitionResult {
  value: PnwResolvedColorScheme;
  animated: boolean;
}

export const PNW_DEFAULT_COLOR_SCHEME_TRANSITION_DURATION = 380;

type PnwAppliedColorSchemeListener = (scheme: PnwResolvedColorScheme) => void;

const pnwAppliedColorSchemeListeners = new Set<PnwAppliedColorSchemeListener>();
let pnwAppliedColorScheme: PnwResolvedColorScheme | undefined;

interface PnwViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition?: () => void;
}

type PnwStartViewTransition = (update: () => void | Promise<void>) => PnwViewTransition;

const pnwActiveColorSchemeTransitions = new WeakMap<
  Document,
  Promise<PnwColorSchemeTransitionResult>
>();

export function pnwResolveColorScheme(scheme: PnwColorScheme): PnwResolvedColorScheme {
  if (scheme === "system") {
    return typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return scheme;
}

/**
 * 返回 Host 最近通过 pnwApplyColorScheme 应用的解析结果。
 * 未应用时从 document 根标记或系统偏好推导，SSR 缺省为 light。
 */
export function pnwGetAppliedColorScheme(): PnwResolvedColorScheme {
  if (pnwAppliedColorScheme) return pnwAppliedColorScheme;
  if (typeof document !== "undefined") {
    const rootScheme = document.documentElement.dataset.pnwColorScheme;
    if (rootScheme === "light" || rootScheme === "dark") return rootScheme;
    const legacyTheme = document.documentElement.dataset.theme;
    if (legacyTheme === "light" || legacyTheme === "dark") return legacyTheme;
  }
  return pnwResolveColorScheme("system");
}

/** Wing overlay Host 内部订阅；返回解除订阅函数。 */
export function pnwOnAppliedColorSchemeChange(
  listener: PnwAppliedColorSchemeListener,
): () => void {
  pnwAppliedColorSchemeListeners.add(listener);
  return () => pnwAppliedColorSchemeListeners.delete(listener);
}

/**
 * 应用解析后的 Wing 主题根标记，并通知 Teleport overlay theme roots。
 * Element Plus 的 html.dark 与 --el-* 仍由 Host adapter 同步。
 */
export function pnwApplyColorScheme(scheme: PnwColorScheme): PnwResolvedColorScheme {
  const resolved = pnwResolveColorScheme(scheme);
  pnwAppliedColorScheme = resolved;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.pnwColorScheme = resolved;
  }
  for (const listener of pnwAppliedColorSchemeListeners) listener(resolved);
  return resolved;
}

function pnwResolveColorSchemeForDocument(
  scheme: PnwColorScheme,
  ownerDocument: Document | undefined,
): PnwResolvedColorScheme {
  if (scheme !== "system") return scheme;
  const ownerWindow = ownerDocument?.defaultView;
  return ownerWindow?.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function pnwResolveTransitionOrigin(
  origin: PnwColorSchemeTransitionOrigin | undefined,
  ownerDocument: Document,
): PnwColorSchemeTransitionOrigin {
  const viewport = ownerDocument.defaultView;
  const width = viewport?.innerWidth ?? ownerDocument.documentElement.clientWidth;
  const height = viewport?.innerHeight ?? ownerDocument.documentElement.clientHeight;
  return {
    x: Number.isFinite(origin?.x) ? origin!.x : width / 2,
    y: Number.isFinite(origin?.y) ? origin!.y : height / 2,
  };
}

function pnwResolveTransitionRadius(
  origin: PnwColorSchemeTransitionOrigin,
  ownerDocument: Document,
): number {
  const viewport = ownerDocument.defaultView;
  const width = viewport?.innerWidth ?? ownerDocument.documentElement.clientWidth;
  const height = viewport?.innerHeight ?? ownerDocument.documentElement.clientHeight;
  return Math.hypot(
    Math.max(origin.x, width - origin.x),
    Math.max(origin.y, height - origin.y),
  );
}

async function pnwRunColorSchemeTransition(
  options: PnwColorSchemeTransitionOptions,
  ownerDocument: Document | undefined,
): Promise<PnwColorSchemeTransitionResult> {
  const current = pnwResolveColorSchemeForDocument(options.value, ownerDocument);
  const next: PnwResolvedColorScheme = current === "dark" ? "light" : "dark";
  const update = async (): Promise<void> => {
    await options.update(next);
  };

  if (!ownerDocument) {
    await update();
    return { value: next, animated: false };
  }

  const transitionDocument = ownerDocument;
  const reducedMotion = ownerDocument.defaultView
    ?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const startViewTransition = (
    transitionDocument as unknown as { startViewTransition?: PnwStartViewTransition }
  ).startViewTransition;
  const root = ownerDocument.documentElement;

  if (reducedMotion || typeof startViewTransition !== "function" || typeof root.animate !== "function") {
    await update();
    return { value: next, animated: false };
  }

  const duration = Number.isFinite(options.duration)
    ? Math.max(0, Math.min(options.duration!, 2_000))
    : PNW_DEFAULT_COLOR_SCHEME_TRANSITION_DURATION;
  if (duration === 0) {
    await update();
    return { value: next, animated: false };
  }

  const origin = pnwResolveTransitionOrigin(options.origin, ownerDocument);
  const radius = pnwResolveTransitionRadius(origin, ownerDocument);
  const circle = (value: number): string => `circle(${value}px at ${origin.x}px ${origin.y}px)`;
  const previousMarker = root.dataset.pnwColorSchemeTransition;
  let updateStarted = false;
  let updateFailure: unknown;

  root.dataset.pnwColorSchemeTransition = next;
  try {
    let transition: PnwViewTransition;
    try {
      transition = startViewTransition.call(transitionDocument, async () => {
        updateStarted = true;
        try {
          await update();
        } catch (error) {
          updateFailure = error;
          throw error;
        }
      });
    } catch (error) {
      if (!updateStarted) await update();
      if (updateFailure !== undefined) throw updateFailure;
      return { value: next, animated: false };
    }

    try {
      await transition.ready;
      const enteringDark = next === "dark";
      const animation = root.animate(
        {
          clipPath: enteringDark ? [circle(0), circle(radius)] : [circle(radius), circle(0)],
        },
        {
          duration,
          easing: "ease-in-out",
          fill: "both",
          pseudoElement: enteringDark
            ? "::view-transition-new(root)"
            : "::view-transition-old(root)",
        } as KeyframeAnimationOptions,
      );
      await Promise.all([animation.finished, transition.finished]);
      return { value: next, animated: true };
    } catch (error) {
      if (updateFailure !== undefined) throw updateFailure;
      if (!updateStarted) await update();
      transition.skipTransition?.();
      await transition.finished.catch(() => undefined);
      return { value: next, animated: false };
    }
  } finally {
    if (previousMarker === undefined) delete root.dataset.pnwColorSchemeTransition;
    else root.dataset.pnwColorSchemeTransition = previousMarker;
  }
}

/**
 * 把受控 light / dark 切换包在可降级的圆形 View Transition 中。
 * 同一 document 的并发调用会合并到当前切换，避免重复翻转与无限 z-index。
 */
export function pnwToggleColorSchemeWithTransition(
  options: PnwColorSchemeTransitionOptions,
): Promise<PnwColorSchemeTransitionResult> {
  const ownerDocument = options.ownerDocument
    ?? (typeof document === "undefined" ? undefined : document);
  if (!ownerDocument) return pnwRunColorSchemeTransition(options, undefined);

  const active = pnwActiveColorSchemeTransitions.get(ownerDocument);
  if (active) return active;

  const task = pnwRunColorSchemeTransition(options, ownerDocument).finally(() => {
    if (pnwActiveColorSchemeTransitions.get(ownerDocument) === task) {
      pnwActiveColorSchemeTransitions.delete(ownerDocument);
    }
  });
  pnwActiveColorSchemeTransitions.set(ownerDocument, task);
  return task;
}
