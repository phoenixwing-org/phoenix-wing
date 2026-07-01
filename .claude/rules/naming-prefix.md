# phoenix-wing 命名前缀规则

phoenix-wing 是发布到 npm 的公共库，所有对外暴露的名称**必须加前缀**。

## 前缀对照

| 类型 | 前缀 | 示例 |
|------|------|------|
| Vue 组件 | `Pnw` | `PnwAppModalOverlay` |
| CSS 类名 | `pnw-` | `.pnw-modal-overlay` |
| 全局函数 | `pnw` | `pnwIsTerminal` |
| Composables | `usePnw` | `usePnwDocumentTitle` |
| 全局类型 | `Pnw` | `PnwTaskKind` |
| 全局常量 | `PNW_` | `PNW_VERSION` |
| Store | `usePnw` | `usePnwAsyncTaskStore` |

## 硬性要求

1. **从第一行代码就用前缀** — 禁止先写通用名再批量改名
2. CSS 必须 scoped，类名统一加 `pnw-`
3. 动态拼接类名也要加前缀：`:class="'pnw-card-'+status"`
4. 新增导出后更新 `doc/overview.md`
