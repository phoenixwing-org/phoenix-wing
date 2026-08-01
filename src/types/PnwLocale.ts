/** Phoenix Wing 当前内置的界面语言；语言选择与持久化由宿主持有。 */
export type PnwLocale = "zh-CN" | "en-US";

/** 可用于覆盖文案中的简单命名参数。 */
export type PnwLocaleMessageValues = Readonly<Record<string, string | number>>;
