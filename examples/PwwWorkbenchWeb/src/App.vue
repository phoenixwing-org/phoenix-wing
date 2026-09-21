<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { PnwWorkbenchShell } from "phoenix-wing";
import { PWW_FIXTURE_NAVIGATION } from "./fixture/PwwFixtureNavigation.js";
import { usePwwFixtureWorkbenchController } from "./fixture/PwwFixtureWorkbenchController.js";
import PwwFixtureDisplaySettingsExtras from "./fixture/PwwFixtureDisplaySettingsExtras.vue";
import PwwFixtureNavigationLayoutView from "./fixture/PwwFixtureNavigationLayoutView.vue";
import PwwFixtureViewDialogHost from "./fixture/PwwFixtureViewDialogHost.vue";
import PwwFixtureWorkbenchView from "./fixture/PwwFixtureWorkbenchView.vue";
import PwwFixtureWorkspaceWelcome from "./fixture/PwwFixtureWorkspaceWelcome.vue";
import { pwwFixtureResourceToolState } from "./fixture/PwwFixtureResourceToolState.js";

// App 只持有一个 fixture facade；真实 consumer 可换成自己的 Pinia/Router adapter。
const pwwFixture = reactive(usePwwFixtureWorkbenchController());
watch(() => pwwFixtureResourceToolState.value.mode, (mode) => {
  if (mode === "primary") {
    pwwFixture.layout.state = {
      ...pwwFixture.layout.state,
      visibility: { ...pwwFixture.layout.state.visibility, primary: true },
    };
  }
});
const pwwFooterKey = "phoenix-wing.fixture.show-footer.v1";
const pwwShowFooter = ref(true);
try { pwwShowFooter.value = localStorage.getItem(pwwFooterKey) !== "false"; } catch { /* Storage is optional. */ }
watch(pwwShowFooter, (visible) => {
  try { localStorage.setItem(pwwFooterKey, String(visible)); } catch { /* Keep the in-memory preference. */ }
});

function pwwCloseTab(tabId: string, showWelcome: () => void): void {
  pwwFixture.actions.closeTab(tabId);
  if (pwwFixture.tabs.items.length === 0) showWelcome();
}

function pwwCloseAllTabs(showWelcome: () => void): void {
  pwwFixture.actions.closeAllTabs();
  showWelcome();
}
</script>

<template>
  <div
    class="pww-app"
    :class="{
      'pww-app--dark': pwwFixture.appearance.colorScheme === 'dark',
      'pww-app--system': pwwFixture.appearance.colorScheme === 'system',
    }"
  >
    <div
      class="pww-stage"
      :class="{ 'pww-stage--narrow': pwwFixture.settings.narrowPreview }"
    >
      <PwwFixtureWorkspaceWelcome>
        <template #workbench="{ showWelcome }">
          <PnwWorkbenchShell
        v-model:show-footer="pwwShowFooter"
        v-model:presentation="pwwFixture.appearance.presentation"
        v-model:expanded-node-ids="pwwFixture.navigation.expandedNodeIds"
        v-model:ribbon-appearance="pwwFixture.appearance.ribbon"
        v-model:color-scheme="pwwFixture.appearance.colorScheme"
        v-model:tree-collapsed="pwwFixture.navigation.treeCollapsed"
        v-model:tree-appearance="pwwFixture.appearance.tree"
        v-model:layout-state="pwwFixture.layout.state"
        v-model:active-bottom-tab-id="pwwFixture.layout.activeBottomTabId"
        v-model:tab-bar-placement="pwwFixture.layout.tabBarPlacement"
        v-model:display-settings-positions="pwwFixture.settings.displayPositions"
        class="pww-workbench"
        :class="{ 'pww-workbench--custom': pwwFixture.appearance.customTheme }"
        :nodes="pwwFixture.navigation.nodes"
        :active-node-id="pwwFixture.navigation.activeNodeId"
        :view-blocks="pwwFixture.view.blocks"
        :default-bottom-block="pwwFixture.view.defaultBottom"
        :tabs="pwwFixture.tabs.items"
        :active-tab-id="pwwFixture.tabs.activeId"
        :can-close-all-tabs="pwwFixture.tabs.items.length > 0"
        :show-empty-view="pwwFixture.tabs.items.length === 0"
        brand-subtitle="fixture / public entry"
        header-aria-label="Pnw 工作台示例页眉"
        @activate="pwwFixture.actions.activateNode"
        @select-module="pwwFixture.actions.activateModule"
        @select-tab="pwwFixture.actions.selectTab"
        @close-tab="pwwCloseTab($event, showWelcome)"
        @close-all-tabs="pwwCloseAllTabs(showWelcome)"
        @display-settings-action="pwwFixture.actions.handleDisplaySettingsAction"
      >
        <template #brand>
          <button class="pww-brand-home" type="button" @click="showWelcome">
            Pnw Workbench
          </button>
        </template>
        <template #display-settings-actions="{ emitAction }">
          <button
            type="button"
            @click="emitAction('fixture.log-display-state')"
          >
            将当前显示状态写入日志
          </button>
        </template>

        <template #display-settings-panel-extra>
          <PwwFixtureDisplaySettingsExtras
            v-model:narrow-preview="pwwFixture.settings.narrowPreview"
            v-model:custom-theme="pwwFixture.appearance.customTheme"
            :color-scheme="pwwFixture.appearance.colorScheme"
          />
        </template>

        <template #header-actions>
          <PwwFixtureViewDialogHost />
          <button
            type="button"
            class="pww-consumer-action"
            aria-label="Consumer 用户区域示例"
            title="Consumer 自定义区域"
            @click="pwwFixture.actions.openConsumerUserArea"
          >
            KT
          </button>
        </template>

        <PwwFixtureNavigationLayoutView
          v-if="pwwFixture.navigation.activeNodeId === 'workbench-layout'"
          :nodes="pwwFixture.navigation.nodes"
          :default-nodes="PWW_FIXTURE_NAVIGATION"
          @move="pwwFixture.actions.moveNavigationNode"
          @create-root="pwwFixture.actions.createNavigationRoot"
          @update-root="pwwFixture.actions.updateNavigationRoot"
          @restore-root="pwwFixture.actions.restoreNavigationRootDefinition"
          @delete-root="pwwFixture.actions.deleteNavigationRoot"
          @restore="pwwFixture.actions.restoreDefaultNavigation"
        />

        <PwwFixtureWorkbenchView
          v-else
          :key="pwwFixture.navigation.activeNodeId"
          :view="pwwFixture.view.current"
          :active-node-id="pwwFixture.navigation.activeNodeId"
          :presentation="pwwFixture.appearance.presentation"
          :ribbon-summary="`${pwwFixture.appearance.ribbon.mode} / ${pwwFixture.appearance.activeRibbon.iconSize}px`"
          :theme-summary="pwwFixture.appearance.customTheme
            ? 'custom tokens'
            : pwwFixture.appearance.colorScheme"
          :diagnostics="pwwFixture.view.diagnostics"
          :clear-log="pwwFixture.actions.clearDiagnosticsLog"
          :open-problem="pwwFixture.actions.openProblem"
          @action="pwwFixture.actions.handleViewAction"
        />

          </PnwWorkbenchShell>
        </template>
      </PwwFixtureWorkspaceWelcome>
    </div>
  </div>
</template>

<style scoped src="./fixture/PwwFixtureWorkbench.css"></style>
