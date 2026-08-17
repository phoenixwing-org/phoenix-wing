# Pnw 本地与服务器 Host 产品线边界

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.7.0+

最后核验：2026-08-16

## 1. 名称与现状

正式产品/框架名称是 **Phoenix Admin**。文档、代码注释和方案中不得把 Phoenix Admin
与 Midway 并列成两个候选产品。

Midway 是 Phoenix Admin 当前采用的服务端内核。只有说明技术栈确有必要时，才写成
**Phoenix Admin（Midway 内核）**；其余位置统一简称 Phoenix Admin。

Phoenix Admin 已经在开发并被服务器应用实际采用，Issue 等应用已经运行在这条产品线上。
它不是未来候选方案，也不是需要 Wing 重新设计的 Host。

## 2. 两条产品线共享 Wing

Phoenix Wing 是 Host 中立的 Vue UI / Workbench 公共框架。它提供导航、Ribbon、View、
Primary/Secondary/Bottom、Workspace、Editor MRU、View presentation、浮层主题和诊断等
通用契约，但不拥有产品的 Router、权限、业务 API、文件系统或持久化介质。

```text
                         Phoenix Wing
             Vue UI / Workbench 公共契约与状态机
                    ┌────────┴────────┐
                    │                 │
             本地应用产品线       服务器应用产品线
        Vue 3 + Wing + 本地 Host   Phoenix Admin Vue + Wing
        Node/Hono + Tauri 薄壳     Phoenix Admin 服务端
                    │              （Midway 内核）
             本机目录/应用数据       远端权限/业务数据
```

两条产品线共享 Wing，不复制 Workspace、View presentation、Editor MRU、Ribbon、窗口栈等
公共状态机。它们只实现各自的 Host adapter 与业务 View。

## 3. 本地应用产品线

本地工程类应用明确属于本地应用线，典型技术组合为：

- Vue 3 + Phoenix Wing；
- Node/Hono 本地 Host；
- Tauri 2 薄壳；
- 私有 TypeScript Core；
- 由 Host 提供本机目录、应用数据、受控文件读写、任务和可选本地数据库能力。

Desk Tools 是本地工程工作台的公开提炼来源。其他本地消费者可使用相同 Wing Workspace、
View presentation 和 Workbench 契约，但领域 Core、文件格式、任务及数据库 schema 继续归产品。

本地 Web 不是公网 Web。`127.0.0.1` 页面虽然使用 Web 技术，Hono 仍是本地受信 Host 的
服务边界，必须承担 Workspace 身份、应用数据、权限范围内的文件系统访问和路径越界防护。
“纯浏览器模式”只是本地 Host 离线或平台能力不可用时的受控降级：它不能伪造本机绝对
路径，也不能静默获得文件系统或 SQLite 权限。

本地应用不得为了复用界面而再次引入 Phoenix Admin。Wing 已经是两条产品线之间的 UI 与
Workbench 共享层。

## 4. 服务器应用产品线

服务器应用明确使用 Phoenix Admin。Phoenix Admin 负责：

- 服务端认证、用户、组织、角色和权限；
- 远端 Router/菜单、业务 API、数据库与审计；
- 多用户数据边界和部署运维；
- 将受控导航、View contribution、主题和偏好投影给 Wing Vue 前端。

Wing 不吸收 Midway controller、远端数据库 DTO、权限 code 或产品 URL。Phoenix Admin
也不复制 Wing 的布局与 View 状态机，只通过薄 Host adapter 提供受控数据和生命周期。

## 5. 跨产品集成必须另立契约

如果以后需要让任一本地工程应用与 Phoenix Admin 集成，必须作为跨产品边界单独建立：

1. ADR，说明部署、信任边界和失败降级；
2. 版本化数据契约，区分本地工程数据与服务器业务数据；
3. 身份、认证、授权和审计模型；
4. 同步、冲突、离线、重试和隐私策略；
5. 独立 Host adapter 与端到端测试。

不得把远程服务器语义、用户权限或 Phoenix Admin DTO 偷偷叠加到本地 Hono API；也不得因
某个本地功能可远程化，就改变现有 Workspace 的本机目录安全边界。

## 6. 责任矩阵

| 能力 | Wing | 本地 Node/Hono + Tauri Host | Phoenix Admin Host |
| --- | --- | --- | --- |
| Ribbon、布局、MRU、View presentation | 公共契约与状态机 | 消费并提供业务 View | 消费并提供业务 View |
| Workspace controller | 公共纯状态机和 ports | canonical 本机目录、读写、watch | 仅在产品确有工程 Workspace 时适配 |
| 文件系统 | 不直接访问 | 受控本机访问与 realpath/symlink 防护 | 远端存储/API，按服务权限处理 |
| 认证与权限 | 只消费 visible/enabled 结果 | 本地应用策略 | Phoenix Admin 真源 |
| 持久化 | 定义受控状态和 storage ports | app-data / workspace-local adapter | 用户偏好和业务数据库 adapter |
| 领域 Core | 不拥有 | 产品私有 TypeScript/Node/Rust Core | Phoenix Admin 插件与服务领域层 |

## 7. 文档点检

- 正式名称只写“Phoenix Admin”；需要技术栈时写“Phoenix Admin（Midway 内核）”。
- 不把 Phoenix Admin 描述为未来方案。
- 本地应用不因使用 Vue/Wing/Hono 就被描述为公网 Web 或 Phoenix Admin 插件。
- 服务器应用不复制 Wing Workspace、MRU、Ribbon 或 View presentation 状态机。
- 跨产品集成没有 ADR、数据契约和权限模型时，不进入公共 API。
