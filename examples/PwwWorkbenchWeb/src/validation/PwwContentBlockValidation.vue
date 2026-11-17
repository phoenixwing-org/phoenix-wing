<script setup lang="ts">
import { onMounted, ref } from "vue";
import { pnwDefineContentBlock, PNW_CONTENT_BLOCK_TOGGLE, type PnwContentBlock, type PnwContentBlockToggleDetail } from "@phoenix-wing/code-core/ui";

const pwwHost = ref<HTMLElement>();
const pwwNarrow = ref(false);
const pwwCollapsible = ref(true);
const pwwMessage = ref("内容仅保存在页面内存；不会读取或修改文件、项目和系统设置。");
let pwwPrimary: PnwContentBlock | undefined;
let pwwSecondary: PnwContentBlock | undefined;
let pwwRefreshCount = 0;

function pwwSlot(name: string, text: string, tag = "span"): HTMLElement {
  const node = document.createElement(tag); node.slot = name; node.textContent = text; return node;
}
function pwwSetCollapsible(): void { if (pwwPrimary) pwwPrimary.collapsible = pwwCollapsible.value; }
function pwwReset(): void {
  pwwNarrow.value = false; pwwCollapsible.value = true;
  if (pwwPrimary) { pwwPrimary.collapsible = true; pwwPrimary.open = true; }
  if (pwwSecondary) pwwSecondary.open = true;
  pwwMessage.value = "已恢复展示；原输入、下拉选择和复选框节点保持不变。";
}

onMounted(() => {
  pnwDefineContentBlock();
  const primary = document.createElement("pnw-content-block"); pwwPrimary = primary;
  primary.dataset.pwwContentBlock = "primary";
  primary.append(pwwSlot("title", "一级 · 工作区"), pwwSlot("icon", "⊞"));
  const status = pwwSlot("status", "2 项"); primary.append(status);
  const context = document.createElement("select"); context.slot = "context"; context.setAttribute("aria-label", "示例工作区");
  for (const label of ["示例 A", "示例 B"]) { const option = document.createElement("option"); option.textContent = label; context.append(option); }
  context.addEventListener("change", () => { pwwMessage.value = `已切换到 ${context.value}，仅修改内存。`; });
  const refresh = pwwSlot("actions", "刷新", "button") as HTMLButtonElement; refresh.type = "button"; refresh.setAttribute("aria-label", "刷新内容 Block");
  refresh.addEventListener("click", () => { status.textContent = `刷新 ${++pwwRefreshCount} 次`; pwwMessage.value = "Header 操作不会折叠正文，也不会替换草稿节点。"; });
  const body = pwwSlot("body", "", "div"); body.className = "pww-content-block-body";
  const note = document.createElement("p"); note.textContent = "六个命名插槽：图标、标题、状态、上下文、操作和正文。窄宽时上下文及操作自动换行。";
  const draft = document.createElement("label"), input = document.createElement("input"); input.value = "保留这份草稿"; input.setAttribute("aria-label", "内容 Block 草稿"); draft.append(document.createTextNode("草稿 "), input);
  const secondary = document.createElement("pnw-content-block"); pwwSecondary = secondary;
  secondary.level = "secondary"; secondary.dataset.pwwContentBlock = "secondary"; secondary.append(pwwSlot("title", "二级 · 选项"), pwwSlot("status", "内部区块"));
  const secondaryBody = pwwSlot("body", "", "label"), check = document.createElement("input"); check.type = "checkbox"; check.checked = true; check.setAttribute("aria-label", "保留选择"); secondaryBody.append(check, document.createTextNode("保留选择"));
  secondary.append(secondaryBody); body.append(note, draft, secondary); primary.append(context, refresh, body);
  primary.addEventListener(PNW_CONTENT_BLOCK_TOGGLE, event => {
    const detail = (event as CustomEvent<PnwContentBlockToggleDetail>).detail;
    pwwMessage.value = `${event.target === secondary ? "二级" : "一级"}区块${detail.expanded ? "已展开" : "已折叠"}；未执行任何业务操作。`;
  });
  const fixed = document.createElement("pnw-content-block"); fixed.collapsible = false; fixed.dataset.pwwContentBlock = "static";
  fixed.append(pwwSlot("title", "一级 · 静态摘要"), pwwSlot("body", "静态标题使用真实 heading，没有禁用按钮或多余 Tab 停靠点。", "p"));
  pwwHost.value?.append(primary, fixed);
});
</script>

<template>
  <main class="pww-content-block-validation">
    <div class="pww-content-block-options">
      <label><input v-model="pwwNarrow" type="checkbox" />320px 窄宽</label>
      <label><input v-model="pwwCollapsible" type="checkbox" @change="pwwSetCollapsible" />一级允许折叠</label>
      <button type="button" @click="pwwReset">恢复展示</button>
    </div>
    <div ref="pwwHost" class="pww-content-block-stage" :class="{ 'pww-content-block-stage--narrow': pwwNarrow }" />
    <output class="pww-content-block-message" role="status">{{ pwwMessage }}</output>
  </main>
</template>

<style>
.pww-content-block-validation { height:100%; padding:12px; min-width:0; overflow:auto; }
.pww-content-block-options { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-bottom:12px; }
.pww-content-block-validation label { display:flex; align-items:center; gap:6px; min-width:0; }
.pww-content-block-validation button,.pww-content-block-validation select,.pww-content-block-validation input:not([type="checkbox"]) { min-width:0; min-height:27px; padding:3px 7px; color:inherit; background:var(--pnw-workbench-default-surface,#fff); border:1px solid var(--pnw-workbench-default-border,#dbe3ed); font:inherit; }
.pww-content-block-validation button { cursor:pointer; }
.pww-content-block-validation :is(button,input,select):focus-visible { outline:1px solid var(--pnw-workbench-default-focus,#3b82f6); outline-offset:-1px; }
.pww-content-block-stage { --pnw-content-block-foreground:var(--pnw-workbench-default-text,#0f172a); --pnw-content-block-border:var(--pnw-workbench-default-border,#dbe3ed); --pnw-content-block-header-background:color-mix(in srgb,var(--pnw-workbench-default-surface,#fff) 92%,var(--pnw-workbench-default-text,#0f172a) 8%); width:100%; max-width:100%; min-width:0; background:var(--pnw-workbench-default-surface,#fff); border-bottom:1px solid var(--pnw-content-block-border); }
.pww-content-block-stage--narrow { width:320px; }
.pww-content-block-body { padding:8px; min-width:0; }
.pww-content-block-body p { margin:0 0 8px; }
.pww-content-block-body > label { margin-bottom:8px; }
.pww-content-block-body input:not([type="checkbox"]) { flex:1; width:0; }
.pww-content-block-stage [slot="body"]:is(label,p) { padding:7px 8px; margin:0; }
.pww-content-block-message { display:block; padding:12px 0; color:var(--pnw-workbench-default-muted,#64748b); overflow-wrap:anywhere; }
</style>
