<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import PnwOverlayThemeProvider from "../components/PnwOverlayThemeProvider.vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwWorkbenchTabAction } from "../utils/pnwWorkbenchTabActions.js";
const props = defineProps<{
  x: number; y: number; colorScheme?: PnwColorScheme; label: string;
  items: readonly { action: PnwWorkbenchTabAction; label: string; disabled: boolean }[];
}>();
const emit = defineEmits<{ action: [action: PnwWorkbenchTabAction]; close: [restoreFocus: boolean] }>();
const pnwMenu = ref<HTMLElement>();
const pnwLeft = ref(props.x); const pnwTop = ref(props.y);
let pnwDisposed = false;
function pnwButtons() { return [...(pnwMenu.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]; }
function pnwFocusFirst() { (pnwButtons()[0] ?? pnwMenu.value)?.focus({ preventScroll: true }); }
watch(() => props.items, () => {
  const active = document.activeElement;
  if (active === document.body || active === pnwMenu.value
    || (pnwMenu.value?.contains(active) && (active as HTMLButtonElement).disabled)) pnwFocusFirst();
}, { flush: "post" });
function pnwKey(event: KeyboardEvent) {
  if (event.key === "Escape" || event.key === "Tab") {
    if (event.key === "Escape") event.preventDefault();
    emit("close", true); return;
  }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const buttons = pnwButtons(); if (!buttons.length) return;
  const current = buttons.findIndex(button => button === document.activeElement);
  const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
    : current < 0 ? (event.key === "ArrowDown" ? 0 : buttons.length - 1)
    : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[index].focus();
}
function pnwOutside(event: Event) {
  if (!pnwMenu.value?.contains(event.target as Node)) emit("close", event.type === "scroll");
}
function pnwResize() { emit("close", true); }
onMounted(async () => {
  await nextTick();
  if (pnwDisposed) return;
  const rect = pnwMenu.value?.getBoundingClientRect();
  pnwLeft.value = Math.max(8, Math.min(props.x, window.innerWidth - (rect?.width ?? 224) - 8));
  pnwTop.value = Math.max(8, Math.min(props.y, window.innerHeight - (rect?.height ?? 200) - 8));
  // Commit the clamped position before focus; the original pointer/Tab bottom
  // can be outside the viewport and otherwise trigger an outside scroll-close.
  await nextTick();
  if (pnwDisposed) return;
  pnwFocusFirst();
  document.addEventListener("pointerdown", pnwOutside, true);
  document.addEventListener("scroll", pnwOutside, true);
  window.addEventListener("resize", pnwResize);
});
onUnmounted(() => {
  pnwDisposed = true;
  document.removeEventListener("pointerdown", pnwOutside, true);
  document.removeEventListener("scroll", pnwOutside, true);
  window.removeEventListener("resize", pnwResize);
});
</script>
<template>
  <Teleport to="body">
    <PnwOverlayThemeProvider :color-scheme="colorScheme">
      <div ref="pnwMenu" class="pnw-tab-context-menu" role="menu" tabindex="-1" :aria-label="label"
        :style="{ left: `${pnwLeft}px`, top: `${pnwTop}px` }" @keydown.stop="pnwKey" @contextmenu.prevent>
        <button v-for="item in items" :key="item.action" type="button" role="menuitem" tabindex="-1"
          :data-pnw-tab-action="item.action" :disabled="item.disabled" @click="emit('action', item.action)">{{ item.label }}</button>
      </div>
    </PnwOverlayThemeProvider>
  </Teleport>
</template>
<style scoped>
.pnw-tab-context-menu { box-sizing: border-box; position: fixed; z-index: var(--pnw-workbench-overlay-popover-z-index, 1600); width: 224px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); overflow: auto; padding: 5px; border: 1px solid var(--pnw-workbench-default-border); border-radius: 6px; background: var(--pnw-workbench-default-surface); color: var(--pnw-workbench-default-text); box-shadow: var(--pnw-workbench-default-overlay-shadow); }
.pnw-tab-context-menu button { display: block; width: 100%; padding: 7px 12px; border: 0; border-radius: 4px; background: transparent; color: inherit; font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
.pnw-tab-context-menu button:hover:not(:disabled), .pnw-tab-context-menu button:focus-visible { background: var(--pnw-workbench-default-hover-bg); outline: 2px solid var(--pnw-workbench-default-focus); outline-offset: -2px; }
.pnw-tab-context-menu button:disabled { color: var(--pnw-workbench-default-muted); opacity: .6; cursor: default; }
</style>
