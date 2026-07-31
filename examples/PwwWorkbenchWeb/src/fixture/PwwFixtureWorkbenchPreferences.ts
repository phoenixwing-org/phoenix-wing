import {
  PNW_DEFAULT_WORKBENCH_DISPLAY_PREFERENCES,
  pnwNormalizeWorkbenchDisplayPreferences,
  type PnwWorkbenchDisplayPreferences,
} from "phoenix-wing";
import type { PwwNavigationLayoutPreferenceV1 } from "./PwwFixtureNavigationLayout.js";

export const PWW_FIXTURE_WORKBENCH_PREFERENCES_KEY =
  "phoenix-wing.fixture.workbench.display-preferences.v1";
export const PWW_FIXTURE_NAVIGATION_LAYOUT_KEY =
  "phoenix-wing.fixture.navigation-layout.v1";

export interface PwwFixtureWorkbenchPreferencesV1 {
  readonly version: 1;
  readonly display: PnwWorkbenchDisplayPreferences;
  readonly customTheme: boolean;
}

interface PwwFixturePreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES:
PnwWorkbenchDisplayPreferences = pnwNormalizeWorkbenchDisplayPreferences({
  ...PNW_DEFAULT_WORKBENCH_DISPLAY_PREFERENCES,
  colorScheme: "light",
  layoutState: {
    visibility: { primary: true, bottom: true, secondary: false },
    sizes: PNW_DEFAULT_WORKBENCH_DISPLAY_PREFERENCES.layoutState.sizes,
  },
});

function pwwFixtureBrowserStorage(): PwwFixturePreferenceStorage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function pwwIsFixtureNavigationLayoutPreference(
  value: unknown,
  baseLayoutVersion: string,
): value is PwwNavigationLayoutPreferenceV1 {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1
    || record.baseLayoutVersion !== baseLayoutVersion
    || !Array.isArray(record.roots)
    || !Array.isArray(record.modulePlacements)) {
    return false;
  }

  const rootIds = new Set<string>();
  for (const candidate of record.roots) {
    if (candidate === null || typeof candidate !== "object") return false;
    const root = candidate as Record<string, unknown>;
    if (typeof root.id !== "string"
      || !root.id
      || rootIds.has(root.id)
      || typeof root.label !== "string"
      || !root.label.trim()
      || (root.shortLabel !== undefined && typeof root.shortLabel !== "string")
      || typeof root.order !== "number"
      || !Number.isFinite(root.order)) {
      return false;
    }
    rootIds.add(root.id);
  }

  const moduleIds = new Set<string>();
  for (const candidate of record.modulePlacements) {
    if (candidate === null || typeof candidate !== "object") return false;
    const placement = candidate as Record<string, unknown>;
    if (typeof placement.moduleId !== "string"
      || !placement.moduleId
      || moduleIds.has(placement.moduleId)
      || typeof placement.rootId !== "string"
      || !rootIds.has(placement.rootId)
      || typeof placement.order !== "number"
      || !Number.isFinite(placement.order)) {
      return false;
    }
    moduleIds.add(placement.moduleId);
  }
  return true;
}

export function pwwReadFixtureWorkbenchPreferences(
  storage: PwwFixturePreferenceStorage | undefined = pwwFixtureBrowserStorage(),
): PwwFixtureWorkbenchPreferencesV1 {
  if (!storage) {
    return {
      version: 1,
      display: PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES,
      customTheme: false,
    };
  }

  try {
    const parsed = JSON.parse(
      storage.getItem(PWW_FIXTURE_WORKBENCH_PREFERENCES_KEY) ?? "null",
    ) as unknown;
    const record = parsed !== null && typeof parsed === "object"
      ? parsed as Record<string, unknown>
      : {};
    return {
      version: 1,
      display: pnwNormalizeWorkbenchDisplayPreferences(
        record.version === 1 ? record.display : undefined,
        PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES,
      ),
      customTheme: record.version === 1 && typeof record.customTheme === "boolean"
        ? record.customTheme
        : false,
    };
  } catch {
    return {
      version: 1,
      display: PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES,
      customTheme: false,
    };
  }
}

export function pwwWriteFixtureWorkbenchPreferences(
  preferences: PwwFixtureWorkbenchPreferencesV1,
  storage: PwwFixturePreferenceStorage | undefined = pwwFixtureBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(
      PWW_FIXTURE_WORKBENCH_PREFERENCES_KEY,
      JSON.stringify({
        version: 1,
        display: pnwNormalizeWorkbenchDisplayPreferences(
          preferences.display,
          PWW_FIXTURE_DEFAULT_DISPLAY_PREFERENCES,
        ),
        customTheme: preferences.customTheme,
      } satisfies PwwFixtureWorkbenchPreferencesV1),
    );
  } catch {
    // Fixture 仅示范 consumer 持久化；存储不可用时保持当前内存状态。
  }
}

export function pwwReadFixtureNavigationLayoutPreference(
  fallback: PwwNavigationLayoutPreferenceV1,
  storage: PwwFixturePreferenceStorage | undefined = pwwFixtureBrowserStorage(),
): PwwNavigationLayoutPreferenceV1 {
  if (!storage) return fallback;
  try {
    const parsed = JSON.parse(
      storage.getItem(PWW_FIXTURE_NAVIGATION_LAYOUT_KEY) ?? "null",
    ) as unknown;
    return pwwIsFixtureNavigationLayoutPreference(parsed, fallback.baseLayoutVersion)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

export function pwwWriteFixtureNavigationLayoutPreference(
  preference: PwwNavigationLayoutPreferenceV1,
  storage: PwwFixturePreferenceStorage | undefined = pwwFixtureBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(PWW_FIXTURE_NAVIGATION_LAYOUT_KEY, JSON.stringify(preference));
  } catch {
    // Fixture 仅示范 consumer 持久化；存储不可用时保持当前 Pinia 状态。
  }
}
