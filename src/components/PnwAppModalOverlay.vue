<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import PnwOverlayThemeProvider from "./PnwOverlayThemeProvider.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    ariaLabel?: string;
    panelClass?: string;
    closeOnBackdrop?: boolean;
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

function onBackdropClick() {
  if (props.closeOnBackdrop) emit("close");
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof window === "undefined") return;
    if (isOpen) {
      window.addEventListener("keydown", onKeydown);
    } else {
      window.removeEventListener("keydown", onKeydown);
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof window !== "undefined") window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="pnw-modal-fade">
      <PnwOverlayThemeProvider
        v-if="open"
        class="pnw-modal-overlay"
        :color-scheme="colorScheme"
        @click.self="onBackdropClick"
      >
        <div
          class="pnw-modal-panel"
          :class="panelClass"
          role="dialog"
          aria-modal="true"
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
