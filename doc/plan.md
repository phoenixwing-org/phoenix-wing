# Phoenix Wing 当前路线

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.4.x

最后核验：2026-07-17

## 已完成基线

- 八个 npm 发布单元已在 0.4.1 锁步发布；聚合包 Registry manifest 不含 `workspace:`。
- `code-core`、`kt-codegen`、CAD contracts/core、workspace schema、Node DB adapter 和 Rust source 已有真实消费者。
- Auto Code、Desk Tools 与 Open Issue 只从 Registry 精确消费 0.4.1，不再使用相邻目录 override。
- 完整 workspace 测试、类型检查、release matrix、TypeScript/Rust tarball smoke 已进入 `pnpm verify:ci`。
- 0.4.2 已进入本地发布候选阶段：八包锁步版本、聚合 UI 编译入口、跨宿主契约与两项纯能力 fixture 已纳入制品门禁；公开发布和消费者升级仍须单独验收。

旧 Phase 1–9、框架迁移、组件改进、多包迁移和单 block 迁移文档是实施证据，不再承担当前操作指导；分类见 [`document-manifest.json`](document-manifest.json)。

## 当前优先级

1. **[已完成]** Desk Codegen Apply 纯投影副本已清除，由 Wing 保持算法真源。
2. **[已完成]** AST/import graph 已固化 Core → Contract → Host adapter → View 的依赖方向。
3. **[Wing 已完成]** 聚合 UI 已改为编译后的统一入口；待 0.4.2 发布后由 Desk/Open Issue 移除 0.4.1 消费规避项。
4. **[Wing 已完成]** 版本判定与 Analyze/Apply/Schema/contribution golden fixtures 已建立；待 0.4.2 发布后由 Auto/Desk/Open Issue 接入。
5. **[已完成]** 32 个 block 已按 CAA Feature/Dialog/Command、Qt、普通 C++ family 拆分；注册表唯一归属与既有 golden 共同保护公共行为。
6. **[Wing 已完成]** UUID/GUID 格式保持与 workspace path 语义已形成两项纯能力及同一 v1 fixture；待 0.4.2 发布后由 Auto/Desk 删除本地副本。

下一优先级是完成 0.4.2 Registry 发布与消费闭环、两项纯能力消费者去重和代表性真实宿主验收；这些证据成立后再复评 92.5。发布候选状态与边界见[《0.4.2 本地发布候选验收》](0.4.2发布候选验收.md)。

大型旧 UI 的全面拆分不属于 0.4.x 当前门禁；达到联合成熟度 92.5 后另立目标。

## 变更规则

- 公共能力必须先有第二个真实消费者或明确的跨宿主契约。
- 发布版本、消费关系和协议由 `release-matrix.json` 维护，不在文档中复制第二份机器事实。
- 测试数量和 bundle 大小由 CI 产出；当前文档只描述门禁范围，不手写易漂移计数。
- 完成态计划转为 archived；被新真源替代的文档标为 superseded，并保留跳转关系至少一个发布周期。
