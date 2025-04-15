import { onMessage, sendMessage } from "webext-bridge/background";
import type { Tabs } from "webextension-polyfill";
import { MenuService } from "./services/menuService";
import { FeishuService } from "~/services/feishu";
import { feishuConfig } from "~/composables/useSettings";

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import("/@vite/client");
  // load latest content script
  import("./contentScriptHMR");
}

// 获取并验证飞书配置的辅助函数
function getValidFeishuConfig(): FeishuService {
  const config = feishuConfig.value;
  
  if (!config?.appId || !config?.appSecret) {
    throw new Error("请先配置飞书应用的 AppID 和 AppSecret");
  }
  
  return new FeishuService(config);
}

// 如果你不使用侧面板，请移除或关闭此选项
const USE_SIDE_PANEL = false;

// 在Chromium中通过操作按钮切换侧边栏
if (USE_SIDE_PANEL) {
  // @ts-expect-error 缺少类型
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error));
}

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log("Extension installed");
});

let previousTabId = 0;

// communication example: send previous tab title from background page
// see shim.d.ts for type declaration
browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId;
    return;
  }

  let tab: Tabs.Tab;

  try {
    tab = await browser.tabs.get(previousTabId);
    previousTabId = tabId;
  } catch {
    return;
  }

  // eslint-disable-next-line no-console
  console.log("previous tab", tab);
  sendMessage(
    "tab-prev",
    { title: tab.title },
    { context: "content-script", tabId }
  );
});

onMessage("get-current-tab", async () => {
  try {
    const tab = await browser.tabs.get(previousTabId);
    return {
      title: tab?.title,
    };
  } catch {
    return {
      title: undefined,
    };
  }
});

// 监听来自 content script 的消息
onMessage(
  "saveBookmark",
  async (message: { data: { title: string; url: string } }) => {
    try {
      console.log("开始保存书签");
      const feishuService = getValidFeishuConfig();
      
      await feishuService.saveBookmark(message.data);
      console.log("保存成功");
      return { success: true };
    } catch (error) {
      console.error("保存书签失败:", error);
      return { success: false, error: (error as Error).message };
    }
  }
);

// 添加检查 URL 的消息处理
onMessage("checkUrl", async (message: { data: { url: string } }) => {
  try {
    console.log("开始检查URL:", message.data.url);
    const feishuService = getValidFeishuConfig();
    const exists = await feishuService.isUrlExists(message.data.url);

    return {
      success: true,
      exists,
      error: null,
    };
  } catch (error) {
    console.error("检查URL失败:", error);
    return {
      success: false,
      exists: false,
      error: (error as Error).message,
    };
  }
});

// 初始化函数
async function initialize() {
  const menuService = new MenuService();
  await menuService.initialize();
  console.log("Background script loaded");
}

// 执行初始化
initialize().catch(console.error);

// 在现有的后台脚本中添加以下处理函数

// 获取推荐书签
onMessage("getRecommendedBookmarks", async () => {
  try {
    console.log("开始获取推荐书签");
    const feishuService = getValidFeishuConfig();
    const recommendedBookmarks = await feishuService.getRecommendedBookmarks();

    return {
      success: true,
      data: recommendedBookmarks,
    };
  } catch (error) {
    console.error("获取推荐书签失败:", error);
    return {
      success: false,
      error: (error as Error).message || "获取推荐书签失败",
    };
  }
});

// 搜索书签
onMessage("searchBookmarks", async (message: { data: { query: string } }) => {
  try {
    console.log("开始搜索书签:", message.data.query);
    const feishuService = getValidFeishuConfig();
    const searchResults = await feishuService.searchBookmarks(
      message.data.query
    );

    return {
      success: true,
      data: searchResults,
    };
  } catch (error) {
    console.error("搜索书签失败:", error);
    return {
      success: false,
      error: (error as Error).message || "搜索书签失败",
    };
  }
});

// 处理搜索请求
onMessage("executeSearch", async (message: { data: { query: string } }) => {
  try {
    const query = message.data.query;

    // 使用browser API执行搜索（Firefox和Chrome兼容方式）
    if (browser.search && browser.search.query) {
      await browser.search.query({ text: query, disposition: "NEW_TAB" });
      return { success: true };
    } else {
      // 备用方案
      const searchUrl = `https://www.baidu.com/s?q=${encodeURIComponent(
        query
      )}`;
      await browser.tabs.create({ url: searchUrl });
      return { success: true };
    }
  } catch (error) {
    console.error("执行搜索失败:", error);
    return {
      success: false,
      error: (error as Error).message || "搜索执行失败",
    };
  }
});
