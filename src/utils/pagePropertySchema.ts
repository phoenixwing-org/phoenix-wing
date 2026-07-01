import type { ComputedRef, Ref } from "vue";
import type {
  PnwPagePropertyBooleanField,
  PnwPagePropertyField,
  PnwPagePropertyGroup,
  PnwPagePropertyInfoField,
  PnwPagePropertyNumberField,
  PnwPagePropertyPathField,
  PnwPagePropertySelectField,
  PnwPagePropertySelectOption,
  PnwPagePropertySelectOptionsSource,
  PnwPagePropertyStringField,
  PnwPagePropertiesSheet,
} from "../types/pageProperties.js";

type ReactiveBool = Ref<boolean> | ComputedRef<boolean>;
type ReactiveStr = Ref<string> | ComputedRef<string>;
type ReactiveNum = Ref<number> | ComputedRef<number>;
type MaybeHidden = Ref<boolean> | ComputedRef<boolean> | undefined;
type MaybeHint = string | ComputedRef<string> | undefined;

/** 折叠分组（FreeCAD 属性段） */
export function pnwPropGroup(
  id: string,
  label: string,
  fields: PnwPagePropertyField[],
  opts?: { defaultCollapsed?: boolean; description?: string; hidden?: MaybeHidden },
): PnwPagePropertyGroup {
  return {
    id,
    label,
    fields,
    defaultCollapsed: opts?.defaultCollapsed,
    description: opts?.description,
    hidden: opts?.hidden,
  };
}

/** AppPropertyBool — 布尔 */
export function pnwPropBool(
  id: string,
  label: string,
  opts: {
    value: ReactiveBool;
    onChange?: (value: boolean) => void;
    hint?: MaybeHint;
    disabled?: MaybeHidden;
    hidden?: MaybeHidden;
    labelTone?: "default" | "emphasis";
  },
): PnwPagePropertyBooleanField {
  return { id, label, kind: "boolean", ...opts };
}

/** AppPropertyEnum — 枚举下拉（含原 radio 场景，统一 combo） */
export function pnwPropEnum(
  id: string,
  label: string,
  opts: {
    value: ReactiveStr;
    options: PnwPagePropertySelectOptionsSource;
    onChange?: (value: string) => void;
    hint?: MaybeHint;
    disabled?: MaybeHidden;
    hidden?: MaybeHidden;
    labelTone?: "default" | "emphasis";
  },
): PnwPagePropertySelectField {
  return { id, label, kind: "select", ...opts };
}

/** @deprecated 请用 propEnum；属性面板不支持 radio，等效为下拉 */
export function pnwPropRadio(
  id: string,
  label: string,
  opts: {
    value: ReactiveStr;
    options: PnwPagePropertySelectOption[];
    onChange?: (value: string) => void;
    hint?: string;
    disabled?: MaybeHidden;
    hidden?: MaybeHidden;
  },
): PnwPagePropertySelectField {
  return pnwPropEnum(id, label, opts);
}

/** AppPropertyString */
export function pnwPropString(
  id: string,
  label: string,
  opts: {
    value: ReactiveStr;
    onChange?: (value: string) => void;
    placeholder?: string;
    mono?: boolean;
    hint?: string;
    disabled?: MaybeHidden;
    hidden?: MaybeHidden;
  },
): PnwPagePropertyStringField {
  return { id, label, kind: "string", ...opts };
}

/** AppPropertyInt / Float */
export function pnwPropNumber(
  id: string,
  label: string,
  opts: {
    value: ReactiveNum;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    hint?: string;
    disabled?: MaybeHidden;
    hidden?: MaybeHidden;
  },
): PnwPagePropertyNumberField {
  return { id, label, kind: "number", ...opts };
}

/** 相对工作空间路径（mono + 可选浏览） */
export function pnwPropPath(
  id: string,
  label: string,
  opts: {
    value: ReactiveStr;
    onChange?: (value: string) => void;
    placeholder?: string;
    browse?: boolean;
    mono?: boolean;
    hint?: string;
    disabled?: MaybeHidden;
    hidden?: MaybeHidden;
  },
): PnwPagePropertyPathField {
  return { id, label, kind: "path", browse: opts.browse ?? true, ...opts };
}

/** AppPropertyString 只读 */
export function pnwPropReadonly(
  id: string,
  label: string,
  opts: {
    value: Ref<string | number | boolean | null> | ComputedRef<string | number | boolean | null>;
    mono?: boolean;
    multiline?: boolean;
    hint?: string;
    hidden?: MaybeHidden;
    labelTone?: "default" | "emphasis";
  },
): PnwPagePropertyInfoField {
  return { id, label, kind: "info", ...opts };
}

/** 组装一页属性表（不含 pageId，供 usePagePropertySheet 使用） */
export function pnwPropSheet(
  groups: PnwPagePropertyGroup[],
  opts?: Pick<PnwPagePropertiesSheet, "title" | "schemaVersion">,
): Omit<PnwPagePropertiesSheet, "pageId"> {
  return { groups, ...opts };
}
