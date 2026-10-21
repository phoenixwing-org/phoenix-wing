<script setup lang="ts">
import { ref, onUnmounted, watch } from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import { pnwGetDocumentModalStack, type PnwModalLayer } from "../utils/pnwModalStack.js";
import PnwOverlayThemeProvider from "./PnwOverlayThemeProvider.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    ariaLabel?: string;
    panelClass?: string;
    closeOnBackdrop?: boolean;
    zIndex?: number;
    parentLayer?: PnwModalLayer;
    initialFocus?: (panel: HTMLElement) => HTMLElement | null | undefined;
    /** 显式覆盖全局 overlay scheme；缺省跟随 Host 的 pnwApplyColorScheme。 */
    colorScheme?: PnwColorScheme;
  }>(),
  {
    ariaLabel: "对话框",
    panelClass: "",
    closeOnBackdrop: true,
  },
);

const emit = defineEmits<{
  close: [];
}>();

const pnwPanel = ref<HTMLElement | null>(null);
const pnwTeleportTarget = ref<string | HTMLElement>("body");
watch(() => props.open, isOpen => {
  if (isOpen && typeof document !== "undefined") {
    const parent = props.parentLayer ?? pnwGetDocumentModalStack(document).topLayer;
    pnwTeleportTarget.value = parent?.childContainer ?? "body";
  }
}, { immediate: true, flush: "sync" });
const pnwLayerState = ref({ zIndex: 2000, isTopmost: false });
let pnwLayer: PnwModalLayer | undefined;
function onBackdropClick() {
  if (props.closeOnBackdrop && pnwLayer?.state.isTopmost) emit("close");
}
watch([() => props.open, pnwPanel], ([isOpen, panel]) => {
  if (!isOpen || !panel) { pnwLayer?.dispose(); pnwLayer = undefined; return; }
  if (pnwLayer) return;
  const overlay = panel.parentElement;
  const css = panel.ownerDocument.defaultView?.getComputedStyle(overlay ?? panel);
  const configured = Number.parseFloat(css?.getPropertyValue("--pnw-overlay-modal-z-index")
    || css?.getPropertyValue("--pnw-workbench-overlay-modal") || "2000");
  pnwLayer = pnwGetDocumentModalStack(panel.ownerDocument).register({
    element: () => pnwPanel.value,
    baseZIndex: props.zIndex ?? (Number.isFinite(configured) ? configured : 2000),
    parentLayer: props.parentLayer,
    initialFocus: element => props.initialFocus?.(element),
    onChange: state => { pnwLayerState.value = state; },
    onClose: () => emit("close"),
  });
}, { flush: "post" });
watch(() => props.zIndex, value => { if (value !== undefined) pnwLayer?.updateBaseZIndex(value); });
onUnmounted(() => pnwLayer?.dispose());
defineExpose({ focus: () => pnwLayer?.focus() });
</script>

<template>
  <Teleport :to="pnwTeleportTarget">
    <Transition name="pnw-modal-fade">
      <PnwOverlayThemeProvider
        v-if="open"
        class="pnw-modal-overlay"
        :style="{ zIndex: pnwLayerState.zIndex }"
        :color-scheme="colorScheme"
        @click.self="onBackdropClick"
      >
        <div
          ref="pnwPanel"
          tabindex="-1"
          class="pnw-modal-panel"
          :class="panelClass"
          role="dialog"
          :aria-modal="pnwLayerState.isTopmost"
          :aria-label="ariaLabel"
        >
          <slot />
        </div>
      </PnwOverlayThemeProvider>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pnw-modal-overlay {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  position: fixed;
  inset: 0;
  z-index: var(--pnw-overlay-modal-z-index, var(--pnw-workbench-overlay-modal, 2000));
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(
    --pnw-overlay-backdrop,
    var(--pnw-workbench-default-overlay-backdrop, rgba(15, 23, 42, 0.48))
  );
  backdrop-filter: blur(2px);
}

.pnw-modal-panel {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  width: min(720px, 100%);
  max-height: min(88vh, 920px);
  overflow: auto;
  border-radius: 12px;
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #cbd5e1));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  box-shadow: var(
    --pnw-overlay-shadow,
    var(--pnw-workbench-default-overlay-shadow, 0 24px 48px rgba(15, 23, 42, 0.18))
  );
}

.pnw-modal-fade-enter-active,
.pnw-modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.pnw-modal-fade-enter-active .pnw-modal-panel,
.pnw-modal-fade-leave-active .pnw-modal-panel {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.pnw-modal-fade-enter-from,
.pnw-modal-fade-leave-to {
  opacity: 0;
}

.pnw-modal-fade-enter-from .pnw-modal-panel,
.pnw-modal-fade-leave-to .pnw-modal-panel {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
