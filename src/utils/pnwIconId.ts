import {
  pnwIsIconName,
  type PnwIconName,
} from "../icons/pnwIconCatalog.js";
import type {
  PnwBuiltinIconId,
  PnwIconId,
} from "../types/PnwIcon.js";

const PNW_ICON_ID_NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/u;
const PNW_ICON_ID_LOCAL_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;

/** 为 Wing 内置图标生成无歧义的规范持久化 ID。 */
export function pnwBuiltinIconId(name: PnwIconName): PnwBuiltinIconId {
  return `pnw:${name}`;
}

/**
 * 为 Host 白名单图标生成规范持久化 ID。
 * `pnw` namespace 只接受真实的 PnwIconName。
 */
export function pnwCreateIconId(namespace: string, localName: string): PnwIconId {
  const value = `${namespace.trim()}:${localName.trim()}`;
  if (!pnwIsIconId(value)) throw new TypeError(`Invalid Pnw icon ID: ${value}`);
  return value;
}

/** 检查字符串是否为可以进入 manifest / DTO 的规范图标 ID。 */
export function pnwIsIconId(value: unknown): value is PnwIconId {
  if (typeof value !== "string") return false;
  const separatorIndex = value.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex !== value.lastIndexOf(":")) return false;
  const namespace = value.slice(0, separatorIndex);
  const localName = value.slice(separatorIndex + 1);
  if (
    !PNW_ICON_ID_NAMESPACE_PATTERN.test(namespace)
    || !PNW_ICON_ID_LOCAL_NAME_PATTERN.test(localName)
  ) return false;
  return namespace !== "pnw" || pnwIsIconName(localName);
}
