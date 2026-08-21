# Pnw 简单枚举 Select

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.7.0+

最后核验：2026-08-14

## 定位

`PnwSelect` 只处理少量、已知的字符串枚举。它不搜索、不创建值、不分组，也不保存
业务偏好。Host 持有 `v-model` 并决定 Pinia、localStorage 或后端等持久化介质。

- `PnwSelect`：纯枚举选择，适合 Header 和普通表单；
- `PnwComboTextInput`：文本可自由输入，下拉仅提供建议；
- `PnwDictSelect`：搜索、标签过滤和分组字典。

这三种数据语义不能通过不断增加 props 合并成一个组件。

## 公共 API

```ts
import {
  PnwSelect,
  type PnwSelectOption,
  type PnwSelectSize,
} from "phoenix-wing";
```

```vue
<script setup lang="ts">
import { ref } from "vue";
import { PnwSelect, type PnwSelectOption } from "phoenix-wing";

const mode = ref("safe");
const options: readonly PnwSelectOption[] = [
  { value: "safe", label: "安全模式" },
  { value: "fast", label: "快速模式" },
  { value: "locked", label: "受策略锁定", disabled: true },
];
</script>

<template>
  <PnwSelect
    v-model="mode"
    :options="options"
    size="compact"
    placeholder="选择模式"
    aria-label="工具模式"
  />
</template>
```

Props：

- `v-model`：`string`；没有匹配项时显示 placeholder，不擅自改写值；
- `options`：只含 `value / label / disabled?`；同一 Select 内的 `value` 必须唯一且稳定；
- `size`：`default` 为 32px，`compact` 为约 24px Header 控件；
- `placeholder / disabled / ariaLabel`；
- `colorScheme`：可显式指定 `light / dark / system`，缺省跟随 Host 最近应用的主题。

样式宽度由正常布局决定；需要固定 Header 宽度时可在消费类中设置
`--pnw-select-width`，不复制组件内部 CSS。

## 为什么不使用原生 select

原生 `<select>` 的 trigger 基本可主题化，但 macOS、Windows 和不同浏览器对系统 option
弹层的 surface、hover、selected、disabled 样式控制不一致，暗色 Workbench 中无法保证
稳定对比度。因此 Wing 使用最小自绘 listbox：trigger 仍是原生 button，焦点不离开
combobox；菜单 Teleport 到 `body` 后复用 `PnwOverlayThemeProvider`。

这不是通用 Select 框架：不增加搜索、多选、异步加载、分组、虚拟列表或业务 renderer。
出现这些需求时应选择已有专用组件，或先取得两个真实消费者证据再演进。

## 键盘与无障碍

- trigger 使用 `role="combobox"`、`aria-expanded`、`aria-controls` 和
  `aria-activedescendant`；菜单/项目使用 `listbox / option`；
- `ArrowDown / ArrowUp` 打开或移动，自动跳过 disabled；
- `Home / End` 跳到首尾可用项，`Enter / Space` 选择，`Escape / Tab` 关闭；
- 输入文字执行短时前缀定位，但不改变选择、不增加搜索框；
- 选中、hover、focus、disabled 不能只依赖颜色，disabled 同时带 ARIA 和透明度；
- trigger 与 option 的长 label 使用省略号，并以 `title` 保留完整文本。

## 主题与浮层

trigger、option 菜单、hover、selected、focus 和 disabled 只消费
`--pnw-workbench-* / --pnw-control-* / --pnw-focus-ring` 语义 token。菜单使用 `hostTools`
叠层，按 viewport 决定向上或向下展开；Teleport 后仍携带解析后的 light/dark scheme。
Wing 不接管 Host 的主题选择或持久化。

仓内运行示例见
[`PwwFixtureCodegenView.vue`](../examples/PwwWorkbenchWeb/src/fixture/PwwFixtureCodegenView.vue)。
