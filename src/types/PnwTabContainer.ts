/** 通用内容页签的稳定定义；业务载荷继续由消费者自己的数据模型持有。 */
export interface PnwTabDefinition {
  readonly id: string;
  readonly title: string;
  readonly disabled?: boolean;
}

/** 页签切换的用户来源，便于 Host 记录交互但不引入业务命令。 */
export type PnwTabActivationReason = "pointer" | "keyboard";

/** PnwTabContainer 默认插槽收到的内容面板上下文。 */
export interface PnwTabPanelSlotProps {
  readonly tab: PnwTabDefinition;
  readonly active: boolean;
}

/** PnwTabContainer 的页签标题插槽上下文。 */
export interface PnwTabLabelSlotProps extends PnwTabPanelSlotProps {
  readonly disabled: boolean;
}
