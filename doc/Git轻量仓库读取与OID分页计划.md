# Git 轻量仓库读取与 OID 分页计划

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.6.0（已发布）

最后核验：2026-07-29

## 1. 背景与目标

`pnwReadGitRepository({ maxCommits: 1 })` 是历史改写前的完整安全快照，不是轻量列表接口。即使只请求一条 commit，它仍必须读取 worktree status、operation marker、remote reachability、全部 refs，并为历史中的每条 commit 单独执行 `cat-file`。Auto Code 的 Git Block 懒加载不能靠缩小 `maxCommits` 消除这些固定成本。

0.6.0 本地候选新增两项只读 API：

1. 仓库 summary/latest：只提供列表首屏和 commit 群简报需要的数据；
2. OID 游标 commit page：稳定追加 first-parent 历史，不使用易随历史变化漂移的 offset。

本阶段是向后兼容增量，不改变完整快照、squash 分析或写事务的安全门禁，也不执行 npm 发布。

## 2. 公共契约

### 2.1 Core 轻量 commit

`@phoenix-wing/git-core` 新增 `PnwGitCommitSummary`：

- `oid`；
- `author` / `committer`；
- `subject` / `body`。

`pnwFormatGitGroupSummary` 与 `pnwFormatGitGroupSummaries` 改为依赖这个最小结构；原 `PnwGitCommitRecord` 是它的结构化超集，原调用保持兼容。tree、parent、签名和额外 header 不进入轻量契约，因为它们属于历史改写安全检查。

### 2.2 Repository summary/latest

```ts
const summary = await pnwReadGitRepositorySummary(repositoryPath, {
  maxCommits: 1,
  includeRemoteUrl: true,
  signal,
});
```

返回值只包含：

- canonical `root`；
- `headOid`；
- 可选 `currentRef`、`branch`、`upstream`、`remoteUrl`；
- newest-first `commits`。

`remoteUrl` 是显式 opt-in；关闭时不运行 remote 命令。接口不读取 status、operation、remote reachability 或全部 refs。

### 2.3 OID 游标页

```ts
const page = await pnwReadGitCommitPage(repositoryPath, {
  expectedHeadOid: summary.headOid,
  beforeOid: previousPage.nextBeforeOid,
  limit: 50,
  signal,
});
```

- `expectedHeadOid` 必填；当前 HEAD 不一致时拒绝，消费者重新加载 summary；
- `beforeOid` exclusive，必须使用前一页返回的 `nextBeforeOid`；
- `commits` newest-first；
- 仅在 `hasMore` 为真时返回 `nextBeforeOid`；
- `limit` / `maxCommits` 接受 1..1000，防止无界输出。

## 3. 性能与解析约束

每次 summary 或 page 的 commit 数据只由一次 `git log -z --format=...` 读取。字段以 NUL 分隔并按固定数量解析；author、committer、subject 或多行 body 中的空格和换行不会破坏记录边界。不得退回逐 commit `git show` / `cat-file` spawn。

元数据仍使用少量独立 Git 命令：发现 root、校验 HEAD、读取 symbolic ref / upstream，以及显式请求时读取一个 remote URL。分页带游标时还会检查 OID 对 expected HEAD 可达。这些命令不扩张为 status、operation、全 remote 或全 ref 扫描。

## 4. 取消与安全边界

`PnwGitCommandOptions` 新增可选 `signal`。取消时 runner 终止当前 Git 子进程、清理监听器并以 `AbortError` 拒绝。新 summary/page API 和原有只读 `pnwReadGitRepository` / `pnwAnalyzeGitSquash` 均透传该信号。

轻量 API 不能用于执行 squash：它不证明 worktree clean、无进行中操作、commit 无签名/未知 header、remote 不可达或其他 ref 未占用。`pnwExecuteGitSquash`、`pnwUndoGitSquash` 仍调用完整读取和原有 expected-HEAD / warning acknowledgement / 原子 `update-ref` 门禁。

## 5. Auto Code 接入顺序

1. Git Block 首次展开时调用 summary，立即呈现仓库、分支和最新 commit；
2. 保存 `summary.headOid` 作为本次历史浏览的 `expectedHeadOid`；
3. 用户请求更多时用 `nextBeforeOid` 追加 page；
4. HEAD stale 错误触发整块刷新，不把新页拼接到旧列表；
5. View dispose / refresh superseded 时 abort 上一次读取；
6. 只有用户进入 combine/squash 流程时才调用完整 `pnwAnalyzeGitSquash`。

## 6. 验收

- summary 字段边界、remote opt-in、newest-first 顺序；
- OID exclusive 分页、`hasMore` / `nextBeforeOid`、stale HEAD；
- 已取消信号覆盖轻量与兼容完整读取；
- 原完整读取、warning、事务、undo 集成测试保持通过；
- `git-core` / `git-node` test、typecheck、build 和仓库文档门禁通过。
