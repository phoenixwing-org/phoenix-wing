# Git 提交图轻量分页与拓扑车道

状态：current

Owner：Phoenix Wing maintainers

适用版本：`@phoenix-wing/git-core@0.6.4` / `@phoenix-wing/git-node@0.6.4` 本地候选

最后核验：2026-08-21

## 目标

`pnwReadGitCommitGraphPage` 面向 Git Graph 类的只读视图：按 newest-first 拓扑顺序
展示多个本地分支、tag、merge parent 和连线。它不是
`pnwReadGitRepository` 的裁剪版，也不使用 first-parent 页面冒充多分支图。

边界：

- 默认首页 5 条，消费者可用 `limit=1` 实现“下一条”，用 `limit=5`
  实现“下 5 条”；
- 每页仅一次 `git log --topo-order --max-count=limit+1`，不先读取全部 commit；
- 不读 status、operation、remote reachability 或完整 refs 快照，不逐 commit spawn；
- 不 checkout、不移动 ref、不写工作树；
- 所有页支持 `AbortSignal`，HEAD 变化后拒绝旧 cursor。

## 最小用法

```ts
import { pnwReadGitCommitGraphPage } from "@phoenix-wing/git-node";

const first = await pnwReadGitCommitGraphPage(repositoryPath, {
  refsScope: "local-branches",
  limit: 5,
  signal,
});

const next = first.nextBeforeCursor
  ? await pnwReadGitCommitGraphPage(repositoryPath, {
      expectedHeadOid: first.headOid,
      beforeCursor: first.nextBeforeCursor,
      limit: 1,
      signal,
    })
  : undefined;
```

消费者必须把 `beforeCursor` 当成不透明字符串，不解析、不修改，也不用 offset
或最后一个 OID 自行重建。继续页会固定首页的 ref tip 集合和 lane continuation；
其他本地分支在浏览期间移动不会把新 commit 插入旧页序列。HEAD 变化则立即
拒绝，Host 应清空旧页并重新读首页。

## refs scope

| 值 | 图遍历起点 | 用途 |
| --- | --- | --- |
| `head` | 仅当前 HEAD | 单线/当前历史 |
| `local-branches` | HEAD + 所有 `refs/heads/*` | 默认本地多分支图 |
| `local-branches-and-tags` | 上述起点 + tag 指向的 commit | 还需显示仅由 tag 可达的历史 |

无论哪种 scope，已读 commit 上可见的 `HEAD`、本地分支和 tag 都会以规范
`PnwGitCommitGraphDecoration` 返回。remote ref 不进入本接口；需要 remote graph 时应先
定义网络、权限和更新语义，不能偷偷扩大默认 scope。

## 返回数据

`commits` 中每条只包含绘制和列表所需字段：

- `oid / parentOids / subject`；
- author 与 committer 的 name、email、Git-compatible time + timezone；
- `decorations`：`head / local-branch / tag`，同时保留 canonical name 与 displayName。

`graphRows` 与 `commits` 一一对齐，由纯 `git-core` 函数
`pnwProjectGitCommitGraphRows` 计算：

- `lane / laneCount`；
- `lanesBefore / lanesAfter`；
- `parentEdges[]`：`fromLane / toLane / first-parent | merge-parent`。

Wing 不返回 SVG path、颜色或 DOM。Host 根据 lane 索引选颜色，并可把 commit/ref
数据投影到 `PnwNavigationTreeView` 或自己的 graph renderer。

## 与旧接口的关系

- `pnwReadGitRepositorySummary`：最新 commit 和仓库身份，默认 1 条；
- `pnwReadGitCommitPage`：first-parent 懒历史，OID-exclusive cursor；
- `pnwReadGitCommitGraphPage`：多分支/合并图，必须使用自己的不透明 cursor；
- `pnwReadGitRepository / pnwAnalyzeGitSquash`：完整、安全敏感的 squash 预检。

打开只读 Graph View 禁止调用完整 snapshot 或 squash preflight 代替本接口。

## 发布边界

当前是 `git-core@0.6.4 / git-node@0.6.4` 本地候选。发布前必须通过：

1. [x] Core lane 的 merge、断开 branch tip 和跨页 continuation 测试；
2. [x] Node 的分页、多分支、merge、tag、stale HEAD、scope 和 abort 集成测试；
3. [x] workspace typecheck/build、release matrix、tarball 与隔离 clean consumer；
4. [ ] 至少一个真实消费者按“首 5 / 下 1 / 下 5”完成 sibling 源码 UI 回归；
5. [ ] 用户明确授权后才可 `pnpm publish`，不自动 push 或 tag。

第 4 项不由包级自动测试代替：消费者必须实际验证多分支/merge 的列表与连线、继续分页不重复，
以及 stale HEAD 后清空旧会话。若发布时决定只交付底层只读 API、把 UI 验证后置，发布回执必须
明确记录这一边界，不能把它写成已经完成。
