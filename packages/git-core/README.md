# @phoenix-wing/git-core

宿主无关的 Git commit 数据契约、多 commit 群消息简报、连续区间校验与 squash 执行计划。多条简报支持顶部一次 remote URL、时间与 reviewer 选项；remote/其他本地引用占用输出结构化 warning，其余不安全条件输出 blocker。

只读列表可使用轻量 `PnwGitCommitSummary`；它只包含 OID、author、committer、subject 与 body。`pnwFormatGitGroupSummary` / `pnwFormatGitGroupSummaries` 同时接受该轻量类型和字段更多的 `PnwGitCommitRecord`。tree、签名与额外 header 仍只属于完整 record 和历史改写安全分析，不能由轻量摘要推断。

按需展示更多 commit 时，先以 `pnwReadGitRepositorySummary({ maxCommits: 1 })` 的最新
commit 创建 `pnwCreateGitLazyHistoryState`。状态默认收缩且不产生分页请求；每次从收缩
变为展开时，`pnwSetGitLazyHistoryExpanded(state, true)` 都规划下一条；再次收起、展开会按当前游标
再规划下一条，同一次展开或重绘不会重复请求。保持展开时可用
`pnwRequestGitLazyHistoryPage(state, 1 | 5)` 规划“下一条/下 5 条”。Host 把 request 传给
`@phoenix-wing/git-node` 的 `pnwReadGitCommitPage`，再用 `pnwApplyGitLazyHistoryPage`
合并结果。Core 会拒绝 stale HEAD、重复首条或重复页；Vue Block、错误提示、AbortSignal
和持久化仍由 Host 持有。

本包不启动 Git、不读写文件，也不依赖 Node、VS Code、Vue 或 DOM。Git CLI 与临时 worktree 由 `@phoenix-wing/git-node` 负责。
