# Pnw 工作台 Web 图标契约

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.6.1 候选

最后核验：2026-08-01

本文固定工作台导航图标的序列化、解析和兼容边界。目标是让插件 manifest、
后台菜单 DTO 与 Vue 运行时使用同一个稳定 ID，同时避免不同图标库的裸名称碰撞。
图形选型、24×24 几何、视觉重量、主题状态和 AI 交付检查见
[《Pnw SVG 图标制作与选型规范》](Pnw-SVG图标制作与选型规范.md)。

## 1. 规范持久化格式

所有新写入 manifest、数据库或跨进程 DTO 的图标值必须是 `PnwIconId`，并显式携带
namespace：

- Wing 内置：`pnw:dashboard`、`pnw:list`、`pnw:history`、`pnw:report`；
- Host 资源：`cool:folder`、`product:repository`；
- `pnw` 是保留 namespace，只能引用真实 `PnwIconName`，Host 不得注册或覆盖；
- namespace 使用小写字母开头，可含数字和 `-`；local name 可含小写字母、数字、
  `. _ -`；一个 ID 只能有一个 `:`。

裸 `home`、`search`、`document` 即使恰好是 `PnwIconName`，也不是规范持久化值。
它们可能同时存在于 Host 历史图标库，只保留为 Vue 运行时兼容。旧 Vue Component、
旧文本/符号图标和 `pnwRegisterRibbonIcons(pageId → Component)` 同样不得进入新的
manifest 或 DTO。

```ts
import {
  pnwBuiltinIconId,
  pnwCreateIconId,
  pnwIsIconId,
  type PnwIconId,
} from "phoenix-wing";

const dashboard = pnwBuiltinIconId("dashboard"); // pnw:dashboard
const folder = pnwCreateIconId("cool", "folder"); // cool:folder

function acceptManifestIcon(value: unknown): PnwIconId | undefined {
  return pnwIsIconId(value) ? value : undefined;
}
```

`PnwIconId` 提供公开 TypeScript envelope，`pnwIsIconId` 才是持久化边界的运行时
校验器。Host 写盘或接收外部 manifest 时必须调用校验器，不能只用类型断言。

## 2. Host namespace 白名单

Host 用 `pnwRegisterIconNamespace` 把自己的稳定 local name 显式映射为 Vue Component，
或映射到一个 Wing 内置 `PnwIconName`。注册表只存在于当前 JavaScript 进程，不会被
Wing 持久化，也不要求全局注册整套 Element Plus 或产品 iconfont。

```ts
import {
  pnwRegisterIconNamespace,
  type PnwIconNamespaceMap,
} from "phoenix-wing";
import HostFolderIcon from "./HostFolderIcon.vue";

const icons = {
  folder: HostFolderIcon,
  doc: "document",
} satisfies PnwIconNamespaceMap;

const unregister = pnwRegisterIconNamespace("cool", icons);
// Host 应在所属 app/plugin dispose 时调用 unregister()。
```

注册只解决“稳定 ID → 当前 Host 图形”的呈现，不读取权限、Router、菜单或插件状态。
历史 Host 裸值必须由 Host adapter 明确迁移为自己的 namespace，例如把历史 `folder`
规范化成 `cool:folder`；Wing 不猜测一个裸名称属于哪套图标库。

## 3. 统一解析与可见回退

`PnwIconRenderer` 与 `pnwResolveIcon` 使用相同优先级：

1. `pnw:*` 由 Wing 内置 catalog 直接解析；
2. 其他规范 ID 从已注册 Host namespace 白名单解析；
3. 裸 `PnwIconName`、Vue Component、文本和数字按旧运行时语义兼容；
4. 未知、非法或未注册的 ASCII ID 显示 Wing `unknown` 图标，并标记
   `data-pnw-icon-fallback="true"`，不得返回空组件或让无效 sprite ID 阻断 fallback。

Ribbon、完整 Tree、Activity Rail 与浮层 Tree 均使用 `PnwIconRenderer`，因此同一
`PnwNavigationNode.icon` 在各呈现中得到同一结果。导航按钮仍提供自己的可访问名称；
图标默认作为装饰内容。独立使用 Renderer 时可以传 `decorative="false"` 与 `title`。

```vue
<PnwIconRenderer icon="pnw:dashboard" :size="24" />
<PnwIconRenderer icon="cool:folder" :size="24" />
```

## 4. 兼容与职责

- `PnwNavigationNode.icon` 继续是 `unknown`，以保持纯 TypeScript 契约以及旧文本/
  Component 消费者兼容；新可序列化来源应在 adapter 中收紧为 `PnwIconId`。
- `PnwIcon name="dashboard"` 是直接使用内置 SVG 的组件 API，不是持久化格式。
- `pnwRegisterRibbonIcons` / `pnwRibbonIconFor` 保持原 pageId → Component 行为，供旧
  Ribbon 渐进迁移；新导航数据优先使用规范 ID。
- Wing 维护 `pnw` catalog、namespace registry、解析器、Renderer 和 unknown fallback；
  Host 维护产品 namespace 白名单、历史值迁移、权限过滤和 manifest/数据库读写。
- 不把任一 Host 的产品名称、sprite 路径、Router 或数据库字段硬编码进 Wing。

发布前至少验证：规范 ID 校验、`pnw` 保留 namespace、Host 注册/注销、未知 ID 可见
回退、Ribbon/Tree 同树一致呈现、旧 Component/pageId 注册兼容、类型检查、SSR、构建
和 tarball 公共入口。
