# Git 群消息简报完整正文修复

状态：current（0.6.3 已发布）

Owner：Phoenix Wing maintainers

适用版本：0.6.3

最后核验：2026-08-10

## 问题与修复

已发布的 `@phoenix-wing/git-core@0.6.2` 在格式化群消息简报时只输出 commit `subject`，没有输出 `body`。带空行和项目列表的完整 commit 因而在标题处截断。

`pnwFormatGitGroupSummary` 现改为输出：

```text
仓库与 commit 信息
subject 审查：@审查人

完整 body
```

实现只统一 CRLF/LF 并去除正文首尾的多余换行；正文内部的空行、列表和顺序保持不变。`packages/git-core/src/group-summary.test.ts` 使用 Open Issue 0.7.0 的五条正文覆盖空行与完整内容。

## 发布与消费者收尾

- [x] 用户已在 KT Auto Code Extension Host 中完成真实剪贴板验收。实测输入来自 `phoenix-function-develop@2f32a48`：subject 后保留一个空行，四条项目符号正文完整且未从空行截断，时间、短 OID、`origin/develop` 与“审查：@杨海华”格式正确。
- [x] Wing 已于 2026-08-09 按依赖顺序公开发布全部 12 个锁步单元；所有 Registry
  `latest` 与精确版本均为 0.6.3，隔离 Registry consumer 已直接验证完整正文和懒历史
  状态机。
- [x] 发布准备期间未把未发布 Wing 版本写入消费者 manifest 或 lockfile。
- [ ] Wing 发布后，KT Auto Code 精确升级 `@phoenix-wing/git-core` 等锁步依赖，运行本地/Registry 双门禁。
- [ ] 确认 Registry 格式化函数直接输出完整正文后，删除 Auto 的 `KtcIncludeCommitBody` 临时兼容层，仅保留消费级回归测试。

本次发布未执行 Git push，也未创建或推送标签；后续 Git 操作仍由开发者手工决定。
