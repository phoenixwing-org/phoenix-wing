# Phoenix Wing 当前路线

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.4.x

最后核验：2026-07-19

## 已完成基线

- 八个 npm 发布单元已在 0.4.3 锁步公开发布；聚合包 Registry manifest 仅引用精确的 0.4.3 内部依赖，不含 `workspace:`、`link:` 或 `file:`。
- 注释标签 `0.4.3` 已封签到最终候选 `5211504` 并推送远端；Auto Code、Desk Tools 与 Open Issue 仍精确消费 Registry 0.4.2，等待各仓独立升级和验收。
- `code-core`、`kt-codegen`、CAD contracts/core、workspace schema、Node DB adapter 和 Rust source 已有真实消费者。
- Auto Code、Desk Tools 与 Open Issue 只从 Registry 精确消费 0.4.2，不再使用相邻目录 override；机器事实由 `release-matrix.json` 维护。
- 完整 workspace 测试、类型检查、release matrix、TypeScript/Rust tarball smoke 已进入 `pnpm verify:ci`。
- 聚合 UI 编译入口、跨宿主契约、两项纯能力 fixture 与消费者验证均已进入制品门禁；0.4.2 归档、Registry 和七个消费者结果见[《0.4.2 本地候选与公开发布验收》](0.4.2发布候选验收.md)。
- 大型 UI 分阶段拆分已经启动；Wing 的 `KtCodegenTable` 首轮治理已完成：领域编辑在 Core、布局与动作投影在无 DOM ViewModel、主题/滚动视觉规则在内部 Style，Web Component 保留单一 DOM renderer、焦点/事件接线与 Host 事件投影；`contained|page` 布局和公共 disclosure 属性/事件已经落地，公共 tag、数据方法和 browser 子路径保持稳定。

旧 Phase 1–9、框架迁移、组件改进、多包迁移和单 block 迁移文档是实施证据，不再承担当前操作指导；分类见 [`document-manifest.json`](document-manifest.json)。

## 当前优先级

1. **[已完成：核心平台基线]** Apply、UUID/GUID、workspace path、32 个 Renderer family、跨宿主 golden fixture、聚合 UI 单出口与 AST/import graph 均由 Wing 保持真源，Auto/Desk/Open Issue 已通过 Registry 0.4.2 验证；原八条重复完成项合并由本条追踪。
2. **[已完成：0.4.3 功能范围]** Marker 在下一 Start/End 边界恢复并输出结构化诊断；仅 `missing-end`/`orphan-end` 时可安全应用其余完整区域；`KtCodegenTable` 已完成 ViewModel/Style 分层、`contained|page`、disclosure 与高对比选中态治理，公共入口保持兼容。
3. **[进行中：0.4.3 消费升级]** 0.4.3 完整 `pnpm verify:ci`、最终候选注释标签、八包 pnpm 公开发布、Registry 查询及干净 npm/pnpm 安装与导入均已完成；下一步逐仓升级 Auto Code、Desk Tools 与 Open Issue 的精确 Registry 消费并同步版本矩阵。

下一优先级是由 Auto Code、Desk Tools 在 Registry 发布后接入 `KtCodegenTable` 的 page/disclosure API；Windows NSIS 回执由用户手工并行，不阻塞本阶段代码目标。

后期条件 TODO：只有出现第二个 DOM renderer/消费者，或出现可复现的渲染、焦点、dirty 事件维护缺陷时，才继续提炼 DOM renderer / action adapter。当前 577 行 Web Component 剩余职责内聚，继续为降行数拆分会增加焦点、折叠和事件顺序风险。

大型 UI 拆分不改变 0.4.x 公共兼容门禁：Registry 消费、发布客户端限制、tarball、公共协议与真实宿主行为必须持续通过。

## 变更规则

- 公共能力必须先有第二个真实消费者或明确的跨宿主契约。
- 发布版本、消费关系和协议由 `release-matrix.json` 维护，不在文档中复制第二份机器事实。
- 测试数量和 bundle 大小由 CI 产出；当前文档只描述门禁范围，不手写易漂移计数。
- 完成态计划转为 archived；被新真源替代的文档标为 superseded，并保留跳转关系至少一个发布周期。
