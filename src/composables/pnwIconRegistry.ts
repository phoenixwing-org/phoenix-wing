import type { Component } from "vue";
import {
  pnwIsIconName,
  type PnwIconName,
} from "../icons/pnwIconCatalog.js";

export type PnwIconNamespaceEntry = Component | PnwIconName;
export type PnwIconNamespaceMap = Readonly<Record<string, PnwIconNamespaceEntry>>;

export type PnwResolvedIcon =
  | {
    readonly kind: "pnw";
    readonly name: PnwIconName;
    readonly requestedId?: string;
    readonly fallback: boolean;
  }
  | {
    readonly kind: "component";
    readonly component: Component;
    readonly requestedId?: string;
    readonly fallback: false;
  }
  | {
    readonly kind: "text";
    readonly text: string;
    readonly requestedId?: undefined;
    readonly fallback: false;
  };

const PNW_ICON_NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/u;
const PNW_ICON_LOCAL_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const PNW_BARE_ICON_ID_PATTERN = /^[a-z][a-z0-9._-]*$/u;
const PNW_RESERVED_ICON_NAMESPACE = "pnw";

const pnwIconNamespaces = new Map<string, PnwIconNamespaceMap>();

function pnwIsComponent(value: unknown): value is Component {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function pnwFallbackIcon(requestedId: string | undefined, fallback: PnwIconName): PnwResolvedIcon {
  return {
    kind: "pnw",
    name: fallback,
    requestedId,
    fallback: true,
  };
}

function pnwValidateIconNamespace(namespace: string): string {
  const normalized = namespace.trim();
  if (!PNW_ICON_NAMESPACE_PATTERN.test(normalized)) {
    throw new TypeError(`Invalid Pnw icon namespace: ${namespace}`);
  }
  if (normalized === PNW_RESERVED_ICON_NAMESPACE) {
    throw new TypeError(`Pnw icon namespace is reserved: ${namespace}`);
  }
  return normalized;
}

function pnwValidateIconNamespaceMap(icons: PnwIconNamespaceMap): PnwIconNamespaceMap {
  const normalized: Record<string, PnwIconNamespaceEntry> = Object.create(null);
  for (const [localName, entry] of Object.entries(icons)) {
    if (!PNW_ICON_LOCAL_NAME_PATTERN.test(localName)) {
      throw new TypeError(`Invalid Pnw icon local name: ${localName}`);
    }
    if (typeof entry === "string") {
      if (!pnwIsIconName(entry)) {
        throw new TypeError(`Invalid Pnw icon alias: ${entry}`);
      }
    } else if (!pnwIsComponent(entry)) {
      throw new TypeError(`Invalid Pnw icon component for: ${localName}`);
    }
    normalized[localName] = entry;
  }
  return Object.freeze(normalized);
}

/**
 * 注册一个 Host 图标命名空间的显式白名单。
 *
 * 返回的函数只注销本次注册；若同一命名空间后来被替换，不会误删较新的注册。
 */
export function pnwRegisterIconNamespace(
  namespace: string,
  icons: PnwIconNamespaceMap,
): () => void {
  const normalizedNamespace = pnwValidateIconNamespace(namespace);
  const normalizedIcons = pnwValidateIconNamespaceMap(icons);
  const previous = pnwIconNamespaces.get(normalizedNamespace);
  pnwIconNamespaces.set(normalizedNamespace, normalizedIcons);

  return () => {
    if (pnwIconNamespaces.get(normalizedNamespace) !== normalizedIcons) return;
    if (previous) pnwIconNamespaces.set(normalizedNamespace, previous);
    else pnwIconNamespaces.delete(normalizedNamespace);
  };
}

/**
 * 把可序列化 ID、旧文本图标或旧 Vue Component 解析成统一渲染源。
 * 未注册/未知的 ASCII ID 始终回退为可见 Pnw 图标，不返回 undefined。
 */
export function pnwResolveIcon(
  icon: unknown,
  fallback: PnwIconName = "unknown",
): PnwResolvedIcon {
  const resolvedFallback = pnwIsIconName(fallback) ? fallback : "unknown";

  if (typeof icon === "number") {
    return { kind: "text", text: String(icon), fallback: false };
  }
  if (pnwIsComponent(icon)) {
    return { kind: "component", component: icon, fallback: false };
  }
  if (typeof icon !== "string") return pnwFallbackIcon(undefined, resolvedFallback);

  const value = icon.trim();
  if (!value) return pnwFallbackIcon(undefined, resolvedFallback);
  // 裸 PnwIconName 只保留运行时兼容；新持久化数据必须写成 pnw:name。
  if (pnwIsIconName(value)) {
    return { kind: "pnw", name: value, requestedId: value, fallback: false };
  }

  const separatorIndex = value.indexOf(":");
  if (separatorIndex > 0 && separatorIndex === value.lastIndexOf(":")) {
    const namespace = value.slice(0, separatorIndex);
    const localName = value.slice(separatorIndex + 1);
    if (
      PNW_ICON_NAMESPACE_PATTERN.test(namespace)
      && PNW_ICON_LOCAL_NAME_PATTERN.test(localName)
    ) {
      if (namespace === PNW_RESERVED_ICON_NAMESPACE) {
        return pnwIsIconName(localName)
          ? { kind: "pnw", name: localName, requestedId: value, fallback: false }
          : pnwFallbackIcon(value, resolvedFallback);
      }
      const entry = pnwIconNamespaces.get(namespace)?.[localName];
      if (typeof entry === "string" && pnwIsIconName(entry)) {
        return { kind: "pnw", name: entry, requestedId: value, fallback: false };
      }
      if (pnwIsComponent(entry)) {
        return { kind: "component", component: entry, requestedId: value, fallback: false };
      }
      return pnwFallbackIcon(value, resolvedFallback);
    }
  }

  if (PNW_BARE_ICON_ID_PATTERN.test(value) || value.includes(":")) {
    return pnwFallbackIcon(value, resolvedFallback);
  }
  return { kind: "text", text: value, fallback: false };
}
