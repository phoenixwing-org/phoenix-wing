import type { PnwIconName } from "../icons/pnwIconCatalog.js";

/** Wing 内置图标的规范持久化 ID；裸 PnwIconName 只作运行时兼容。 */
export type PnwBuiltinIconId = `pnw:${PnwIconName}`;

/**
 * 可序列化的稳定图标 ID。
 *
 * 所有新持久化数据都必须使用显式 namespace：Wing 内置图标使用
 * `pnw:dashboard`，宿主扩展使用 `cool:folder`。裸 PnwIconName、旧文本与
 * Vue Component 只用于运行时兼容，不能写入新的 manifest / DTO。
 */
export type PnwIconId = PnwBuiltinIconId | `${string}:${string}`;
