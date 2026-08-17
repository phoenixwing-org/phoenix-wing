<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type {
  PnwFloatingWindowStackController,
  PnwFloatingWindowStackSnapshot,
} from "../utils/pnwFloatingWindowStack.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import PnwIcon from "./PnwIcon.vue";

const props = defineProps<{
  stack: PnwFloatingWindowStackController;
}>();

const pnwOpen = ref(false);
const pnwSnapshot = ref<PnwFloatingWindowStackSnapshot>(props.stack.snapshot());
const pnwWindows = computed(() => pnwSnapshot.value.windows);
const pnwCanReattach = computed(() => pnwWindows.value.some((window) => window.canReattach));
const { t: pnwT } = usePnwLocale();
let pnwUnsubscribe: (() => void) | undefined;

function pnwRefresh(): void {
  pnwSnapshot.value = props.stack.snapshot();
  if (pnwSnapshot.value.windows.length === 0) pnwOpen.value = false;
}

function pnwFocusWindow(presentationId: string): void {
  props.stack.focus(presentationId);
  pnwOpen.value = false;
}

function pnwReattachWindow(presentationId: string): void {
  props.stack.reattach(presentationId);
  pnwOpen.value = false;
}

onMounted(() => {
  pnwRefresh();
  pnwUnsubscribe = props.stack.subscribe(pnwRefresh);
});
onBeforeUnmount(() => pnwUnsubscribe?.());
</script>

<template>
  <div v-if="pnwWindows.length > 0" class="pnw-floating-window-menu">
    <button
      type="button"
      class="pnw-floating-window-menu__trigger"
      :aria-label="pnwT('floatingWindows.title')"
      :title="pnwT('floatingWindows.title')"
      :aria-expanded="pnwOpen"
      aria-haspopup="menu"
      @click="pnwOpen = !pnwOpen"
    >
      <PnwIcon name="window-float" :size="16" />
      <span class="pnw-floating-window-menu__count">{{ pnwWindows.length }}</span>
    </button>
    <div
      v-if="pnwOpen"
      class="pnw-floating-window-menu__popup"
      role="menu"
      :aria-label="pnwT('floatingWindows.title')"
      @keydown.esc.stop.prevent="pnwOpen = false"
    >
      <div
        v-for="window in pnwWindows"
        :key="window.presentationId"
        class="pnw-floating-window-menu__item"
        :data-pnw-active="window.active ? 'true' : 'false'"
      >
        <button
          type="button"
          role="menuitem"
          class="pnw-floating-window-menu__focus"
          @click="pnwFocusWindow(window.presentationId)"
        >
          <PnwIcon name="window-float" :size="15" />
          <span>{{ window.title }}</span>
        </button>
        <button
          v-if="window.canReattach"
          type="button"
          class="pnw-floating-window-menu__reattach"
          :aria-label="`${pnwT('viewPresentation.reattach')}：${window.title}`"
          :title="pnwT('viewPresentation.reattach')"
          @click="pnwReattachWindow(window.presentationId)"
        >
          <PnwIcon name="window-reattach" :size="15" />
        </button>
      </div>
      <button
        v-if="pnwCanReattach"
        type="button"
        role="menuitem"
        class="pnw-floating-window-menu__reattach-all"
        @click="stack.reattachAll(); pnwOpen = false"
      >
        {{ pnwT("floatingWindows.reattachAll") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pnw-floating-window-menu {
  position: relative;
  display: inline-flex;
}

.pnw-floating-window-menu__trigger {
  min-width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 5px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
}

.pnw-floating-window-menu__trigger:hover,
.pnw-floating-window-menu__item:hover {
  background: var(--pnw-control-hover-bg, rgb(148 163 184 / 16%));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-floating-window-menu__trigger:focus-visible,
.pnw-floating-window-menu button:focus-visible {
  outline: 2px solid var(--pnw-control-active-text, #2563eb);
  outline-offset: 1px;
}

.pnw-floating-window-menu__count {
  min-width: 14px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.pnw-floating-window-menu__popup {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: var(--pnw-workbench-overlay-popover-z-index, 1600);
  min-width: 210px;
  padding: 5px;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: 6px;
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  box-shadow: 0 10px 28px rgb(15 23 42 / 18%);
}

.pnw-floating-window-menu__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  border-radius: 4px;
}

.pnw-floating-window-menu__item[data-pnw-active="true"] {
  color: var(--pnw-control-active-text, #2563eb);
}

.pnw-floating-window-menu__focus,
.pnw-floating-window-menu__reattach,
.pnw-floating-window-menu__reattach-all {
  min-height: 28px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pnw-floating-window-menu__focus {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 7px;
  text-align: left;
}

.pnw-floating-window-menu__focus span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-floating-window-menu__reattach {
  display: inline-grid;
  place-items: center;
  padding: 0;
}

.pnw-floating-window-menu__reattach-all {
  width: 100%;
  margin-top: 4px;
  padding: 0 7px;
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  text-align: left;
}
</style>
