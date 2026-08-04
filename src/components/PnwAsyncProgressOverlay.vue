<script setup lang="ts">
/** 异步任务进度浮层 — 纯视图。 */

import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ElProgress } from "element-plus";
import { usePnwAsyncTaskStore } from "../stores/pnwAsyncTasks";
import { pnwAverageFileDuration, pnwFastestFileDuration, pnwSlowestFileDuration, pnwFormatDuration } from "../utils/pnwAsyncProgress";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import PnwOverlayThemeProvider from "./PnwOverlayThemeProvider.vue";

defineProps<{
  /** 显式覆盖全局 overlay scheme；缺省跟随 Host 的 pnwApplyColorScheme。 */
  colorScheme?: PnwColorScheme;
}>();

const store = usePnwAsyncTaskStore();
const expandedTaskId = ref<string | null>(null);
const showTiming = ref(true);
const userCollapsed = new Set<string>();
const timingScrollRef = ref<HTMLElement | null>(null);

watch(
  () => store.taskList.flatMap((t) => t.fileTimings),
  () => {
    nextTick(() => {
      const el = timingScrollRef.value;
      if (el && showTiming.value) el.scrollTop = el.scrollHeight;
    });
  },
);

// 自动展开 running 任务
watch(
  () => store.taskList.map((t) => t.taskId + ":" + t.status),
  (_, old) => {
    if (!old) return;
    for (const t of store.taskList) {
      if (t.status === "running" && !userCollapsed.has(t.taskId)) {
        expandedTaskId.value = t.taskId;
        nextTick(scrollLog);
        return;
      }
    }
  },
);

// 任务完成且最小化 → 弹出完成提示
const toast = ref<{ taskName: string; status: string } | null>(null);
const toastTimer = ref<ReturnType<typeof setTimeout> | null>(null);
watch(() => store.hasRunning, (running, old) => {
  if (old && !running && store.taskList.length > 0 && store.overlayMinimized) {
    const last = store.taskList[store.taskList.length - 1];
    if (last) {
      toast.value = { taskName: last.taskName, status: last.status };
      toastTimer.value = setTimeout(() => { toast.value = null; }, 5000);
    }
  }
});
function dismissToast() { toast.value = null; if (toastTimer.value) clearTimeout(toastTimer.value); }
onBeforeUnmount(() => { if (toastTimer.value) clearTimeout(toastTimer.value); });

function scrollLog() {
  nextTick(() => {
    document.querySelectorAll(".async-logs").forEach((el) => { el.scrollTop = el.scrollHeight; });
  });
}

function toggleExpand(id: string) {
  if (expandedTaskId.value === id) { expandedTaskId.value = null; userCollapsed.add(id); }
  else { expandedTaskId.value = id; userCollapsed.delete(id); scrollLog(); }
}

function openFullscreen(id: string) { expandedTaskId.value = id; store.setFullscreen(true); scrollLog(); }
function minimizeFromFullscreen() { store.setMinimized(true); }

const visible = computed(() => store.taskList.length > 0);

function label(k: string) { return k === "fcstd-scan" ? "扫描" : "测试"; }
function statusTxt(s: string) {
  const m: Record<string, string> = { running: "进行中", done: "完成", error: "失败", cancelled: "已取消", orphaned: "已中断" };
  return m[s] || s;
}
function subLine(t: any) {
  if (t.status !== "running") return null;
  const s = t.steps?.[t.currentStep ?? -1];
  if (!s) return null;
  const p = [s.label];
  if (s.total > 0) p.push(`${s.processed}/${s.total}`);
  if (s.currentFile) p.push(s.currentFile);

  // 所有步骤 100% 但仍 running → 后端在跑重活，给用户信心
  if (t.steps?.every((st: any) => st.percent >= 100) && t.steps?.length > 0) {
    p.push(elapsed(t));
  }
  return p.join(" · ");
}

/** 从 startedAt 计算已耗时，返回如 "已耗时 2m30s" */
function elapsed(t: any): string {
  if (!t.startedAt) return "";
  const ms = Date.now() - new Date(t.startedAt).getTime();
  if (ms < 1000) return "刚刚开始";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `已耗时 ${sec}s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `已耗时 ${min}m${s}s`;
}
</script>

<template>
  <Teleport to="body">
    <PnwOverlayThemeProvider
      v-if="visible || toast"
      class="pnw-async-progress-theme-host"
      :color-scheme="colorScheme"
    >
    <!-- ====== 全屏 ====== -->
    <Transition name="fade">
      <div v-if="visible && store.fullscreen" class="pnw-backdrop" @click.self="minimizeFromFullscreen">
        <div class="pnw-fs-panel">
          <div class="pnw-fs-head">
            <span class="pnw-title">后台任务</span>
            <button class="pnw-btn-icon" title="恢复" @click="minimizeFromFullscreen">⤡</button>
          </div>
          <div class="pnw-list">
            <div v-for="t in store.taskList" :key="t.taskId" class="pnw-card" :class="['pnw-card-'+t.status]">
              <div class="pnw-row" @click="toggleExpand(t.taskId)">
                <span class="pnw-badge">{{ label(t.kind) }}</span>
                <span class="pnw-name">{{ t.taskName }}</span>
                <el-progress :percentage="t.progressPercent" :stroke-width="6" :show-text="true" class="pnw-bar"
                  :status="t.status==='error'?'exception':t.status==='done'?'success':undefined" />
                <span class="pnw-sts" :class="'pnw-sts-'+t.status">{{ statusTxt(t.status) }}</span>
                <span class="pnw-arrow">{{ expandedTaskId===t.taskId ? '▾' : '▸' }}</span>
              </div>
              <div v-if="subLine(t)" class="pnw-sub">{{ subLine(t) }}</div>
              <div v-if="expandedTaskId===t.taskId" class="pnw-detail">
                <div v-for="s in t.steps" :key="s.index" class="pnw-step">
                  <span class="pnw-si">{{ s.status==='done'?'✓':s.status==='active'?'⟳':s.status==='error'?'✗':'○' }}</span>
                  <span class="pnw-sl">{{ s.label }}</span>
                  <el-progress :percentage="Math.min(100,Math.max(0,+(s.percent>=100&&t.status==='running'?99:s.percent)||0))" :stroke-width="4" :show-text="false" :striped="s.percent>=100&&t.status==='running'" :striped-flow="s.percent>=100&&t.status==='running'" class="pnw-sb" />
                  <span class="pnw-sn">{{ s.processed }}/{{ s.total||'-' }}</span>
                </div>
                <div v-if="t.steps.some((s) => s.errors.length)" class="pnw-errs">
                  <div v-for="s in t.steps.filter((s:any)=>s.errors.length)" :key="'e'+s.index">
                    <div v-for="(e, i) in s.errors.slice(0, 5)" :key="i" class="pnw-err">
                      <span class="pnw-ef">{{ e.file }}</span><span class="pnw-em">{{ e.error }}</span>
                    </div>
                    <div v-if="s.errors.length>5" class="pnw-emore">... 还有 {{ s.errors.length-5 }} 个</div>
                  </div>
                </div>
                <div v-if="t.logs?.length" class="pnw-logs">
                  <div v-for="(l,i) in t.logs.slice(-30)" :key="i" class="pnw-logln">{{ l }}</div>
                </div>
                <div v-if="store.fullscreen && t.fileTimings?.length" class="pnw-timing-block">
                  <div class="pnw-timing-head" @click="showTiming = !showTiming">
                    <span>进度条目 ({{ t.fileTimings.length }})</span>
                    <span class="pnw-timing-summary">平均 {{ pnwFormatDuration(pnwAverageFileDuration(t.fileTimings)) }} · 最快 {{ pnwFormatDuration(pnwFastestFileDuration(t.fileTimings)) }} · 最慢 {{ pnwFormatDuration(pnwSlowestFileDuration(t.fileTimings)) }}</span>
                    <span class="pnw-arrow">{{ showTiming ? '▾' : '▸' }}</span>
                  </div>
                  <div v-if="showTiming" ref="timingScrollRef" class="pnw-timing-table-wrap">
                    <table class="pnw-timing-table"><thead><tr><th>文件</th><th>条目</th><th class="r">耗时</th><th>状态</th></tr></thead>
                      <tbody><tr v-for="(r,ri) in t.fileTimings.slice(-100)" :key="ri" :class="r.success?'':'failed'"><td class="mono" :title="r.file">{{ (r.file.split('/').pop()||r.file) }}</td><td>{{ r.phase }}</td><td class="r">{{ pnwFormatDuration(r.duration) }}</td><td :class="r.success?'ok':'fail'">{{ r.success?'✓':'✗' }}</td></tr></tbody>
                    </table>
                  </div>
                </div>
                <div class="pnw-acts">
                  <button v-if="t.status==='running'" class="pnw-abtn pause" @click.stop="store.cancelTask(t.taskId)">⏸ 暂停</button>
                  <button v-if="t.status==='cancelled'" class="pnw-abtn resume" @click.stop="$emit('resumeTask', t.taskId)">▶ 继续</button>
                  <button v-if="t.status!=='running' && !t.confirmed" class="pnw-abtn confirm" @click.stop="store.confirmTask(t.taskId)">✓ 确认</button>
                  <button v-if="t.status!=='running'" class="pnw-abtn dismiss" @click.stop="store.removeTask(t.taskId)">✕ 删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ====== 浮动 ====== -->
    <Transition name="fade">
      <div v-if="visible && !store.overlayMinimized && !store.fullscreen" class="pnw-overlay">
        <div class="pnw-panel">
          <div class="pnw-head">
            <span class="pnw-title">后台任务 ({{ store.taskList.length }})</span>
            <div class="pnw-btns">
              <button class="pnw-btn-icon" title="最小化" @click="store.setMinimized(true)">_</button>
              <button class="pnw-btn-icon" title="最大化" @click="openFullscreen(store.taskList[0]?.taskId||'')">□</button>
            </div>
          </div>
          <div class="pnw-list">
            <div v-for="t in store.taskList" :key="t.taskId" class="pnw-card" :class="['pnw-card-'+t.status]">
              <div class="pnw-row" @click="toggleExpand(t.taskId)">
                <span class="pnw-badge">{{ label(t.kind) }}</span>
                <span class="pnw-name">{{ t.taskName }}</span>
                <el-progress :percentage="t.progressPercent" :stroke-width="6" :show-text="true" class="pnw-bar"
                  :status="t.status==='error'?'exception':t.status==='done'?'success':undefined" />
                <span class="pnw-sts" :class="'pnw-sts-'+t.status">{{ statusTxt(t.status) }}</span>
                <span class="pnw-arrow">{{ expandedTaskId===t.taskId ? '▾' : '▸' }}</span>
              </div>
              <div v-if="subLine(t)" class="pnw-sub">{{ subLine(t) }}</div>
              <div v-if="expandedTaskId===t.taskId" class="pnw-detail">
                <div v-for="s in t.steps" :key="s.index" class="pnw-step">
                  <span class="pnw-si">{{ s.status==='done'?'✓':s.status==='active'?'⟳':s.status==='error'?'✗':'○' }}</span>
                  <span class="pnw-sl">{{ s.label }}</span>
                  <el-progress :percentage="Math.min(100,Math.max(0,+(s.percent>=100&&t.status==='running'?99:s.percent)||0))" :stroke-width="4" :show-text="false" :striped="s.percent>=100&&t.status==='running'" :striped-flow="s.percent>=100&&t.status==='running'" class="pnw-sb" />
                  <span class="pnw-sn">{{ s.processed }}/{{ s.total||'-' }}</span>
                </div>
                <div v-if="t.steps.some((s) => s.errors.length)" class="pnw-errs">
                  <div v-for="s in t.steps.filter((s:any)=>s.errors.length)" :key="'e'+s.index">
                    <div v-for="(e, i) in s.errors.slice(0, 5)" :key="i" class="pnw-err">
                      <span class="pnw-ef">{{ e.file }}</span><span class="pnw-em">{{ e.error }}</span>
                    </div>
                    <div v-if="s.errors.length>5" class="pnw-emore">... 还有 {{ s.errors.length-5 }} 个</div>
                  </div>
                </div>
                <div v-if="t.logs?.length" class="pnw-logs">
                  <div v-for="(l,i) in t.logs.slice(-30)" :key="i" class="pnw-logln">{{ l }}</div>
                </div>
                <div v-if="store.fullscreen && t.fileTimings?.length" class="pnw-timing-block">
                  <div class="pnw-timing-head" @click="showTiming = !showTiming">
                    <span>进度条目 ({{ t.fileTimings.length }})</span>
                    <span class="pnw-timing-summary">平均 {{ pnwFormatDuration(pnwAverageFileDuration(t.fileTimings)) }} · 最快 {{ pnwFormatDuration(pnwFastestFileDuration(t.fileTimings)) }} · 最慢 {{ pnwFormatDuration(pnwSlowestFileDuration(t.fileTimings)) }}</span>
                    <span class="pnw-arrow">{{ showTiming ? '▾' : '▸' }}</span>
                  </div>
                  <div v-if="showTiming" ref="timingScrollRef" class="pnw-timing-table-wrap">
                    <table class="pnw-timing-table"><thead><tr><th>文件</th><th>条目</th><th class="r">耗时</th><th>状态</th></tr></thead>
                      <tbody><tr v-for="(r,ri) in t.fileTimings.slice(-100)" :key="ri" :class="r.success?'':'failed'"><td class="mono" :title="r.file">{{ (r.file.split('/').pop()||r.file) }}</td><td>{{ r.phase }}</td><td class="r">{{ pnwFormatDuration(r.duration) }}</td><td :class="r.success?'ok':'fail'">{{ r.success?'✓':'✗' }}</td></tr></tbody>
                    </table>
                  </div>
                </div>
                <div class="pnw-acts">
                  <button v-if="t.status==='running'" class="pnw-abtn pause" @click.stop="store.cancelTask(t.taskId)">⏸ 暂停</button>
                  <button v-if="t.status==='cancelled'" class="pnw-abtn resume" @click.stop="$emit('resumeTask', t.taskId)">▶ 继续</button>
                  <button v-if="t.status!=='running' && !t.confirmed" class="pnw-abtn confirm" @click.stop="store.confirmTask(t.taskId)">✓ 确认</button>
                  <button v-if="t.status!=='running'" class="pnw-abtn dismiss" @click.stop="store.removeTask(t.taskId)">✕ 删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ====== 最小化 ====== -->
    <Transition name="fade">
      <div v-if="visible && store.overlayMinimized && !store.fullscreen" class="pnw-minibar">
        <span class="pnw-mi">⏳</span>
        <span class="pnw-mt">{{ store.activeTasks.length }} 个任务</span>
        <span v-for="t in store.activeTasks.slice(0,2)" :key="t.taskId" class="pnw-mtask">{{ t.progressPercent }}%</span>
        <button class="pnw-mbtn" title="最大化查看" @click="openFullscreen(store.activeTasks[0]?.taskId||'')">□</button>
      </div>
    </Transition>

    <!-- ====== 完成 Toast ====== -->
    <Transition name="fade">
      <div v-if="toast" class="pnw-toast" @click="dismissToast">
        <span class="pnw-toast-icon">{{ toast.status === 'done' ? '✓' : toast.status === 'error' ? '✗' : '⊗' }}</span>
        <span class="pnw-toast-msg">{{ toast.taskName }} {{ toast.status === 'done' ? '完成' : toast.status === 'error' ? '失败' : '结束' }}</span>
        <button class="pnw-toast-btn" @click.stop="store.setFullscreen(true); dismissToast()">查看</button>
        <button class="pnw-toast-close" @click.stop="dismissToast">×</button>
      </div>
    </Transition>
    </PnwOverlayThemeProvider>
  </Teleport>
</template>

<style scoped>
/* 全屏 */
.pnw-backdrop { position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; }
.pnw-fs-panel { width:720px; max-width:95vw; max-height:85vh; background:var(--pnw-workbench-surface,var(--pnw-workbench-default-surface,#fff)); color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#0f172a)); border-radius:10px; box-shadow:var(--pnw-overlay-shadow,var(--pnw-workbench-default-overlay-shadow,0 8px 48px rgba(0,0,0,.25))); display:flex; flex-direction:column; overflow:hidden; }
.pnw-fs-head { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; border-bottom:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#ebeef5)); flex-shrink:0; }

/* 浮动 */
.pnw-overlay { position:fixed; right:24px; top:80px; z-index:9998; max-height:70vh; }
.pnw-panel { width:420px; max-height:70vh; background:var(--pnw-workbench-surface,var(--pnw-workbench-default-surface,#fff)); color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#0f172a)); border:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#dcdfe6)); border-radius:8px; box-shadow:var(--pnw-overlay-shadow,var(--pnw-workbench-default-overlay-shadow,0 4px 24px rgba(0,0,0,.12))); display:flex; flex-direction:column; overflow:hidden; }

.pnw-head { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#ebeef5)); flex-shrink:0; }
.pnw-title { font-size:14px; font-weight:600; color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#303133)); }
.pnw-btns { display:flex; gap:4px; }
.pnw-btn-icon { width:28px; height:24px; border:none; background:none; font-size:15px; cursor:pointer; color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); border-radius:4px; display:flex; align-items:center; justify-content:center; line-height:1; }
.pnw-btn-icon:hover { background:var(--pnw-control-hover-bg,var(--pnw-workbench-default-hover-bg,#f5f7fa)); color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#303133)); }

/* 列表 */
.pnw-list { overflow-y:auto; flex:1; padding:8px; }
.pnw-card { border:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#ebeef5)); border-radius:6px; margin-bottom:8px; overflow:hidden; border-left:3px solid transparent; }
.pnw-card-running { border-left-color:var(--pnw-control-active-text,var(--pnw-workbench-default-active-text,#409eff)); background:var(--pnw-control-active-bg,var(--pnw-workbench-default-active-bg,#ecf5ff)); }
.pnw-card-done { border-left-color:#67c23a; }
.pnw-card-error { border-left-color:#f56c6c; }
.pnw-card-cancelled, .pnw-card-orphaned { opacity:.7; }

/* 摘要 */
.pnw-row { display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer; user-select:none; }
.pnw-row:hover { background:var(--pnw-control-hover-bg,var(--pnw-workbench-default-hover-bg,#f5f7fa)); }
.pnw-badge { font-size:11px; padding:1px 6px; border-radius:3px; background:var(--pnw-control-active-bg,var(--pnw-workbench-default-active-bg,#ecf5ff)); color:var(--pnw-control-active-text,var(--pnw-workbench-default-active-text,#409eff)); flex-shrink:0; }
.pnw-name { font-size:13px; font-weight:500; color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#303133)); flex-shrink:0; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pnw-bar { flex:1; min-width:60px; }
.pnw-sts { font-size:12px; flex-shrink:0; }
.pnw-sts-running { color:var(--pnw-control-active-text,var(--pnw-workbench-default-active-text,#409eff)); } .pnw-sts-done { color:#67c23a; } .pnw-sts-error { color:#f56c6c; } .pnw-sts-cancelled,.pnw-sts-orphaned { color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); }
.pnw-arrow { font-size:12px; color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); flex-shrink:0; }
.pnw-sub { font-size:11px; font-family:monospace; color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); padding:0 12px 6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* 详情 */
.pnw-detail { border-top:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#ebeef5)); padding:8px 12px; }
.pnw-step { display:flex; align-items:center; gap:6px; padding:3px 0; }
.pnw-si { width:16px; font-size:12px; text-align:center; flex-shrink:0; }
.pnw-sl { font-size:12px; color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#303133)); width:80px; flex-shrink:0; }
.pnw-sb { flex:1; min-width:40px; }
.pnw-sn { font-size:11px; color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); flex-shrink:0; }

/* 错误 */
.pnw-errs { margin-top:6px; font-size:11px; }
.pnw-err { display:flex; gap:6px; padding:2px 0; }
.pnw-ef { color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#303133)); font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
.pnw-em { color:#f56c6c; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pnw-emore { color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); padding-top:2px; }

/* 日志 */
.pnw-logs { margin-top:8px; max-height:140px; overflow-y:auto; background:#1e1e1e; border-radius:4px; padding:6px 8px; font-family:monospace; font-size:11px; line-height:1.5; }
.pnw-logln { color:#d4d4d4; white-space:pre-wrap; word-break:break-all; }

/* 耗时表格 */
.pnw-timing-block { margin-top:8px; border-top:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#ebeef5)); padding-top:6px; }
.pnw-timing-head { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); cursor:pointer; user-select:none; }
.pnw-timing-head:hover { color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#303133)); }
.pnw-timing-summary { font-family:monospace; font-size:10px; opacity:.8; }
.pnw-timing-table-wrap { max-height:200px; overflow-y:auto; margin-top:4px; }
.pnw-timing-table { width:100%; border-collapse:collapse; font-size:11px; }
.pnw-timing-table th { text-align:left; padding:3px 6px; border-bottom:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#ebeef5)); color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); font-weight:500; position:sticky; top:0; background:var(--pnw-workbench-surface,var(--pnw-workbench-default-surface,#fff)); }
.pnw-timing-table td { padding:2px 6px; border-bottom:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#ebeef5)); }
.pnw-timing-table .r { text-align:right; font-family:monospace; }
.pnw-timing-table .mono { font-family:monospace; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pnw-timing-table .ok { color:#67c23a; } .pnw-timing-table .fail { color:#f56c6c; }
.pnw-timing-table .failed { background:var(--pnw-danger-bg,var(--pnw-workbench-default-danger-bg,#fef2f2)); }

/* 操作 */
.pnw-acts { margin-top:8px; display:flex; gap:6px; justify-content:flex-end; }
.pnw-abtn { font-size:11px; padding:2px 10px; border:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#dcdfe6)); border-radius:3px; background:none; cursor:pointer; color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); }
.pnw-abtn:hover { background:var(--pnw-control-hover-bg,var(--pnw-workbench-default-hover-bg,#f5f7fa)); color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#303133)); }
.pnw-abtn.pause { border-color:#e6a23c; color:#e6a23c; }
.pnw-abtn.pause:hover { background:color-mix(in srgb, #e6a23c 14%, transparent); }
.pnw-abtn.resume { border-color:var(--pnw-control-active-text,var(--pnw-workbench-default-active-text,#409eff)); color:var(--pnw-control-active-text,var(--pnw-workbench-default-active-text,#409eff)); }
.pnw-abtn.resume:hover { background:var(--pnw-control-active-bg,var(--pnw-workbench-default-active-bg,#ecf5ff)); }
.pnw-abtn.confirm { border-color:#67c23a; color:#67c23a; }
.pnw-abtn.confirm:hover { background:color-mix(in srgb, #67c23a 14%, transparent); }
.pnw-abtn.dismiss:hover { border-color:#f56c6c; color:#f56c6c; }

/* 最小化 */
.pnw-minibar { position:fixed; bottom:12px; right:12px; height:34px; z-index:9999; display:flex; align-items:center; gap:8px; padding:0 10px 0 14px; background:#303133; color:#fff; font-size:12px; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,.3); user-select:none; }
.pnw-mi { font-size:14px; } .pnw-mt { font-weight:500; } .pnw-mtask { opacity:.8; font-size:11px; }
.pnw-mbtn { width:22px; height:22px; border:none; background:rgba(255,255,255,.15); color:#fff; font-size:13px; border-radius:3px; cursor:pointer; display:flex; align-items:center; justify-content:center; margin-left:4px; }
.pnw-mbtn:hover { background:rgba(255,255,255,.25); }

/* Toast */
.pnw-toast { position:fixed; bottom:60px; right:16px; z-index:10001; display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--pnw-workbench-surface,var(--pnw-workbench-default-surface,#fff)); border:1px solid var(--pnw-workbench-border,var(--pnw-workbench-default-border,#dbe3ed)); border-radius:8px; box-shadow:var(--pnw-overlay-shadow,var(--pnw-workbench-default-overlay-shadow,0 4px 20px rgba(0,0,0,.15))); font-size:13px; cursor:pointer; max-width:360px; }
.pnw-toast-icon { font-size:16px; } .pnw-toast-icon:first-child { color:#67c23a; }
.pnw-toast-msg { color:var(--pnw-workbench-text,var(--pnw-workbench-default-text,#303133)); flex:1; }
.pnw-toast-btn { font-size:11px; padding:2px 8px; border:1px solid var(--pnw-control-active-text,var(--pnw-workbench-default-active-text,#409eff)); border-radius:3px; background:none; color:var(--pnw-control-active-text,var(--pnw-workbench-default-active-text,#409eff)); cursor:pointer; }
.pnw-toast-btn:hover { background:var(--pnw-control-active-bg,var(--pnw-workbench-default-active-bg,#ecf5ff)); }
.pnw-toast-close { border:none; background:none; font-size:14px; cursor:pointer; color:var(--pnw-workbench-muted,var(--pnw-workbench-default-muted,#909399)); }

/* 过渡 */
.fade-enter-active,.fade-leave-active { transition:opacity .2s ease; }
.fade-enter-from,.fade-leave-to { opacity:0; }
</style>
