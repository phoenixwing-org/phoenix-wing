<script setup lang="ts">
import {
  PnwDockablePrimarySection,
  PnwDockableToolWindow,
  type PnwDockableToolDefinition,
  type PnwDockableToolState,
} from "phoenix-wing";

defineProps<{
  definition: PnwDockableToolDefinition;
  activeViewId: string;
}>();

const pwwState = defineModel<PnwDockableToolState>("state", { required: true });
</script>

<template>
  <!-- 放入应用级 Primary 组合；Host 在 dockPrimary 时同时请求显示 Primary。 -->
  <PnwDockablePrimarySection
    v-model:state="pwwState"
    :definition="definition"
    :active-view-id="activeViewId"
  >
    <div class="pww-dockable-tool-body">
      Consumer 工具内容；业务状态由上层 store 持有。
    </div>
  </PnwDockablePrimarySection>

  <!-- 可放在 App 或 Shell 附近；内容通过 PnwFloatingPanel Teleport 到 body。 -->
  <PnwDockableToolWindow
    v-model:state="pwwState"
    :definition="definition"
    :active-view-id="activeViewId"
  >
    <div class="pww-dockable-tool-body">
      Consumer 工具内容；浮动与停靠状态互斥。
    </div>
  </PnwDockableToolWindow>
</template>

<style scoped>
.pww-dockable-tool-body {
  padding: 8px;
  color: var(--pnw-workbench-text, #0f172a);
}
</style>
