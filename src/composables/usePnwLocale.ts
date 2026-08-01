import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from "vue";
import type {
  PnwLocale,
  PnwLocaleMessageValues,
} from "../types/PnwLocale.js";
import {
  PNW_DEFAULT_LOCALE,
  pnwNormalizeLocale,
  pnwTranslateLocaleMessage,
  type PnwLocaleMessageKey,
} from "../utils/pnwLocale.js";

export interface PnwLocaleContext {
  readonly locale: ComputedRef<PnwLocale>;
  readonly t: (
    key: PnwLocaleMessageKey,
    values?: PnwLocaleMessageValues,
  ) => string;
}

const PNW_LOCALE_INJECTION_KEY: InjectionKey<ComputedRef<PnwLocale>> = Symbol("pnwLocale");

/** 在一个 Wing 组件子树中提供受宿主控制的 locale；不会持久化或修改宿主状态。 */
export function pnwProvideLocale(
  locale: MaybeRefOrGetter<PnwLocale | undefined>,
): ComputedRef<PnwLocale> {
  const resolved = computed(() => pnwNormalizeLocale(toValue(locale)));
  provide(PNW_LOCALE_INJECTION_KEY, resolved);
  return resolved;
}

/** 读取最近的 Wing locale；显式参数优先，独立组件缺省为 zh-CN。 */
export function usePnwLocale(
  locale?: MaybeRefOrGetter<PnwLocale | undefined>,
): PnwLocaleContext {
  const inherited = inject(PNW_LOCALE_INJECTION_KEY, undefined);
  const resolved = computed(() => pnwNormalizeLocale(
    locale === undefined ? inherited?.value ?? PNW_DEFAULT_LOCALE : toValue(locale),
  ));
  return {
    locale: resolved,
    t: (key, values) => pnwTranslateLocaleMessage(resolved.value, key, values),
  };
}
