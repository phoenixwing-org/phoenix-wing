# Phoenix Wing 当前路线

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.4.x

最后核验：2026-07-18

## 已完成基线

- 八个 npm 发布单元已在 0.4.2 锁步公开发布；聚合包 Registry manifest 不含 `workspace:`。
- 0.4.3 八包锁步候选正在本地归档，包含 KtCodegenTable 分层和控制符缺失 End 重同步；公开发布前消费者继续保持 Registry 0.4.2。
- `code-core`、`kt-codegen`、CAD contracts/core、workspace schema、Node DB adapter 和 Rust source 已有真实消费者。
- Auto Code、Desk Tools 与 Open Issue 只从 Registry 精确消费 0.4.2，不再使用相邻目录 override；机器事实由 `release-matrix.json` 维护。
- 完整 workspace 测试、类型检查、release matrix、TypeScript/Rust tarball smoke 已进入 `pnpm verify:ci`。
- 聚合 UI 编译入口、跨宿主契约、两项纯能力 fixture 与消费者验证均已进入制品门禁；0.4.2 归档、Registry 和七个消费者结果见[《0.4.2 本地候选与公开发布验收》](0.4.2发布候选验收.md)。
- 大型 UI 分阶段拆分已经启动；Wing 的 `KtCodegenTable` 首轮治理已完成：领域编辑在 Core、布局与动作投影在无 DOM ViewModel、主题/滚动视觉规则在内部 Style，Web Component 保留单一 DOM renderer、焦点/事件接线与 Host 事件投影；`contained|page` 布局和公共 disclosure 属性/事件已经落地，公共 tag、数据方法和 browser 子路径保持稳定。

旧 Phase 1–9、框架迁移、组件改进、多包迁移和单 block 迁移文档是实施证据，不再承担当前操作指导；分类见 [`document-manifest.json`](document-manifest.json)。

## 当前优先级

1. **[已完成]** Desk Codegen Apply 纯投影副本已清除，由 Wing 保持算法真源。
2. **[已完成]** AST/import graph 已固化 Core → Contract → Host adapter → View 的依赖方向。
3. **[已完成]** 聚合 UI 已改为编译后的统一入口；Desk/Open Issue 已删除旧消费规避项并通过 Registry 0.4.2 singleton 验证。
4. **[已完成]** 版本判定与 Analyze/Apply/Schema/contribution golden fixtures 已建立并由 Auto/Desk/Open Issue 接入。
5. **[已完成]** 32 个 block 已按 CAA Feature/Dialog/Command、Qt、普通 C++ family 拆分；注册表唯一归属与既有 golden 共同保护公共行为。
6. **[已完成]** UUID/GUID 格式保持与 workspace path 语义已形成两项纯能力及同一 v1 fixture；Auto/Desk 已从 Registry 0.4.2 消费。
7. **[已完成]** 按 Domain Model → ViewModel → Controller → Host adapter → Page shell → visual primitive 完成 `KtCodegenTable` 首轮治理；当前没有第二 DOM renderer 或重复消费者，不为降低单文件行数继续拆分。
8. **[进行中]** 完成 Wing 0.4.3 本地候选、注释标签和公开发布确认；发布后再逐仓升级 Registry 消费并同步版本矩阵。

下一优先级是由 Auto Code、Desk Tools 在 Registry 发布后接入 `KtCodegenTable` 的 page/disclosure API；Windows NSIS 回执由用户手工并行，不阻塞本阶段代码目标。

后期条件 TODO：只有出现第二个 DOM renderer/消费者，或出现可复现的渲染、焦点、dirty 事件维护缺陷时，才继续提炼 DOM renderer / action adapter。当前 577 行 Web Component 剩余职责内聚，继续为降行数拆分会增加焦点、折叠和事件顺序风险。

大型 UI 拆分不改变 0.4.x 公共兼容门禁：Registry 消费、发布客户端限制、tarball、公共协议与真实宿主行为必须持续通过。

## 变更规则

- 公共能力必须先有第二个真实消费者或明确的跨宿主契约。
- 发布版本、消费关系和协议由 `release-matrix.json` 维护，不在文档中复制第二份机器事实。
- 测试数量和 bundle 大小由 CI 产出；当前文档只描述门禁范围，不手写易漂移计数。
- 完成态计划转为 archived；被新真源替代的文档标为 superseded，并保留跳转关系至少一个发布周期。
