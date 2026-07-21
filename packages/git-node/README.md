# @phoenix-wing/git-node

Node 22 Git adapter：以参数数组运行 Git CLI、读取结构化 commit/ref 状态，并在隔离临时 worktree 中安全合并连续提交。

本包不包含 VS Code、Webview 或产品确认 UI。所有历史写入都要求 `expected HEAD`；共享历史 warning 还要求宿主传入显式 acknowledgement。最终通过 `git update-ref <ref> <new> <old>` 原子切换，只移动当前本地分支，不 push、不删除或移动 remote/其他分支与标签。备份 ref 使用 create-only 写入，重名时递增编号。
