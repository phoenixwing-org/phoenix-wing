<script setup lang="ts">
import { computed } from "vue";
import type { PwwVerificationSource } from "./PwwVerificationSource.js";
const props = defineProps<{ source: PwwVerificationSource; runtimeVersion: string }>();
const pwwMismatch = computed(() => props.runtimeVersion !== props.source.version);
</script>

<template>
  <aside class="pww-verification-banner" aria-label="验证来源" :data-source="source.mode">
    <strong>{{ source.mode === "development" ? "开发验证 · 本地构建" : source.mode === "tarball" ? "本地制品验证 · 未发布" : "Registry 验证 · npm 正式包" }}</strong>
    <code>phoenix-wing@{{ runtimeVersion }}</code>
    <template v-if="source.mode === 'development'">
      <span>{{ source.branch }}</span>
      <code :title="source.commit">{{ source.commit.slice(0, 12) }}</code>
      <span>{{ source.dirty ? "含未提交修改" : "工作树干净" }}</span>
    </template>
    <span v-else>隔离安装 · 精确版本 · 无源码替代</span>
    <small v-if="source.mode === 'tarball'" :title="source.sha256">SHA-256 {{ source.sha256.slice(0, 12) }}</small>
    <small :title="source.checkedAt">{{ source.mode === 'development' ? "启动快照；不代表 Registry 验收" : source.mode === 'tarball' ? "本地归档；不代表 Registry 发布或完整验收" : "已安装正式包；不代表全部测试通过" }}</small>
    <strong v-if="pwwMismatch" role="alert">版本不匹配：预期 {{ source.version }}，请重新构建后验证</strong>
  </aside>
</template>

<style scoped>
.pww-verification-banner { display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; flex:none; padding:8px 12px; border-bottom:1px solid var(--pnw-workbench-default-border); border-left:4px solid var(--pnw-workbench-default-focus); background:var(--pnw-workbench-default-surface); color:var(--pnw-workbench-default-text); font-size:12px; overflow-wrap:anywhere; }
.pww-verification-banner[data-source="registry"] { border-left-style:double; border-left-width:6px; }
small { color:var(--pnw-workbench-default-muted); }
[role="alert"] { flex-basis:100%; }
</style>
