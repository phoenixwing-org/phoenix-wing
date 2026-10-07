<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import {
  PnwPageLayout, PnwWorkbenchShell, pnwWorkbenchTabActionTargets,
  type PnwColorScheme, type PnwLocale, type PnwWorkbenchTabAction,
  type PnwWorkbenchTabActionRequest, type PnwWorkbenchTabBarPlacement, type PnwWorkbenchTabItem,
} from "phoenix-wing";

defineProps<{ colorScheme?: PnwColorScheme }>();
const PWW_ACTIONS: readonly PnwWorkbenchTabAction[] = ["refresh", "close", "close-others", "close-right", "close-all"];
const pwwIds = ref(["a", "b", "c"]);
const pwwActive = ref("a");
const pwwDirty = ref(false);
const pwwBusy = ref(false);
const pwwEnabled = ref(true);
const pwwNarrow = ref(false);
const pwwPlacement = ref<PnwWorkbenchTabBarPlacement>("header");
const pwwLocale = ref<PnwLocale>("zh-CN");
const pwwRefresh = ref<Record<string, number>>({});
const pwwLog = ref<string[]>([]);
const pwwResetButton = ref<HTMLButtonElement>();
const pwwTabs = computed<PnwWorkbenchTabItem[]>(() => pwwIds.value.map(id => ({
  id, pageId: "example", title: `示例 ${id.toUpperCase()}`, dirty: id === "b" && pwwDirty.value,
})));
function pwwDisabled(request: PnwWorkbenchTabActionRequest) {
  const targets = pnwWorkbenchTabActionTargets(pwwTabs.value, request);
  return !pwwEnabled.value || pwwBusy.value || targets.length === 0
    || targets.some(id => pwwTabs.value.find(tab => tab.id === id)?.dirty);
}
async function pwwRun(request: PnwWorkbenchTabActionRequest) {
  // Recheck at execution time: a disabled UI is not a resource mutation guard.
  if (pwwDisabled(request)) {
    pwwLog.value.unshift(`已阻止 ${request.action} @ ${request.tabId}`);
    return;
  }
  const targets = pnwWorkbenchTabActionTargets(pwwTabs.value, request);
  pwwLog.value.unshift(`${request.action} @ ${request.tabId} → [${targets.join(", ")}]`);
  pwwLog.value = pwwLog.value.slice(0, 12);
  if (request.action === "refresh") {
    for (const id of targets) pwwRefresh.value[id] = (pwwRefresh.value[id] ?? 0) + 1;
  } else {
    pwwIds.value = pwwIds.value.filter(id => !targets.includes(id));
    if (!pwwIds.value.includes(pwwActive.value)) pwwActive.value = pwwIds.value[0] ?? "";
    // The host owns the empty-workbench focus destination when TabBar unmounts.
    if (!pwwIds.value.length) { await nextTick(); pwwResetButton.value?.focus(); }
  }
}
function pwwReset() {
  pwwIds.value = ["a", "b", "c"]; pwwActive.value = "a";
  pwwDirty.value = false; pwwBusy.value = false; pwwEnabled.value = true;
  pwwRefresh.value = {}; pwwLog.value = [];
}
</script>

<template>
  <div class="pww-tab-menu-validation">
    <div class="pww-tab-menu-controls" role="group" aria-label="菜单验收配置">
      <label>标签位置 <select v-model="pwwPlacement" aria-label="标签位置">
        <option value="header">Header</option><option value="after-navigation">导航后</option><option value="editor-bottom">Editor 底部</option>
      </select></label>
      <label>语言 <select v-model="pwwLocale" aria-label="菜单语言"><option value="zh-CN">中文</option><option value="en-US">English</option></select></label>
      <label><input v-model="pwwEnabled" type="checkbox" />启用菜单</label>
      <label><input v-model="pwwDirty" type="checkbox" />保护未保存的 B</label>
      <label><input v-model="pwwBusy" type="checkbox" />全部忙碌</label>
      <label><input v-model="pwwNarrow" type="checkbox" />窄容器 360px</label>
      <button ref="pwwResetButton" type="button" @click="pwwReset">重置示例</button>
    </div>
    <p class="pww-tab-menu-hint">右键非当前标签，或聚焦标签按 Shift+F10 / 菜单键。↑↓ / Home / End 导航，Enter / Space 执行，Esc 返回，Tab 离开。所有数据独立合成，只在内存中变化。</p>
    <div class="pww-tab-menu-frame" :class="{ 'pww-tab-menu-frame--narrow': pwwNarrow }">
      <PnwWorkbenchShell :nodes="[]" :tabs="pwwTabs" :active-tab-id="pwwActive"
        :tab-context-actions="pwwEnabled ? PWW_ACTIONS : []" :tab-action-disabled="pwwDisabled"
        :closing-all-tabs="pwwBusy" :tab-bar-placement="pwwPlacement" :locale="pwwLocale"
        :color-scheme="colorScheme" :show-editor-maximize-action="false"
        brand-title="Wing 菜单验收" :show-footer="false"
        @select-tab="pwwActive = $event" @close-tab="pwwRun({ action: 'close', tabId: $event })" @tab-action="pwwRun">
        <PnwPageLayout title="目标与执行结果">
          <p data-pww-active>当前标签：{{ pwwActive || '无' }}</p>
          <p data-pww-tabs>剩余标签：{{ pwwIds.join(', ') || '无' }}</p>
          <p v-for="id in pwwIds" :key="id" :data-pww-refresh="id">{{ id }} 刷新次数：{{ pwwRefresh[id] ?? 0 }}</p>
          <p v-if="!pwwIds.length">所有标签已关闭，焦点返回「重置示例」。</p>
          <p>示例宿主策略：刷新或关闭范围含未保存的 B 时，整项禁用；忙碌时全部禁用。执行前再次核验，Wing 不代替宿主保存、丢弃或关闭资源。</p>
          <ol data-pww-action-log aria-label="菜单操作记录" aria-live="polite"><li v-for="(entry, index) in pwwLog" :key="index">{{ entry }}</li></ol>
        </PnwPageLayout>
      </PnwWorkbenchShell>
    </div>
  </div>
</template>

<style scoped>
.pww-tab-menu-validation { display:flex; flex-direction:column; height:100%; min-height:0; padding:12px; gap:10px; overflow:auto; }
.pww-tab-menu-controls { display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; }
.pww-tab-menu-controls label { display:inline-flex; align-items:center; gap:5px; }
.pww-tab-menu-controls :is(select, button) { padding:5px 8px; border:1px solid var(--pnw-workbench-default-border); border-radius:4px; color:inherit; background:var(--pnw-workbench-default-surface); font:inherit; }
.pww-tab-menu-hint { margin:0; color:var(--pnw-workbench-default-muted); }
.pww-tab-menu-frame { flex:1; min-height:380px; width:100%; border:1px solid var(--pnw-workbench-default-border); }
.pww-tab-menu-frame--narrow { width:360px; max-width:100%; }
</style>
