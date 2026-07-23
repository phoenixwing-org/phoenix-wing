<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import { ElDrawer } from "element-plus";
import type {
  PnwEditorDrawerCloseContext,
  PnwEditorDrawerCloseGuard,
  PnwEditorDrawerMode,
  PnwEditorDrawerSide,
} from "../types/PnwEditorDrawer.js";
import { pnwCanCloseEditorDrawer } from "../utils/pnwEditorDrawer.js";

const pnwOpen = defineModel<boolean>({ default: false });
const pnwSlots = useSlots();

const props = withDefaults(
  defineProps<{
    title?: string;
    ariaLabel?: string;
    editorId?: string;
    pageId?: string;
    tabId?: string;
    resourceKey?: string | number;
    mode?: PnwEditorDrawerMode;
    dirty?: boolean;
    busy?: boolean;
    size?: string | number;
    side?: PnwEditorDrawerSide;
    showHeader?: boolean;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    destroyOnClose?: boolean;
    guardClose?: PnwEditorDrawerCloseGuard;
  }>(),
  {
    title: "",
    ariaLabel: "编辑抽屉",
    mode: "view",
    dirty: false,
    busy: false,
    size: "85%",
    side: "right",
    showHeader: false,
    closeOnBackdrop: true,
    closeOnEscape: true,
    destroyOnClose: false,
  },
);

const emit = defineEmits<{
  opened: [];
  closed: [];
  closeBlocked: [context: PnwEditorDrawerCloseContext];
  guardError: [error: unknown, context: PnwEditorDrawerCloseContext];
}>();

const pnwCheckingClose = ref(false);
const pnwDirection = computed(() => (props.side === "left" ? "ltr" : "rtl"));
const pnwHasHeader = computed(() => props.showHeader || Boolean(pnwSlots.header));

async function pnwBeforeClose(done: () => void) {
  if (pnwCheckingClose.value) return;

  const context: PnwEditorDrawerCloseContext = {
    editorId: props.editorId,
    pageId: props.pageId,
    tabId: props.tabId,
    resourceKey: props.resourceKey,
    mode: props.mode,
    dirty: props.dirty,
  };

  pnwCheckingClose.value = true;
  try {
    const allowed = await pnwCanCloseEditorDrawer(context, props.guardClose);
    if (allowed) {
      done();
      return;
    }
    emit("closeBlocked", context);
  } catch (error) {
    emit("guardError", error, context);
  } finally {
    pnwCheckingClose.value = false;
  }
}
</script>

<template>
  <ElDrawer
    v-model="pnwOpen"
    class="pnw-editor-drawer"
    :title="title"
    :aria-label="ariaLabel"
    :size="size"
    :direction="pnwDirection"
    :with-header="pnwHasHeader"
    :close-on-click-modal="closeOnBackdrop"
    :close-on-press-escape="closeOnEscape"
    :destroy-on-close="destroyOnClose"
    :before-close="pnwBeforeClose"
    @opened="emit('opened')"
    @closed="emit('closed')"
  >
    <template v-if="pnwHasHeader" #header>
      <slot name="header">
        <span class="pnw-editor-drawer__title">{{ title }}</span>
      </slot>
    </template>

    <div
      class="pnw-editor-drawer__surface"
      :data-pnw-editor-mode="mode"
      :data-pnw-editor-id="editorId || undefined"
      :data-pnw-page-id="pageId || undefined"
      :data-pnw-tab-id="tabId || undefined"
      :data-pnw-resource-key="resourceKey ?? undefined"
      :aria-busy="busy || undefined"
    >
      <div v-if="$slots.toolbar" class="pnw-editor-drawer__toolbar">
        <slot name="toolbar" />
      </div>
      <div class="pnw-editor-drawer__body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="pnw-editor-drawer__footer">
        <slot name="footer" />
      </footer>
    </div>
  </ElDrawer>
</template>

<style>
.pnw-editor-drawer {
  max-width: 100vw;
  background: var(--page-bg, #fff);
  border-left: 1px solid var(--border, #e2e8f0);
  box-shadow: -12px 0 32px rgba(15, 23, 42, 0.16);
}

.pnw-editor-drawer.el-drawer.ltr {
  border-right: 1px solid var(--border, #e2e8f0);
  border-left: 0;
  box-shadow: 12px 0 32px rgba(15, 23, 42, 0.16);
}

.pnw-editor-drawer .el-drawer__header {
  min-height: 48px;
  margin: 0;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.pnw-editor-drawer .el-drawer__body {
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.pnw-editor-drawer__title {
  min-width: 0;
  overflow: hidden;
  color: var(--text, #0f172a);
  font-size: 14px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-editor-drawer__surface {
  container-type: inline-size;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: var(--page-bg, #fff);
}

.pnw-editor-drawer__toolbar,
.pnw-editor-drawer__footer {
  box-sizing: border-box;
  flex: 0 0 auto;
  padding: 8px 12px;
  background: var(--panel-head-bg, #f8fafc);
}

.pnw-editor-drawer__toolbar {
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.pnw-editor-drawer__footer {
  border-top: 1px solid var(--border, #e2e8f0);
}

.pnw-editor-drawer__body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 720px) {
  .pnw-editor-drawer {
    width: 100vw !important;
    max-width: 100vw;
  }
}
</style>
