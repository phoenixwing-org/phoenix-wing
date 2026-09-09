# @phoenix-wing/git-node

Node 22 Git adapter：以参数数组运行 Git CLI、读取结构化 commit/ref 状态，并在隔离临时 worktree 中安全合并连续提交。

## 只读轻量接口

- `pnwReadGitRepositorySummary(startPath, options)`：返回 canonical root、HEAD、可选 current ref / branch / upstream / remote URL，以及 newest-first 的最新 N 条 `PnwGitCommitSummary`。默认只读 1 条；仅当 `includeRemoteUrl: true` 时查询一个 remote URL。
- `pnwReadGitCommitPage(startPath, options)`：以必填 `expectedHeadOid` 固定一次浏览会话，使用可选 `beforeOid`（exclusive）和 `limit` 读取 first-parent 历史页；返回 `commits`、`hasMore`，有下一页时返回 `nextBeforeOid`。
- `pnwReadGitCommitGraphPage(startPath, options)`：默认仅读 5 条按提交者时间新到旧交错的
  `date-order` 页，同时保证子提交先于父提交；可选 `expectedHeadOid`、不透明 `beforeCursor`、`limit=1..1000`
  与 `head / local-branches / local-branches-and-tags` scope。返回 parent OID、作者/
  提交者时间、HEAD/本地分支/tag 装饰以及纯数据 `graphRows`。游标固定
  首页 ref tip 与 lane continuation，分支在翻页中移动不会把新历史拼入旧会话。
- 三项接口均以一次 NUL 分隔的 `git log` 批量读取当前页，不逐 commit 启动 `cat-file`；summary/page 不读取全部 refs，graph 首页仅枚举所选本地 refs scope 的 tip。三者都不读取 status、operation marker、全部 remotes 或 remote reachability。
- 三项 options 均接受 `AbortSignal`；兼容的 `pnwReadGitRepository` / `pnwAnalyzeGitSquash` options 也有同名可选字段。底层 `pnwRunGitCommand` 会终止子进程并以 `AbortError` 拒绝。

`limit` / `maxCommits` 范围为 1..1000。分页游标是同一 `expectedHeadOid` 下的不透明 OID；HEAD 改变或游标不再可达时必须重新读取 summary，不应把页结果拼接到旧历史。

默认收缩的“更多 commit”子 Block 应使用 `@phoenix-wing/git-core` 的受控
`PnwGitLazyHistoryState`：首屏 summary 只读一条；收缩态没有 request，因此不得调用本页
API；每次从收缩变为展开都按当前游标得到 `limit=1` 的 request，保持展开时可选择 1 或 5。
`PnwGitCommitPage` 与 Core 的 `PnwGitLazyHistoryPage` 结构兼容，可直接交给
`pnwApplyGitLazyHistoryPage`。不得省略 `expectedHeadOid` 或改用 offset 分页。

完整、安全敏感的 `pnwReadGitRepository`、`pnwAnalyzeGitSquash`、`pnwExecuteGitSquash` 与 `pnwUndoGitSquash` 保持原语义。轻量结果不包含 clean、operation、签名、额外 header、remote reachability 或 ref occupancy，禁止用它绕过 squash preflight。

Commit Graph 每页也只执行一次有界 `git log --date-order --max-count=limit+1`；
首页只额外枚举选定 scope 的 ref tip，不读 status、不预读全历史、不逐 commit
spawn，也不 checkout。时间相同的分支不承诺特定先后；异常时间戳仍以父子拓扑为先，
不能把页排序理解为对时间字段的普通数组排序。当前 HEAD 不保证在首行或首 5 条中。
`beforeCursor` 只能原样回传；HEAD 变化后必须从首页重建会话。
游标 schema v2 固定 `date-order`；旧 v1（`topo-order`）游标会被拒绝，消费者应清空旧页后从首页重读，
不可继续使用旧 offset 或 lane 状态。这不是 npm 包版本变更。

本包不包含 VS Code、Webview 或产品确认 UI。所有历史写入都要求 `expected HEAD`；共享历史 warning 还要求宿主传入显式 acknowledgement。最终通过 `git update-ref <ref> <new> <old>` 原子切换，只移动当前本地分支，不 push、不删除或移动 remote/其他分支与标签。备份 ref 使用 create-only 写入，重名时递增编号。
