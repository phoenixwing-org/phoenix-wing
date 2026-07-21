# @phoenix-wing/git-core

宿主无关的 Git commit 数据契约、多 commit 群消息简报、连续区间校验与 squash 执行计划。多条简报支持顶部一次 remote URL、时间与 reviewer 选项；remote/其他本地引用占用输出结构化 warning，其余不安全条件输出 blocker。

本包不启动 Git、不读写文件，也不依赖 Node、VS Code、Vue 或 DOM。Git CLI 与临时 worktree 由 `@phoenix-wing/git-node` 负责。
