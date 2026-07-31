import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import {
  pnwNormalizeWorkbenchDisplayPreferences,
  pnwScheduleDebounced,
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
import {
  pwwReadFixtureNavigationLayoutPreference,
  pwwReadFixtureWorkbenchPreferences,
  pwwWriteFixtureNavigationLayoutPreference,
  pwwWriteFixtureWorkbenchPreferences,
} from "./PwwFixtureWorkbenchPreferences.js";

export const PWW_BASE_LAYOUT_VERSION = "pww-workbench-fixture-1";

/** fixture 作为真实 consumer，用 Pinia + localStorage 持久化；Wing 不选择介质。 */
export const usePwwFixtureWorkbenchStore = defineStore("pww-fixture-workbench", () => {
  const pwwSavedPreferences = pwwReadFixtureWorkbenchPreferences();
  const pwwDefaultNavigationLayoutPreference = pwwCreateExampleNavigationLayoutPreference(
    PWW_FIXTURE_NAVIGATION,
    PWW_FIXTURE_NAVIGATION,
    PWW_BASE_LAYOUT_VERSION,
  );
  const pwwSavedNavigationLayoutPreference = pwwReadFixtureNavigationLayoutPreference(
    pwwDefaultNavigationLayoutPreference,
  );
  const pwwActiveBottomTabId = ref("output");
  const pwwPresentation = ref(pwwSavedPreferences.display.presentation);
  const pwwRibbonAppearance = ref({
    ...pwwSavedPreferences.display.ribbonAppearance,
    compact: { ...pwwSavedPreferences.display.ribbonAppearance.compact },
    ribbon: { ...pwwSavedPreferences.display.ribbonAppearance.ribbon },
  });
  const pwwTreeCollapsed = ref(pwwSavedPreferences.display.treeCollapsed);
  const pwwTreeAppearance = ref({ ...pwwSavedPreferences.display.treeAppearance });
  const pwwTabBarPlacement = ref(pwwSavedPreferences.display.tabBarPlacement);
  const pwwColorScheme = ref(pwwSavedPreferences.display.colorScheme);
  const pwwCustomTheme = ref(pwwSavedPreferences.customTheme);
  const pwwWorkbenchLayoutState = ref({
    visibility: { ...pwwSavedPreferences.display.layoutState.visibility },
    sizes: { ...pwwSavedPreferences.display.layoutState.sizes },
  });
  const pwwDisplaySettingsPositions = ref({
    quick: { ...pwwSavedPreferences.display.settingsPositions.quick },
    full: { ...pwwSavedPreferences.display.settingsPositions.full },
  });
  const pwwNavigationNodes = ref(pwwApplyExampleNavigationLayoutPreference(
    PWW_FIXTURE_NAVIGATION,
    pwwSavedNavigationLayoutPreference,
    PWW_BASE_LAYOUT_VERSION,
  ));
  const pwwNavigationLayoutPreference = computed(() => pwwCreateExampleNavigationLayoutPreference(
    pwwNavigationNodes.value,
    PWW_FIXTURE_NAVIGATION,
    PWW_BASE_LAYOUT_VERSION,
  ));
  const pwwDisplayPreferences = computed(() => pnwNormalizeWorkbenchDisplayPreferences({
    presentation: pwwPresentation.value,
    ribbonAppearance: pwwRibbonAppearance.value,
    treeCollapsed: pwwTreeCollapsed.value,
    treeAppearance: pwwTreeAppearance.value,
    tabBarPlacement: pwwTabBarPlacement.value,
    colorScheme: pwwColorScheme.value,
    layoutState: pwwWorkbenchLayoutState.value,
    settingsPositions: pwwDisplaySettingsPositions.value,
  }));
  const pwwPersistDisplayPreferences = pnwScheduleDebounced(() => {
    pwwWriteFixtureWorkbenchPreferences({
      version: 1,
      display: pwwDisplayPreferences.value,
      customTheme: pwwCustomTheme.value,
    });
  }, 80);
  const pwwPersistNavigationLayoutPreference = pnwScheduleDebounced(() => {
    pwwWriteFixtureNavigationLayoutPreference(pwwNavigationLayoutPreference.value);
  }, 80);

  watch(pwwDisplayPreferences, pwwPersistDisplayPreferences, { deep: true });
  watch(pwwCustomTheme, pwwPersistDisplayPreferences);
  watch(
    pwwNavigationLayoutPreference,
    pwwPersistNavigationLayoutPreference,
    { deep: true },
  );

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
    pwwPresentation,
    pwwRibbonAppearance,
    pwwTreeCollapsed,
    pwwTreeAppearance,
    pwwTabBarPlacement,
    pwwColorScheme,
    pwwCustomTheme,
    pwwWorkbenchLayoutState,
    pwwDisplaySettingsPositions,
    pwwDisplayPreferences,
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
