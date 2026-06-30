# phoenix-wing npm 包创建计划

## 目标

从 phoenix-desk-tools 提取可复用的 TypeScript 纯逻辑（utils、types、算法），做成独立 npm 包 `phoenix-wing`，供多个项目共享。

## 步骤

### 1. npm init

在 `/Users/kathy/phoenix/phoenix-wing/` 执行 `npm init`，包名 `phoenix-wing`。

### 2. TypeScript 骨架

参考 `phoenix-desk-tools/packages/catdlg-core/` 的结构：
- `tsconfig.json`
- `src/index.ts` 统一导出入口
- `package.json` 配置 `main` / `types` / `exports` 字段

### 3. 搬入可复用模块

优先搬**纯逻辑、零框架依赖**的模块：

**第一批 — 纯工具函数**（`phoenix-desk-tools/web-ui/src/utils/` 中无 Vue/DOM 依赖的）：
- `asyncProgress.ts` / `asyncProgressTypes.ts` — 异步任务状态机
- `scheduleDebounced.ts` — 防抖调度
- `pointerDrag.ts` — 指针拖拽计算
- `colorScheme.ts` — 色彩方案解析
- `phoenixBrowserStorage.ts` — localStorage 封装
- `pagePropertySchema.ts` — 声明式属性表 schema 构建器
- 其他无副作用的纯函数工具

**第二批 — 类型定义**（`phoenix-desk-tools/web-ui/src/types/`）：
- `pageProperties.ts` — 属性表类型系统
- 其他通用类型

**第三批 — CAA 相关**（可选：如果 `@phoenix/catdlg-core` 不单独维护，可合并进来）

### 4. 在 phoenix-desk-tools 中引用

- 将 `phoenix-wing` 加入 pnpm workspace
- web-ui 通过 `workspace:*` 引用
- 替换原来对本地 utils/types 的直接引用

### 5. 发布到 npm

```bash
npm login
npm publish
```

代码托管在 Gitee 完全没问题，npm 和 Git 是两套独立系统。

## 核心理念

`phoenix-wing` = 纯 TypeScript 工具库，零框架依赖，只做纯逻辑。
