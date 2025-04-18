import type { Tabs, Menus } from "webextension-polyfill";
import { contextMenus as browserMenus } from "webextension-polyfill";

export class MenuService {
  private static readonly MENU_ID = "save-to-feishu";

  public async initialize() {
    try {
      // 判断是否为开发环境
      const isDev = import.meta.env.DEV;
      const titleSuffix = isDev ? "（开发版）" : "";

      // 简化菜单检查逻辑，直接尝试创建
      await browserMenus.create({
        id: MenuService.MENU_ID,
        title: `收藏当前网址到飞书多维表格 - 無名云书签${titleSuffix}`,
        contexts: ["page", "selection"],
      });
      console.log("创建右键菜单成功");
    } catch (error) {
      // 如果菜单已存在，会抛出错误，但这是可以接受的
      console.log("右键菜单可能已存在，继续执行");
    }

    // 监听菜单点击事件
    browserMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === MenuService.MENU_ID)
        await this.handleMenuClick(info, tab);
    });
  }

  private async handleMenuClick(info: Menus.OnClickData, tab?: Tabs.Tab) {
    console.log("右键菜单被点击:", info);
    if (!tab?.id) {
      console.log("未找到活动标签页");
      return;
    }

    const bookmarkInfo = {
      title: tab.title || "",
      url: tab.url || "",
    };

    try {
      // 直接发送消息给 content script
      await browser.tabs.sendMessage(tab.id, {
        type: "openBookmarkEditor",
        data: bookmarkInfo,
      });
    } catch (error) {
      console.error("打开编辑器失败:", error);
    }
  }
}
