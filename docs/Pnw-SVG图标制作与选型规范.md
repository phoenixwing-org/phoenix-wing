# Pnw SVG 图标制作与选型规范

状态：current

Owner：Phoenix Wing maintainers

适用版本：0.6.x

最后核验：2026-08-01

本文给设计者、开发者和 AI 一套可直接执行的图标选型与交付规则。稳定 ID、namespace
与运行时解析见[《Pnw 工作台 Web 图标契约》](Pnw工作台Web图标契约.md)。

## 1. 先选型，再决定是否自绘

| 顺序 | 场景 | 做法 |
|---|---|---|
| 1 | Wing 已有相同语义 | 直接使用 `pnw:*`，如 `pnw:list` |
| 2 | Host 已有同风格资源 | 使用已注册的 Host namespace，如 `cool:folder` |
| 3 | Host 有组件但尚无稳定 ID | 在 Host 白名单中登记 ID → Component，不序列化组件 |
| 4 | 确有新语义且没有可复用资源 | 才自绘；产品/领域图标进入 Host namespace |

只有至少两个真实 Web 消费者共有、且属于通用壳层/导航语义的图标，才考虑进入
`pnw` catalog。产品 Logo、文件类型和领域动作继续由 Host 持有。不要为了“看起来不
一样”重复制作同义图标，也不要复制来源或许可不清晰的资源。

## 2. Pnw 内置几何基线

- `viewBox="0 0 24 24"`；基准设计尺寸为 24px；
- 线框默认 `fill="none"`、`stroke="currentColor"`、`stroke-width="1.75"`；
- 默认 `stroke-linecap="round"`、`stroke-linejoin="round"`；
- 只有圆点、选中区域等确需实心表达的局部路径使用
  `fill="currentColor" stroke="none"`；
- 图形在槽位内保持纵横比，并按视觉重量光学居中；不能只看几何包围盒居中；
- 留出稳定安全边距，16px 时不裁切，36px 时不显得空散。

Host Component、SVG sprite 或 iconfont 不要求强制改成 Pnw 描边。Wing 只统一占框、
缩放、行高和居中，不得用全局 CSS 改写 Host 的 `path`、`stroke-width` 或 `fill`。
实心资源应在 Host namespace 中选择轮廓/面积与当前 Ribbon 接近的同风格变体。

## 3. 颜色属于控件状态

SVG 只使用 `currentColor`，不写死品牌色、亮色或暗色。Ribbon 由按钮语义 token
控制状态，思路与 Fluent/Carbon 的 secondary → primary → accent 层级一致：

| 状态 | 语义 | 推荐 token 回退 |
|---|---|---|
| normal | 次级前景 | `--pnw-ribbon-tool-muted` → `--pnw-workbench-muted` |
| hover | 主前景 | `--pnw-ribbon-tool-hover-text` → `--pnw-workbench-text` |
| active | 品牌/活动前景 | `--pnw-control-active-text` |
| disabled | 保留可辨认轮廓 | 由按钮 disabled opacity 与语义控制，不隐藏图标 |

焦点环属于可交互按钮，不画进图标。Host 可覆盖 token，但插件 manifest 不增加颜色
字段。高对比模式仍以 `currentColor` 跟随系统/Host 前景，不用仅靠低透明度区分状态。

## 4. 线重与颜色分开验收

先把 normal、hover、active 临时设成同一颜色，比较占框、光学中心、线条粗细和实心
面积；视觉重量通过后，再恢复状态 token 检查颜色。不要用浅色掩盖过粗图形，也不要
把实心面积差异误判成主题色问题。

至少检查：

- 16 / 24 / 36px 无裁切、抖动、偏心或细线消失；
- light / dark 下 normal 可辨、hover 明确、active 突出；
- 高对比或系统强制色下仍可识别；
- 键盘 focus-visible 清楚，图标本身默认是装饰内容，按钮提供可访问名称。

## 5. AI / 开发者交付清单

- [ ] 优先复用规范 `pnw:*` 或 Host namespace ID；
- [ ] 自绘前说明缺少的语义和目标 namespace；
- [ ] SVG 不含 `script`、事件处理、`foreignObject`、外链、嵌入位图或 data URL；
- [ ] 移除编辑器 metadata、隐藏图层、无用 defs、重复 transform 和不可见 path；
- [ ] path/shape 保持简洁可读，不把整个画布转换成巨大单一路径；
- [ ] 使用 `currentColor`，局部 fill 例外有明确视觉理由；
- [ ] 不复制来源/许可不明图标；必要时记录来源和许可；
- [ ] 给出 16/24/36px、light/dark 和状态验收证据；
- [ ] 新公共图标同步 catalog、Renderer/SSR 测试、文档与 tarball 门禁。

## 6. 最小线框 SVG 示例

```svg
<svg
  viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <circle cx="12" cy="12" r="7" />
  <path d="M8.5 12h7M12 8.5v7" />
</svg>
```

尺寸由 `PnwIconRenderer` / 控件槽位控制，不在图形路径中绑定固定像素。独立可交互
按钮应由按钮提供 `aria-label`、hover、active、disabled 与 focus-visible 语义。
