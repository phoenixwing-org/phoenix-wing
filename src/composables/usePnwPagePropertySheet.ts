import { onMounted, onUnmounted } from "vue";
import { pnwRegisterPageProperties, pnwUnregisterPageProperties } from "./pnwPagePropertiesHost.js";
import type { PnwPagePropertiesSheet } from "../types/pnwPageProperties.js";

type SheetBuilder = () => Omit<PnwPagePropertiesSheet, "pageId">;

/**
 * 业务页注册侧栏属性表；KeepAlive 下多页并存时由壳层 `pnwSetPropertiesActivePage` 决定展示哪一份。
 * build 一次、onMounted 注册：字段 value / hidden / options 须为稳定 computed/ref。
 */
export function usePnwPagePropertySheet(pageId: string, build: SheetBuilder) {
  const sheet: PnwPagePropertiesSheet = { pageId, ...build() };
  onMounted(() => pnwRegisterPageProperties(sheet));
  onUnmounted(() => pnwUnregisterPageProperties(pageId));
}
