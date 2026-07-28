import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  PNW_DEFAULT_WORKBENCH_PANEL_SIZES,
  type PnwWorkbenchLayoutState,
} from "phoenix-wing";
import { PWW_FIXTURE_NAVIGATION } from "./PwwFixtureNavigation.js";
import {
  pwwAddExampleNavigationRoot,
  pwwApplyExampleNavigationLayoutPreference,
  pwwCloneExampleNavigation,
  pwwCreateExampleNavigationLayoutPreference,
  pwwDeleteExampleNavigationRoot,
  pwwMoveExampleNavigationNode,
  pwwRestoreExampleNavigationRootDefinition,
  pwwUpdateExampleNavigationRoot,
  type PwwNavigationLayoutPreferenceV1,
} from "./PwwFixtureNavigationLayout.js";

export const PWW_BASE_LAYOUT_VERSION = "pww-workbench-fixture-1";

/** fixture Pinia 持有当前布局；宿主可持久化 preference，但 Wing 不选择介质。 */
export const usePwwFixtureWorkbenchStore = defineStore("pww-fixture-workbench", () => {
  const pwwActiveBottomTabId = ref("output");
  const pwwWorkbenchLayoutState = ref<PnwWorkbenchLayoutState>({
    visibility: { primary: true, bottom: true, secondary: false },
    sizes: { ...PNW_DEFAULT_WORKBENCH_PANEL_SIZES },
  });
  const pwwNavigationNodes = ref(pwwCloneExampleNavigation(PWW_FIXTURE_NAVIGATION));
  const pwwNavigationLayoutPreference = computed(() => pwwCreateExampleNavigationLayoutPreference(
    pwwNavigationNodes.value,
    PWW_FIXTURE_NAVIGATION,
    PWW_BASE_LAYOUT_VERSION,
  ));

  function pwwMoveNavigationModule(moduleId: string, targetRootId: string): void {
    pwwNavigationNodes.value = pwwMoveExampleNavigationNode(
      pwwNavigationNodes.value,
      moduleId,
      targetRootId,
    );
  }

  function pwwCreateNavigationRoot(label: string, shortLabel?: string): void {
    pwwNavigationNodes.value = pwwAddExampleNavigationRoot(
      pwwNavigationNodes.value,
      { label, shortLabel },
    );
  }

  function pwwDeleteNavigationRoot(rootId: string): void {
    pwwNavigationNodes.value = pwwDeleteExampleNavigationRoot(
      pwwNavigationNodes.value,
      PWW_FIXTURE_NAVIGATION,
      rootId,
    );
  }

  function pwwUpdateNavigationRoot(
    rootId: string,
    label: string,
    shortLabel: string | undefined,
    order: number,
  ): void {
    pwwNavigationNodes.value = pwwUpdateExampleNavigationRoot(
      pwwNavigationNodes.value,
      rootId,
      { label, shortLabel, order },
    );
  }

  function pwwRestoreNavigationRootDefinition(rootId: string): void {
    pwwNavigationNodes.value = pwwRestoreExampleNavigationRootDefinition(
      pwwNavigationNodes.value,
      PWW_FIXTURE_NAVIGATION,
      rootId,
    );
  }

  function pwwRestoreDefaultNavigation(): void {
    pwwNavigationNodes.value = pwwCloneExampleNavigation(PWW_FIXTURE_NAVIGATION);
  }

  function pwwHydrateNavigationLayout(
    preference: PwwNavigationLayoutPreferenceV1,
  ): void {
    pwwNavigationNodes.value = pwwApplyExampleNavigationLayoutPreference(
      PWW_FIXTURE_NAVIGATION,
      preference,
      PWW_BASE_LAYOUT_VERSION,
    );
  }

  return {
    pwwActiveBottomTabId,
    pwwWorkbenchLayoutState,
    pwwNavigationNodes,
    pwwNavigationLayoutPreference,
    pwwMoveNavigationModule,
    pwwCreateNavigationRoot,
    pwwDeleteNavigationRoot,
    pwwUpdateNavigationRoot,
    pwwRestoreNavigationRootDefinition,
    pwwRestoreDefaultNavigation,
    pwwHydrateNavigationLayout,
  };
});
