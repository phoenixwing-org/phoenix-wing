// SPDX-License-Identifier: Apache-2.0

/**
 * 旧界面的 Combo 候选值。
 *
 * 数据仍是普通 string。未知值不会在这里或 Reader/Adapter 中被清空；
 * UI 可以用 has* 方法标记错误，并等待用户主动选择新值。本类不持有 UI
 * 状态，也不修改 `KtCodegenItem`。
 */
export class KtCodegenOptions {
  /** 旧 VB/Qt 界面为 `TCKind` 提供的固定 Combo 候选值。 */
  public static readonly tcKinds = [
    "", // 未指定类型
    "tk_boolean", // 布尔类型
    "tk_double", // 双精度浮点类型
    "tk_string", // 字符串类型
    "tk_specobject", // CAA SpecObject 类型
    "tk_integer", // 旧生成器使用的整数类型
    "tk_null", // 空类型
    "tk_void", // void 类型
    "tk_short", // 短整型
    "tk_char", // 字符类型
    "tk_octet", // 八位字节类型
    "tk_any", // CORBA Any 类型
    "tk_long", // 长整型
    "tk_ushort", // 无符号短整型
    "tk_ulong", // 无符号长整型
    "tk_float", // 单精度浮点类型
    "tk_except", // 异常类型
    "tk_enum", // 枚举类型
    "tk_sequence", // 序列类型
    "tk_objref", // 对象引用类型
    "tk_TypeCode", // CORBA TypeCode 类型
    "tk_Principal", // CORBA Principal 类型
    "tk_struct", // 结构体类型
    "tk_union", // 联合体类型
    "tk_array", // 数组类型
    "tk_alias", // 类型别名
    "tk_external", // 旧生成器扩展的外部类型
    "tk_list", // 旧生成器扩展的列表类型
    "tk_component", // 旧生成器扩展的组件类型
    "tk_error", // 旧生成器扩展的错误类型
    "tk_techno", // 旧生成器扩展的技术对象类型
  ] as const;

  /** 旧 VB/Qt 界面为 `CATAttrInOut` 提供的固定 Combo 候选值。 */
  public static readonly catAttrInOutValues = [
    "", // 未指定方向
    "sp_IN", // 输入属性
    "sp_NEUTRAL", // 中性属性
    "sp_OUT", // 输出属性
  ] as const;

  /**
   * 旧 VB/Qt 界面为 `Component` 提供的 CAA 与 Qt 控件候选值。
   *
   * `-CAA Component-` 和 `-QT Component-` 是旧列表中的分组显示项，继续保留
   * 以便宿主复现旧界面；是否允许用户实际选择由 UI 决定。
   */
  public static readonly components = [
    "", // 不生成控件
    "-CAA Component-", // CAA 控件分组标题
    "SelectorList", // CAA 选择列表
    "CheckButton", // CAA 复选按钮
    "RadioButton", // CAA 单选按钮
    "Spinner", // CAA 数值调节控件
    "Combo", // CAA 下拉选择控件
    "PushButton", // CAA 普通按钮
    "Editor", // CAA 文本编辑控件
    "Label", // CAA 文本标签
    "MultiList", // CAA 多列或多选列表
    "-QT Component-", // Qt 控件分组标题
    "QListWidget", // Qt 列表控件
    "QDoubleSpinBox", // Qt 双精度数值控件
    "QSpinBox", // Qt 整数数值控件
    "QLineEdit", // Qt 单行文本控件
    "QComboBox", // Qt 下拉选择控件
    "QRadioButton", // Qt 单选按钮
    "QCheckBox", // Qt 复选框
    "QTableWidget", // Qt 基于 Item 的表格控件
    "QTableView", // Qt Model/View 表格控件
  ] as const;

  /** 判断字符串是否属于已知 `TCKind` 候选值，不修改传入值。 */
  public static hasTcKind(value: string): boolean {
    return this.includes(this.tcKinds, value);
  }

  /** 判断字符串是否属于已知 `CATAttrInOut` 候选值，不修改传入值。 */
  public static hasCatAttrInOut(value: string): boolean {
    return this.includes(this.catAttrInOutValues, value);
  }

  /** 判断字符串是否属于已知 `Component` 候选值，不修改传入值。 */
  public static hasComponent(value: string): boolean {
    return this.includes(this.components, value);
  }

  /** 公共候选值检查的内部实现。 */
  private static includes(values: readonly string[], value: string): boolean {
    return values.includes(value);
  }
}
