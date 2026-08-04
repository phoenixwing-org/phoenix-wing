import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";
import {
  pnwGetAppliedColorScheme,
  pnwOnAppliedColorSchemeChange,
  pnwResolveColorScheme,
  type PnwColorScheme,
  type PnwResolvedColorScheme,
} from "../utils/pnwColorScheme.js";

const PNW_SYSTEM_COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/**
 * 解析 Teleport 浮层应携带的确定主题。
 * 显式 colorScheme 优先；否则跟随 Host 最近一次 pnwApplyColorScheme 调用。
 */
export function usePnwOverlayTheme(
  colorScheme?: MaybeRefOrGetter<PnwColorScheme | undefined>,
): ComputedRef<PnwResolvedColorScheme> {
  const pnwAppliedScheme = ref(pnwGetAppliedColorScheme());
  const pnwSystemRevision = ref(0);
  let pnwStopAppliedScheme: (() => void) | undefined;
  let pnwSystemMedia: MediaQueryList | undefined;

  const pnwResolvedScheme = computed<PnwResolvedColorScheme>(() => {
    void pnwSystemRevision.value;
    const explicitScheme = colorScheme === undefined ? undefined : toValue(colorScheme);
    return explicitScheme === undefined
      ? pnwAppliedScheme.value
      : pnwResolveColorScheme(explicitScheme);
  });

  const pnwHandleSystemSchemeChange = (): void => {
    const explicitScheme = colorScheme === undefined ? undefined : toValue(colorScheme);
    if (explicitScheme === "system") pnwSystemRevision.value += 1;
  };

  onMounted(() => {
    pnwStopAppliedScheme = pnwOnAppliedColorSchemeChange((scheme) => {
      pnwAppliedScheme.value = scheme;
    });
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      pnwSystemMedia = window.matchMedia(PNW_SYSTEM_COLOR_SCHEME_QUERY);
      pnwSystemMedia.addEventListener("change", pnwHandleSystemSchemeChange);
    }
  });

  onUnmounted(() => {
    pnwStopAppliedScheme?.();
    pnwSystemMedia?.removeEventListener("change", pnwHandleSystemSchemeChange);
  });

  return pnwResolvedScheme;
}
