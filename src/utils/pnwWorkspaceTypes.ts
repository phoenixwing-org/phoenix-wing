import type { PnwLocale } from "../types/PnwLocale.js";
import type {
  PnwBuiltinWorkspaceTypeId,
  PnwWorkspaceTypeDefinition,
} from "../types/PnwWorkspace.js";
import { pnwNormalizeLocale, pnwTranslateLocaleMessage } from "./pnwLocale.js";

export interface PnwNormalizeWorkspaceTypesOptions {
  readonly locale?: PnwLocale;
  readonly includeDefaults?: boolean;
}

const PNW_WORKSPACE_TYPE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;

const PNW_DEFAULT_WORKSPACE_TYPE_ORDERS: Readonly<Record<PnwBuiltinWorkspaceTypeId, number>> = {
  mixed: 10,
  code: 20,
  cad: 30,
  lighting: 40,
};

export function pnwNormalizeWorkspaceTypeId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const typeId = value.trim().toLocaleLowerCase();
  return PNW_WORKSPACE_TYPE_ID_PATTERN.test(typeId) ? typeId : undefined;
}

export function pnwCreateDefaultWorkspaceTypes(
  locale?: PnwLocale,
): readonly PnwWorkspaceTypeDefinition[] {
  const normalizedLocale = pnwNormalizeLocale(locale);
  return Object.freeze((Object.keys(PNW_DEFAULT_WORKSPACE_TYPE_ORDERS) as PnwBuiltinWorkspaceTypeId[])
    .map((typeId) => Object.freeze({
      typeId,
      label: pnwTranslateLocaleMessage(normalizedLocale, `workspace.type.${typeId}`),
      order: PNW_DEFAULT_WORKSPACE_TYPE_ORDERS[typeId],
      builtin: true,
    })));
}

/**
 * 合并 Wing 默认 Workspace 类型与 Host 扩展，并按显式 order 稳定排序。
 * Host 可覆盖默认类型的 label/order；类型探测与持久化仍由 Host 决定。
 */
export function pnwNormalizeWorkspaceTypes(
  customTypes: readonly PnwWorkspaceTypeDefinition[] = [],
  options: PnwNormalizeWorkspaceTypesOptions = {},
): readonly PnwWorkspaceTypeDefinition[] {
  const definitions = new Map<string, PnwWorkspaceTypeDefinition>();
  if (options.includeDefaults !== false) {
    for (const definition of pnwCreateDefaultWorkspaceTypes(options.locale)) {
      definitions.set(definition.typeId, definition);
    }
  }

  for (const definition of customTypes) {
    const typeId = pnwNormalizeWorkspaceTypeId(definition.typeId);
    const label = definition.label.trim();
    if (!typeId || !label) continue;
    const previous = definitions.get(typeId);
    const order = Number.isFinite(definition.order)
      ? definition.order
      : (previous?.order ?? Number.MAX_SAFE_INTEGER);
    definitions.set(typeId, Object.freeze({
      typeId,
      label,
      order,
      builtin: previous?.builtin === true,
    }));
  }

  return Object.freeze([...definitions.values()].sort((left, right) => (
    (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
    || left.typeId.localeCompare(right.typeId)
  )));
}
