// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import {
  PNW_DEFAULT_WORKBENCH_HOME_VIEW_ID,
  pnwCreateWorkbenchHomeDefinition,
} from "../utils/pnwWorkbenchHome.js";
import PnwWorkbenchHome from "./PnwWorkbenchHome.vue";

describe("PnwWorkbenchHome", () => {
  it("提供固定 Home 外壳并允许产品填充内容与动作", () => {
    const wrapper = mount(PnwWorkbenchHome, {
      props: {
        title: "工程主页",
        description: "选择一个工具开始工作。",
      },
      slots: {
        actions: '<button type="button">设置</button>',
        default: '<section class="product-features">业务功能</section>',
        footer: "使用提示",
      },
    });

    expect(wrapper.attributes()).toHaveProperty("data-pnw-workbench-home");
    expect(wrapper.get("h1").text()).toBe("工程主页");
    expect(wrapper.get(".pnw-workbench-home-description").text()).toContain("选择一个工具");
    expect(wrapper.get(".product-features").text()).toBe("业务功能");
    expect(wrapper.get(".pnw-workbench-home-footer").text()).toBe("使用提示");
  });

  it("默认定义可映射到 Host registry，但不声明自动打开与 Tab 策略", () => {
    const definition = pnwCreateWorkbenchHomeDefinition({ title: "主页" });
    expect(definition).toEqual({
      viewId: PNW_DEFAULT_WORKBENCH_HOME_VIEW_ID,
      title: "主页",
      iconId: "pnw:home",
      isHome: true,
      presentation: { detachable: false },
    });
    expect(definition).not.toHaveProperty("autoOpen");
    expect(definition).not.toHaveProperty("closable");
  });

  it("SSR 保留唯一 Home 语义根", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(PnwWorkbenchHome, { title: "Home" }, () => "Content"),
    }));
    expect(html).toContain("data-pnw-workbench-home");
    expect(html).toContain("Content");
  });
});
