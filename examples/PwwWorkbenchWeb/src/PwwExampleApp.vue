<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from "vue";
import { PNW_VERSION, PnwColorSchemeToggle, PnwIcon, PnwOverlayThemeProvider, PnwPageHeader, PnwRibbonToolButton } from "phoenix-wing";
import pwwSource from "virtual:pww-verification-source";
import PwwVerificationBanner from "./validation/PwwVerificationBanner.vue";
import PwwTabArrangementValidation from "./validation/PwwTabArrangementValidation.vue";
const PwwWorkbench = defineAsyncComponent(() => import("./App.vue"));
const PwwHeaderSlots = defineAsyncComponent(() => import("./validation/PwwHeaderSlotsValidation.vue"));
const pwwHeaderSlots = new URLSearchParams(window.location.search).get("example") === "header";
// This query selects a standalone page, never the dependency source.
const pwwStandaloneWorkbench = new URLSearchParams(window.location.search).get("example") === "workbench";
const pwwTheme = ref<"light" | "dark" | "system">("system");
onMounted(() => { document.title = `Wing 示例 · ${pwwSource.mode === "development" ? "开发验证" : pwwSource.mode === "tarball" ? "本地制品验证" : "Registry 验证"} · ${PNW_VERSION}`; });
</script>

<template>
  <PnwOverlayThemeProvider :color-scheme="pwwTheme">
    <div class="pww-example-app">
      <PwwVerificationBanner :source="pwwSource" :runtime-version="PNW_VERSION" />
      <PnwPageHeader v-if="!pwwStandaloneWorkbench" :title="pwwHeaderSlots ? 'View Header 插槽' : '内部 Tab 与浮窗排列'">
        <template #right>
          <a class="pww-workbench-link" :href="pwwHeaderSlots ? '?' : '?example=header'">{{ pwwHeaderSlots ? '内部 Tab 与浮窗排列' : 'View Header 插槽' }}</a>
          <a class="pww-workbench-link" href="?example=workbench" target="_blank" rel="noopener noreferrer" title="在新标签页中打开完整工作台"><PnwIcon name="window-float" :size="16" />完整工作台示例 · 新标签打开</a>
          <PnwColorSchemeToggle v-model="pwwTheme" />
          <PnwRibbonToolButton label="跟随系统" icon="pnw:settings" display-mode="icon-title" :show-title="true" :active="pwwTheme === 'system'" @click="pwwTheme = 'system'" />
        </template>
      </PnwPageHeader>
      <div class="pww-example-body" :data-example-page="pwwStandaloneWorkbench ? 'workbench' : 'validation'">
        <PwwWorkbench v-if="pwwStandaloneWorkbench" />
        <PwwHeaderSlots v-else-if="pwwHeaderSlots" />
        <PwwTabArrangementValidation v-else :color-scheme="pwwTheme" />
      </div>
    </div>
  </PnwOverlayThemeProvider>
</template>

<style>
html, body, #pww-app { margin:0; width:100%; height:100%; }
.pww-example-app { display:flex; flex-direction:column; height:100dvh; min-width:0; overflow:hidden; font:14px/1.45 system-ui,sans-serif; background:var(--pnw-workbench-default-bg); color:var(--pnw-workbench-default-text); }
.pww-example-app * { box-sizing:border-box; }
.pww-workbench-link { display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 8px; color:var(--pnw-workbench-default-text); font-size:12px; text-decoration:none; white-space:nowrap; }
.pww-workbench-link:hover { background:var(--pnw-workbench-default-hover-bg); }
.pww-example-app :is(button, a, input):focus-visible { outline:2px solid var(--pnw-workbench-default-focus); outline-offset:-2px; }
.pww-example-body { flex:1; min-height:0; min-width:0; overflow:hidden; }
</style>
