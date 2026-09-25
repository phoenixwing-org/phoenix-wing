<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  PnwFloatingPanel, PnwTabContainer, PnwWorkbenchLayout, PnwActivityTree,
  PnwPageLayout, PnwRibbonToolButton, PnwSidebarBlock, PnwPrimarySection, usePnwOverlayTheme, pnwArrangeFloatingViewBounds,
  pnwArrangeViewPresentationRecords, pnwCreateViewPresentationRecord,
  type PnwFloatingPanelBounds, type PnwFloatingViewArrangementItem,
  type PnwColorScheme, type PnwFloatingViewArrangementMode, type PnwTabDefinition, type PnwWorkbenchLayoutState,
} from "phoenix-wing";
import PwwBlockVariantsValidation from "./PwwBlockVariantsValidation.vue";

const props = withDefaults(defineProps<{ colorScheme?: PnwColorScheme }>(), { colorScheme: "system" });
const pwwResolvedTheme = usePnwOverlayTheme(() => props.colorScheme);
const pwwTestId = ref(new URLSearchParams(window.location.search).get("example") === "blocks" ? "blocks" : "tabs");
const pwwTests = [
  { id: "tabs", label: "Tab 内容保活", icon: "pnw:document" },
  { id: "windows", label: "浮窗平铺与层叠", icon: "pnw:window-float" },
  { id: "checks", label: "简单断言", icon: "pnw:report" },
  { id: "blocks", label: "Block 样式", icon: "pnw:dashboard" },
];
const pwwTitle = computed(() => pwwTests.find(test => test.id === pwwTestId.value)!.label);
const pwwLayout = ref<PnwWorkbenchLayoutState>({
  visibility: { primary: true, bottom: false, secondary: false },
  sizes: { primaryWidth: 224, secondaryWidth: 260, bottomHeight: 180 },
});
const pwwDraftMessage = ref("");
const pwwCheckSummary = computed(() => pwwRunning.value ? "正在检查…"
  : `${pwwChecks.value.filter(item => item.passed).length} / ${pwwChecks.value.length} 通过`);

const pwwTabs: readonly PnwTabDefinition[] = [
  { id: "first", title: "第一页" }, { id: "disabled", title: "禁用页", disabled: true },
  { id: "second", title: "第二页" },
];
const pwwActive = ref("first");
const pwwTabHost = ref<HTMLElement>();
const pwwArea = ref<HTMLElement>();
const pwwNarrow = ref(false);
const pwwRunning = ref(false);
const pwwChecks = ref<{ name: string; passed: boolean; detail?: string }[]>([]);
const pwwWindows = ref<readonly PnwFloatingViewArrangementItem[]>([]);
const pwwTargets = ["one", "two", "three"].map(id => ({ id, constraints: { minWidth: 250, minHeight: 140 } }));

function pwwReadDraft(id: string): void {
  const input = pwwTabHost.value?.querySelector<HTMLInputElement>(`[data-draft="${id}"]`);
  pwwDraftMessage.value = `当前草稿：${input?.value ?? ""}（仅内存，不写文件）`;
}

function pwwThemeFrames(): void {
  pwwTabHost.value?.querySelectorAll("iframe").forEach(frame => {
    if (frame.contentDocument) frame.contentDocument.documentElement.style.colorScheme = pwwResolvedTheme.value;
  });
}
watch(pwwResolvedTheme, pwwThemeFrames, { flush: "post" });

function pwwAssert(condition: unknown, name: string): void {
  if (!condition) throw new Error(name);
}

async function pwwRunChecks(): Promise<void> {
  if (pwwRunning.value) return;
  const previousTestId = pwwTestId.value;
  const previousFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement : undefined;
  pwwRunning.value = true;
  // Real keyboard focus requires visible tabs, including a direct Block example entry.
  pwwTestId.value = 'tabs';
  pwwChecks.value = [];
  const test = async (name: string, work: () => void | Promise<void>) => {
    try { await work(); pwwChecks.value.push({ name, passed: true }); }
    catch (error) { pwwChecks.value.push({ name, passed: false, detail: String(error) }); }
  };
  try {
    await test("Tab 切回保留 input / iframe 节点和输入", async () => {
      pwwActive.value = "first";
      await nextTick();
      const root = pwwTabHost.value!;
      const input = root.querySelector<HTMLInputElement>('[data-draft="first"]')!;
      const frame = root.querySelector('[data-frame="first"]');
      const draft = input.value;
      root.querySelector<HTMLButtonElement>('[data-pnw-tab-id="second"]')!.click();
      await nextTick();
      root.querySelector<HTMLButtonElement>('[data-pnw-tab-id="first"]')!.click();
      await nextTick();
      pwwAssert(root.querySelector('[data-draft="first"]') === input && input.value === draft
        && root.querySelector('[data-frame="first"]') === frame, "节点或输入被重建");
    });
    await test("键盘 ArrowRight 跳过禁用页并移动焦点", async () => {
      const root = pwwTabHost.value!;
      root.querySelector<HTMLButtonElement>('[data-pnw-tab-id="first"]')!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      await nextTick();
      await nextTick();
      pwwAssert(pwwActive.value === "second" && document.activeElement?.getAttribute("data-pnw-tab-id") === "second", "键盘活动页或焦点错误");
      pwwActive.value = "first";
    });
    await test("1100 / 360 / 48px 平铺边界与互不重叠", () => {
      for (const width of [1100, 360, 48]) {
        const items = pnwArrangeFloatingViewBounds({ mode: "tile", targets: pwwTargets,
          area: { position: { x: 0, y: 0 }, size: { width, height: 600 } } });
        for (const { bounds: b } of items) pwwAssert(b.position.x >= 0 && b.position.y >= 0
          && b.position.x + b.size.width <= width + 0.01 && b.position.y + b.size.height <= 600.01, "越界");
        items.forEach((a, i) => items.slice(i + 1).forEach(b => {
          const x = Math.min(a.bounds.position.x + a.bounds.size.width, b.bounds.position.x + b.bounds.size.width)
            - Math.max(a.bounds.position.x, b.bounds.position.x);
          const y = Math.min(a.bounds.position.y + a.bounds.size.height, b.bounds.position.y + b.bounds.size.height)
            - Math.max(a.bounds.position.y, b.bounds.position.y);
          pwwAssert(x <= 0.01 || y <= 0.01, "平铺重叠");
        }));
      }
    });
    await test("排列不改变 View record 身份、模式与 revision", () => {
      const record = pnwCreateViewPresentationRecord({ rendererId: "sample", viewInstanceId: "sample-one", ownerTabId: "sample-owner", instanceKey: "default" });
      const result = pnwArrangeViewPresentationRecords({ mode: "cascade", targets: [{ record }],
        area: { position: { x: 0, y: 0 }, size: { width: 800, height: 600 } } })[0].record;
      pwwAssert(result.identity === record.identity && result.mode === record.mode && result.revision === record.revision, "record 语义变化");
    });
  } finally {
    pwwRunning.value = false;
    pwwActive.value = "first";
    pwwTestId.value = previousTestId;
    await nextTick();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    else if (previousTestId === 'tabs') pwwTabHost.value?.querySelector<HTMLButtonElement>('[data-pnw-tab-id="first"]')?.focus({ preventScroll: true });
  }
}

function pwwArrange(mode: PnwFloatingViewArrangementMode): void {
  const rect = pwwArea.value!.getBoundingClientRect();
  const x = Math.max(8, rect.left);
  const y = Math.max(8, Math.min(rect.top, window.innerHeight - 160));
  const width = Math.max(1, Math.min(rect.width, window.innerWidth - x - 8, pwwNarrow.value ? 360 : Infinity));
  const height = Math.max(1, Math.min(rect.height, window.innerHeight - y - 8));
  pwwWindows.value = pnwArrangeFloatingViewBounds({ mode, targets: pwwTargets,
    area: { position: { x, y }, size: { width, height } } });
}

function pwwUpdateBounds(id: string, bounds: PnwFloatingPanelBounds): void {
  pwwWindows.value = pwwWindows.value.map(item => item.id === id ? { ...item, bounds } : item);
}

onMounted(() => { void pwwRunChecks(); });
</script>

<template>
  <PnwWorkbenchLayout v-model:layout-state="pwwLayout" :contributions="{ primary: true }" :color-scheme="colorScheme" :show-footer="false">
    <template #primary>
      <div class="pww-validation-primary">
      <PnwActivityTree :nodes="pwwTests" :active-node-id="pwwTestId" :color-scheme="colorScheme"
        :class="{ 'pww-test-navigation--compact': pwwTestId === 'blocks' }"
        header-label="测试目录" aria-label="简单验证目录" @activate="pwwTestId = $event"
        @update:collapsed="pwwLayout = { ...pwwLayout, visibility: { ...pwwLayout.visibility, primary: !$event } }" />
      <template v-if="pwwTestId === 'blocks'">
        <PnwPrimarySection title="Primary · 筛选" data-pww-primary-block>
          <p class="pww-primary-note">Block 左右贴边，文字保留内 padding。</p>
        </PnwPrimarySection>
        <PnwPrimarySection title="Primary · 属性" :collapsible="false" data-pww-primary-block>
          <template #actions><PnwRibbonToolButton label="读取 Primary" icon="pnw:document" @click="pwwReadDraft('first')" /></template>
          <p class="pww-primary-note">连续横向分隔线，Header 无竖线。</p>
        </PnwPrimarySection>
      </template>
      </div>
    </template>
    <PnwPageLayout :title="pwwTitle" :body-inset="false" :body-scroll="false" actions-align="end">
      <template #right>
        <template v-if="pwwTestId === 'windows'">
          <PnwRibbonToolButton label="平铺三窗" icon="pnw:dashboard" display-mode="icon-title" :show-title="true" @click="pwwArrange('tile')" />
          <PnwRibbonToolButton label="层叠三窗" icon="pnw:window-float" display-mode="icon-title" :show-title="true" @click="pwwArrange('cascade')" />
        </template>
        <PnwRibbonToolButton v-else label="运行检查" icon="pnw:refresh" display-mode="icon-title" :show-title="true" :disabled="pwwRunning" @click="pwwRunChecks" />
        <PnwRibbonToolButton v-if="pwwWindows.length" label="关闭浮窗" icon="pnw:close-others" display-mode="icon-title" :show-title="true" @click="pwwWindows = []" />
      </template>

      <div class="pww-test-view">
        <div class="pww-test-status" role="status">
          <span>{{ pwwTestId === 'windows' ? '输入草稿后重新排列，检查内容仍在。X 关闭并销毁窗口。' : '切换页签或测试目录不会重建草稿与 iframe。' }}</span>
          <span class="pww-test-count">{{ pwwCheckSummary }}</span>
        </div>
        <div v-show="pwwTestId === 'tabs'" ref="pwwTabHost" class="pww-tab-stage">
          <PnwTabContainer v-model:active-tab-id="pwwActive" :tabs="pwwTabs" lazy-mount aria-label="验证内容页签">
            <template #default="{ tab }">
              <PnwPageLayout :title="`${tab.title} · 草稿`" actions-align="end">
                <template #right>
                  <PnwRibbonToolButton label="读取草稿" icon="pnw:document" display-mode="icon-title" :show-title="true" @click="pwwReadDraft(tab.id)" />
                </template>
                <div class="pww-draft-content">
                  <label class="pww-field">{{ tab.title }}草稿 <input :data-draft="tab.id" :aria-label="`${tab.title}草稿`" value="未保存内容" /></label>
                  <p class="pww-hint" role="status">{{ pwwDraftMessage || '可编辑，再切到第二页返回；本示例不写入文件。' }}</p>
                  <PnwSidebarBlock title="独立 iframe" variant="card" :collapsible="false">
                    <iframe :data-frame="tab.id" :title="`${tab.title}独立内容`" @load="pwwThemeFrames"
                      srcdoc="<!doctype html><html><head><style>body{margin:12px;font:14px system-ui;color:CanvasText;background:Canvas}input{font:inherit;color:inherit;background:Field;border:1px solid GrayText;padding:5px;max-width:100%;box-sizing:border-box}</style></head><body><p>独立文档 · 页签保活</p><label>内部草稿 <input value='iframe 内容也可编辑' /></label></body></html>" />
                  </PnwSidebarBlock>
                </div>
              </PnwPageLayout>
            </template>
          </PnwTabContainer>
        </div>

        <section v-show="pwwTestId === 'windows'" class="pww-window-stage" aria-label="浮窗排列测试">
          <div class="pww-test-options">
            <label><input v-model="pwwNarrow" type="checkbox" /> 360px 可用区（下次排列生效）</label>
            <span class="pww-hint">拖动 / 缩放 / 点击置前 / Escape 关闭活动窗</span>
          </div>
          <div ref="pwwArea" class="pww-arrangement-area"><span>从 Header 选择「平铺三窗」或「层叠三窗」</span></div>
        </section>

        <section v-show="pwwTestId === 'checks'" class="pww-check-stage" aria-label="自动断言">
          <PnwSidebarBlock title="检查结果" variant="card" :collapsible="false">
            <template #suffix>{{ pwwCheckSummary }}</template>
            <ul class="pww-check-list" aria-live="polite">
              <li v-for="item in pwwChecks" :key="item.name" :data-passed="item.passed">
                <strong>{{ item.passed ? '通过' : '失败' }}</strong><span>{{ item.name }}<span v-if="item.detail"> — {{ item.detail }}</span></span>
              </li>
            </ul>
          </PnwSidebarBlock>
          <p class="pww-hint">只覆盖以上简单断言，不替代完整发布门禁或真实消费者验收。</p>
        </section>
        <PwwBlockVariantsValidation v-show="pwwTestId === 'blocks'" :color-scheme="colorScheme" />
      </div>
    </PnwPageLayout>
    <PnwFloatingPanel v-for="item in pwwWindows" :key="item.id" open :title="`验证窗口 ${item.id}`"
      :presentation-id="`pww-validation-${item.id}`" :position="item.bounds.position" :size="item.bounds.size"
      :min-size="item.effectiveMinSize" :color-scheme="colorScheme" resizable="both"
      @update:bounds="pwwUpdateBounds(item.id, $event)" @close="pwwWindows = pwwWindows.filter(window => window.id !== item.id)">
      <div class="pww-window-content">
        <label class="pww-field">草稿 <input :aria-label="`窗口 ${item.id}草稿`" placeholder="排列后应保留" /></label>
        <p class="pww-hint">同一实例 · 仅更新 bounds</p>
      </div>
    </PnwFloatingPanel>
  </PnwWorkbenchLayout>
</template>

<style scoped>
.pww-validation-primary { display:flex; flex-direction:column; width:100%; height:100%; min-height:0; gap:0; padding:0; margin:0; overflow:auto; }
.pww-test-navigation--compact { flex:0 0 auto; height:auto; }
.pww-primary-note { margin:0; padding:8px; font-size:13px; }
.pww-test-view { display:flex; flex-direction:column; height:100%; min-height:0; }
.pww-test-status, .pww-test-options { display:flex; flex-wrap:wrap; align-items:center; gap:4px 16px; padding:6px 10px; font-size:12px; color:var(--pnw-workbench-default-muted); border-bottom:1px solid var(--pnw-workbench-default-border); }
.pww-test-count { margin-left:auto; white-space:nowrap; }
.pww-tab-stage { flex:1; min-height:0; min-width:0; }
.pww-draft-content { max-width:900px; }
.pww-field { display:flex; flex-wrap:wrap; align-items:center; gap:8px; font-size:13px; }
.pww-field input { flex:1; min-width:0; max-width:360px; padding:5px 8px; font:inherit; color:inherit; border:1px solid var(--pnw-workbench-default-border); border-radius:2px; background:var(--pnw-workbench-default-bg); }
.pww-hint { margin:8px 0; color:var(--pnw-workbench-default-muted); font-size:12px; }
iframe { display:block; width:100%; height:160px; border:0; }
.pww-window-stage { display:flex; flex:1; flex-direction:column; min-height:0; }
.pww-window-stage[style*="display: none"] { display:none; }
.pww-arrangement-area { display:grid; place-items:center; flex:1; min-height:180px; margin:8px; border:1px dashed var(--pnw-workbench-default-border); background:var(--pnw-workbench-default-bg); color:var(--pnw-workbench-default-muted); font-size:12px; }
.pww-window-content { padding:10px; }
.pww-check-stage { overflow:auto; }
.pww-check-stage > .pww-hint { margin:10px; }
.pww-check-list { list-style:none; padding:0; margin:0; }
.pww-check-list li { display:flex; gap:16px; padding:10px; border-top:1px solid var(--pnw-workbench-default-border); font-size:13px; overflow-wrap:anywhere; }
.pww-check-list strong { flex:none; } li[data-passed="false"] { font-weight:bold; }
</style>
