# @phoenix-wing/workspace-schema

Phoenix `.phoenix/phoenix-workspace.sqlite` 的版本化、无驱动数据库契约。

当前 v13 DDL 从 Desk Tools 生产实现逐字冻结，包含 CAD、审计、Code、CAA、工作集、偏好和 UI session 的组合 Schema。包只拥有版本、DDL、对象清单和兼容判定；文件路径、SQLite 连接、WAL 处理、权限、备份、确认和产品生命周期仍由宿主 adapter 负责。

v13 以前的版本和未知未来版本当前统一判定为 `recreate`，不声明不存在的原地升级能力。兼容矩阵冻结在 `fixtures/workspace-schema-compatibility-v1.json`；新增可验证迁移前不得放宽这一规则。

```ts
import {
  PNW_WORKSPACE_SCHEMA_VERSION,
  PNW_WORKSPACE_SCHEMA_V13_DDL,
  pnwClassifyWorkspaceSchemaVersion,
} from "@phoenix-wing/workspace-schema";
```
