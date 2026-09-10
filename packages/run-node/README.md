# @phoenix-wing/run-node

Node 22 工作区 Run adapter：受限扫描脚本/可执行文件、JSONC `tasks.json` 导入、CAA/CMake project 分类与内置 runner launch plan。

VS Code Task 对象、Terminal、Problems、确认 UI 和运行状态仍属于消费端 adapter。

本包同时提供规则产物和 Git 强制清理的预览/执行 API。规则清理冻结候选文件与完整目录树；
Git 清理冻结仓库身份、HEAD、工作树与暂存区各自的 tracked diff 和 `git clean -nffdx` 清单，再受控执行
`git reset --hard HEAD` 与 `git clean -ffdx`。预览与执行均使用双 force，嵌套 Git 仓库也必须显示；
以 `git ls-files -z` 收集未跟踪/ignored 目标并冻结完整目录树，不解析人类可读清单作为路径、也不跟随链接。
执行前以及 reset 后、clean 前复核目标身份和内容时间戳；旧的无完整目标快照必须重新预览。
确认 UI 和 preview token 生命周期仍由 Host 持有，Host 必须在取消/关闭时撤销 token 并提供 `shouldContinue`。
取消是步骤间协作检查，不能回滚已经完成的 reset/删除，也不能保证阻止已启动的 Git 子进程；
reset 已完成后停止或 clean 失败会在错误中明确报告阶段，Host 应将它保留到日志。
预览与执行不是文件系统事务，请停止其他写入者后再确认高风险清理。

## Run 统一清理

原 `pnwPreviewCleanupArtifacts` / `pnwCleanPreviewedArtifacts` 仍只匹配根目录的直属条目，AutoBuild 默认规则范围不变。

- `pnwPreviewRecursiveCleanupArtifacts(root, rulesYaml)` / `pnwCleanPreviewedRecursiveArtifacts(preview, options)` 是显式递归入口，供 Run 原有 `build`、`objects`、`*.obj` 清理使用。跳过 `.git` 和目录链接，冻结完整目标树与中间祖先身份；执行前整批复验，逐节点检查身份和取消信号，只删除预览中冻结的节点。匹配目录内有仓库或链接时保留边界与父目录，只展示/删除安全子目标，`skippedPaths` 返回保留路径。递归模式不接受 `unlinkDirectories`。
- `pnwPreviewGitUntrackedCleanup(root)` / `pnwExecuteGitUntrackedCleanup(preview, options)` 从工作目录递归发现仓库，遇 `.git` 停止下降，不跟随目录链接。逐仓库以 NUL 清单冻结未跟踪和 ignored 目标；执行采用单 force `git --literal-pathspecs clean -dfx -- <已确认目标>`，不调用 reset，不改 HEAD、暂存区和已跟踪文件。`preservedRepositories` 列出保留的嵌套仓库；包含它们的父目录不会误报为整个已删除。

两组预览都必须由 Host 原样保存为一次性冻结快照，并在用户确认后调用执行入口。祖先替换、目标内容/树变化、Git 暂存区变化会拒绝执行；预览后出现的其他普通文件或新仓库不自动纳入本次清理。`shouldContinue` 在目标间检查，Git 子进程开始后无法保证立即中止；取消不回滚已删项，错误阶段信息必须保留到 Output。以上安全复验不能替代操作系统级事务或锁，请先停止其他写入者。

`src/cleanup-recursive.test.ts` 使用专用临时目录和真实临时 Git 仓库验证递归范围、符号链接/祖先替换、嵌套仓库保护、特殊字符路径、ignored 内容变化、暂存区保护及取消；不操作用户项目。
