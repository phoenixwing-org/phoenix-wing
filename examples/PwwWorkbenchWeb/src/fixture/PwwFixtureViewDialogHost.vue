<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from "vue";
import {
  PnwFloatingPanel,
  pnwCreateViewDialogController,
  type PnwResolvedViewDialogRequest,
  type PnwViewDialogCloseReason,
  type PnwViewDialogHostAdapter,
  type PnwViewDialogOutcome,
} from "phoenix-wing";

interface PwwPartEditorProps {
  readonly partId: string;
  readonly revision: number;
}

interface PwwPartEditorResult {
  readonly partId: string;
  readonly note: string;
  readonly baseRevision: number;
}

const pwwPosition = ref({ x: 420, y: 112 });
const pwwRequest = shallowRef<PnwResolvedViewDialogRequest<unknown>>();
const pwwNote = ref("");
const pwwLastOutcome = ref("尚未打开");
let pwwResolve: ((outcome: PnwViewDialogOutcome<unknown>) => void) | undefined;

function pwwFinish(outcome: PnwViewDialogOutcome<unknown>): void {
  const resolve = pwwResolve;
  pwwResolve = undefined;
  pwwRequest.value = undefined;
  resolve?.(outcome);
}

const pwwWebFloatingAdapter: PnwViewDialogHostAdapter = {
  capabilities: {
    presentation: "web-floating",
    supportsParentRelationship: false,
    keepsParentInteractive: true,
    supportsOutsideParentBounds: false,
    maxOpenDialogs: 1,
  },
  open(request) {
    pwwRequest.value = request;
    pwwNote.value = "";
    return new Promise((resolve) => {
      pwwResolve = resolve;
    });
  },
  async close(_requestId: string, reason: PnwViewDialogCloseReason) {
    pwwFinish({ status: "closed", reason });
  },
};

const pwwController = pnwCreateViewDialogController({
  webFloating: pwwWebFloatingAdapter,
});

async function pwwOpen(): Promise<void> {
  const outcome = await pwwController.open<PwwPartEditorProps, PwwPartEditorResult>({
    requestId: "fixture.part-editor",
    viewId: "fixture.part-editor",
    title: "非模态零件编辑 fixture",
    props: { partId: "P-001", revision: 3 },
    size: { width: 520, height: 320 },
  });
  pwwLastOutcome.value = outcome.status === "submitted"
    ? `已提交 ${outcome.value.partId}（基于 r${outcome.value.baseRevision}）`
    : outcome.status === "closed"
      ? `已关闭：${outcome.reason}`
      : `打开失败：${outcome.code}`;
}

function pwwSubmit(): void {
  const props = pwwRequest.value?.props as PwwPartEditorProps | undefined;
  if (!props) return;
  pwwFinish({
    status: "submitted",
    value: {
      partId: props.partId,
      note: pwwNote.value,
      baseRevision: props.revision,
    } satisfies PwwPartEditorResult,
  });
}

onBeforeUnmount(() => {
  void pwwController.close("fixture.part-editor", "app-exit");
});
</script>

<template>
  <button
    type="button"
    class="pww-view-dialog-trigger"
    title="打开无蒙层 Web fallback"
    @click="pwwOpen"
  >
    对话框
  </button>

  <PnwFloatingPanel
    :open="Boolean(pwwRequest)"
    :position="pwwPosition"
    :title="pwwRequest?.title"
    aria-label="非模态 View 对话框 fixture"
    panel-class="pww-view-dialog-panel"
    layer="hostTools"
    @update:position="pwwPosition = $event"
    @close="pwwController.close('fixture.part-editor', 'window-close')"
  >
    <form class="pww-view-dialog-body" @submit.prevent="pwwSubmit">
      <p>
        这是消费者提供的 renderer。浮窗没有遮罩；打开后仍可操作工作台导航、Primary
        和 Editor。
      </p>
      <label>
        <span>零件</span>
        <strong>{{ (pwwRequest?.props as PwwPartEditorProps | undefined)?.partId }}</strong>
      </label>
      <label>
        <span>备注</span>
        <input v-model="pwwNote" placeholder="输入 fixture 草稿" />
      </label>
      <small>{{ pwwLastOutcome }}</small>
      <div class="pww-view-dialog-actions">
        <button type="button" @click="pwwController.close('fixture.part-editor', 'cancelled')">
          取消
        </button>
        <button type="submit">提交结果</button>
      </div>
    </form>
  </PnwFloatingPanel>
</template>

<style scoped>
.pww-view-dialog-trigger {
  min-width: 52px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pww-view-dialog-trigger:hover,
.pww-view-dialog-trigger:focus-visible {
  background: var(--pnw-control-hover-bg, rgba(148, 163, 184, 0.16));
}

.pww-view-dialog-body {
  display: grid;
  gap: 12px;
  padding: 16px;
  color: var(--pnw-workbench-text, #0f172a);
}

.pww-view-dialog-body p,
.pww-view-dialog-body small {
  margin: 0;
  color: var(--pnw-workbench-muted, #64748b);
}

.pww-view-dialog-body label {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.pww-view-dialog-body input {
  min-width: 0;
  height: 32px;
  box-sizing: border-box;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 4px;
  padding: 0 8px;
  background: var(--pnw-workbench-surface, #fff);
  color: inherit;
}

.pww-view-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:global(.pww-view-dialog-panel) {
  --pnw-floating-panel-width: min(520px, calc(100vw - 16px));
}
</style>
