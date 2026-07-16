// SPDX-License-Identifier: Apache-2.0

/**
 * 单条参数代码生成配置，也是 MVC-C 各层共享的最小数据项。
 *
 * 对应旧 VB `KevinCAAParamInfor`、C++ `KtaControlConfigItem` 和 Qt
 * `KtdAutoCodeItem`。17 个旧格式字段全部公开、可变，不生成
 * getter/setter。Reader、UI、Controller、Core 和 Renderer 可以持有同一个
 * 实例；任意一处修改都会立即对其他持有者可见，因此调用者负责协调修改。
 *
 * `tcKind`、`catAttrInOut`、`component` 等 Combo 字段仍是普通字符串。
 * 列表外的值必须原样保留，由 UI 提示并等待用户主动修正。
 */
export class KtCodegenItem {
  /**
   * 旧格式第0列 `NameSuffix`。
   *
   * 标识本参数所属的类、对象或生成目标后缀；默认沿用旧实现的 `Base`。
   */
  public nameSuffix: string = "Base";

  /**
   * 旧格式第1列 `ID`。
   *
   * 旧生成规则用于排序、分组或选择特殊生成分支的参数编号。
   */
  public id: number = 0;

  /** 旧格式第2列 `Name`：供表格或界面显示的参数名称。 */
  public name: string = "";

  /**
   * 旧格式第3列 `ParamString`。
   *
   * 参数在生成代码中的变量名或符号名，也是常用的参数身份字段。
   */
  public paramString: string = "";

  /** 旧格式第4列 `DataType`：生成代码使用的 CAA、C++ 或 Qt 数据类型。 */
  public dataType: string = "";

  /**
   * 旧格式第5列 `TCKind`：CAA catalog/spec 的类型标识。
   *
   * 值保持为普通字符串；不在候选列表中时仍须原样读取和写回。
   */
  public tcKind: string = "";

  /**
   * 旧格式第6列 `DefaultValue`：生成声明、构造或 UI 初始化代码时使用的默认值文本。
   */
  public defaultValue: string = "";

  /**
   * 旧格式第7列 `CATAttrInOut`：CAA 特征属性的输入、输出或中性方向标识。
   *
   * 值保持为普通字符串；未知值由 UI 提示，不由 Reader 或 Adapter 清空。
   */
  public catAttrInOut: string = "";

  /** 旧格式第8列 `IsList`：是否按列表或集合参数生成相关代码。 */
  public isList: boolean = false;

  /** 旧格式第9列 `IsOnTree`：参数是否参与旧界面或对象树相关生成。 */
  public isOnTree: boolean = false;

  /**
   * 旧格式第10列 `Component`：CAA 或 Qt 控件类型。
   *
   * 例如 `Spinner`、`QLineEdit`、`QComboBox`；私有或未来扩展值必须保留。
   */
  public component: string = "";

  /**
   * 旧格式第11列 `ComponentCount`，历史 CSV 表头也可能写作 `Count`。
   *
   * 表示需要生成的控件数量；0 在旧逻辑中通常表示不生成 UI 行为。
   */
  public componentCount: number = 0;

  /** 旧格式第12列 `IsParamDlg`：参数是否参与参数对话框代码生成。 */
  public isParamDlg: boolean = false;

  /** 旧格式第13列 `Unit`：参数单位文本，例如 `mm` 或 `degree`。 */
  public unit: string = "";

  /** 旧格式第14列 `Author`：参数配置记录的作者。 */
  public author: string = "";

  /** 旧格式第15列 `CreateDate`：参数配置记录的创建日期文本。 */
  public createDate: string = "";

  /** 旧格式第16列 `Notes`：参数说明、生成提示或其他备注。 */
  public notes: string = "";

  /**
   * 创建参数项，并可用同名字段进行初始化。
   *
   * 构造函数不执行候选值校验或自动修正，确保旧配置字符串保持原样。
   */
  constructor(initial?: Partial<KtCodegenItem>) {
    if (initial) Object.assign(this, initial);
  }
}
