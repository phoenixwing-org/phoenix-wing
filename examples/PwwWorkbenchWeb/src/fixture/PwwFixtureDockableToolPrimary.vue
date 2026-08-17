<script setup lang="ts">
import {
  PnwDockablePrimarySection,
  PnwPrimaryPanel,
} from "phoenix-wing";
import {
  PWW_FIXTURE_RESOURCE_TOOL,
  pwwFixtureResourceToolState,
} from "./PwwFixtureResourceToolState.js";

defineProps<{ activeNodeId: string }>();
</script>

<template>
  <PnwPrimaryPanel title="可停靠工具">
    <template #summary>TOOL · PRIMARY HOST</template>
    <PnwDockablePrimarySection
      v-model:state="pwwFixtureResourceToolState"
      :definition="PWW_FIXTURE_RESOURCE_TOOL"
      :active-view-id="activeNodeId"
    >
      <div class="pww-resource-primary-body">
        工程资源库已停靠；可以重新浮出、折叠、移动首尾或关闭。
      </div>
    </PnwDockablePrimarySection>
    <p v-if="pwwFixtureResourceToolState.mode !== 'primary'" class="pww-resource-primary-empty">
      工具当前为 {{ pwwFixtureResourceToolState.mode }}。
    </p>
  </PnwPrimaryPanel>
</template>

<style scoped>
.pww-resource-primary-body,
.pww-resource-primary-empty {
  margin: 8px;
  color: var(--pnw-workbench-muted, #64748b);
  font-size: 12px;
}
</style>
