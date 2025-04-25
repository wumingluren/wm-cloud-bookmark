interface FeishuConfig {
  appId: string;
  appSecret: string;
  baseId: string;
  tableId: string;
}

import { useWebExtensionStorage } from "~/composables/useWebExtensionStorage";
import { otherSettings } from "~/composables/useSettings";

export class FeishuService {
  private config: FeishuConfig;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(config: FeishuConfig) {
    this.config = config;
  }

  /**
   * 获取飞书访问令牌
   * @returns 获取令牌是否成功
   */
  private async getAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_id: this.config.appId,
            app_secret: this.config.appSecret,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`获取令牌失败: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.tenant_access_token;
      return true;
    } catch (error) {
      console.error("获取访问令牌失败:", error);
      this.accessToken = null;
      return false;
    }
  }

  /**
   * 测试飞书多维表格连接
   * @returns 包含连接测试结果的对象，success表示是否成功，message包含详细信息
   */
  public async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!(await this.getAccessToken())) {
        return { success: false, message: "获取访问令牌失败" };
      }

      const tableResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.baseId}/tables/${this.config.tableId}/records?page_size=1`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!tableResponse.ok) {
        throw new Error(
          "多维表格访问失败，请检查 Base ID 和 Table ID 是否正确"
        );
      }

      const tableData = await tableResponse.json();
      if (tableData.code !== 0) {
        throw new Error(tableData.msg || "多维表格访问失败");
      }

      return { success: true, message: "连接测试成功，多维表格访问正常" };
    } catch (error) {
      return {
        success: false,
        message: `连接测试失败: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 检查URL是否已存在于多维表格中
   * @param url 要检查的URL地址
   * @returns 返回布尔值，true表示URL已存在，false表示不存在
   * @throws 当获取访问令牌失败或API请求失败时抛出错误
   */
  public async isUrlExists(url: string): Promise<boolean> {
    if (!(await this.getAccessToken())) {
      throw new Error("获取访问令牌失败");
    }

    const requestUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.baseId}/tables/${this.config.tableId}/records/search`;

    const requestBody = {
      filter: {
        conjunction: "and",
        conditions: [
          {
            field_name: "网址",
            operator: "is",
            value: [url],
          },
        ],
      },
    };

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`检查URL失败: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(data.msg || "检查URL失败");
    }

    return data.data.total > 0;
  }

  /**
   * 保存书签到飞书多维表格
   * @param bookmark 要保存的书签对象，包含标题、URL和标签
   * @param bookmark.title 书签标题
   * @param bookmark.url 书签URL地址
   * @param bookmark.tags 书签标签，使用#分隔
   * @returns 返回飞书API的响应数据
   * @throws 当标题或URL为空、URL已存在、或API请求失败时抛出错误
   */
  public async saveBookmark(bookmark: { title: string; url: string; tags?: string }) {
    if (!bookmark?.title || !bookmark?.url) {
      throw new Error("书签标题和网址不能为空");
    }

    // 检查URL是否已存在，同时获取 token
    const exists = await this.isUrlExists(bookmark.url);
    if (exists) {
      throw new Error("该网址已经存在");
    }

    // 处理标签，将#分隔的标签转换为数组
    let tags: string[] = [];
    if (bookmark.tags) {
      tags = bookmark.tags.split('#').filter(tag => tag.trim() !== '');
    }

    const requestBody = {
      fields: {
        标题: bookmark.title,
        网址: {
          link: bookmark.url,
        },
        // 如果有标签，则添加到请求中
        ...(tags.length > 0 && { 标签: tags })
      },
    };

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.baseId}/tables/${this.config.tableId}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`保存失败: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.msg || "保存失败");
    }

    return data;
  }

  /**
   * 获取随机推荐书签
   * 首先尝试获取所有标签选项，然后随机选择1-3个标签获取相关书签
   * 如果获取的书签数量不足指定条数，会补充最新的书签
   * 如果获取的书签超过指定条数，会随机选择指定条数返回
   *
   * @returns 返回推荐的书签数组
   * @throws 当获取访问令牌失败或API请求失败时抛出错误
   */
  public async getRecommendedBookmarks(): Promise<any[]> {
    try {
      const limit = otherSettings.value.recommendCount;

      if (!(await this.getAccessToken())) {
        throw new Error("获取访问令牌失败");
      }

      // 1. 先获取标签字段的所有选项
      const tagsOptions = await this.fetchTagsOptions();

      if (!tagsOptions || tagsOptions.length === 0) {
        console.log("没有找到标签选项，将获取最新的书签");
        // 如果没有标签选项，则获取最新的书签
        return await this.fetchLatestBookmarks(limit);
      }

      // 2. 随机选择1-3个标签
      const selectedTags = this.getRandomTags(
        tagsOptions,
        Math.floor(Math.random() * 3) + 1
      );

      // 3. 使用选中的标签查询书签
      const bookmarks = await this.fetchBookmarksByTags(selectedTags);

      // 4. 如果获取的书签不足指定条数，补充最新的书签
      if (bookmarks.length < limit) {
        const latestBookmarks = await this.fetchLatestBookmarks(
          limit - bookmarks.length
        );

        // 合并并去重
        const allBookmarks = [...bookmarks];
        for (const bookmark of latestBookmarks) {
          if (!allBookmarks.some((b) => b.id === bookmark.id)) {
            allBookmarks.push(bookmark);
          }
        }

        return allBookmarks;
      }

      // 5. 如果书签超过指定条数，随机选择指定条数
      if (bookmarks.length > limit) {
        return this.getRandomBookmarks(bookmarks, limit);
      }

      return bookmarks;
    } catch (error) {
      console.error("获取推荐书签失败:", error);
      throw error;
    }
  }

  /**
   * 搜索书签
   * 根据关键词在标题、网址和标签中搜索匹配的书签
   *
   * @param query 搜索关键词
   * @returns 返回匹配的书签数组，每个书签都经过格式化处理
   * @throws 当获取访问令牌失败或API请求失败时抛出错误
   */
  public async searchBookmarks(query: string): Promise<any[]> {
    if (!(await this.getAccessToken())) {
      throw new Error("获取访问令牌失败");
    }

    const conditions = [
      {
        field_name: "标题",
        operator: "contains",
        value: [query],
      },
      {
        field_name: "网址",
        operator: "contains",
        value: [query],
      },
      // 增加标签搜索条件
      {
        field_name: "标签公式",
        operator: "contains",
        value: [query],
      },
    ];

    const requestBody = {
      filter: {
        conjunction: "or",
        conditions: conditions,
      },
      page_size: 100,
    };

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.baseId}/tables/${this.config.tableId}/records/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("搜索书签API响应:", errorText);
      throw new Error(`搜索书签失败: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      console.error("搜索书签API错误:", data);
      throw new Error(data.msg || "搜索书签失败");
    }

    return data.data.items.map((item: any) => this.formatBookmark(item));
  }

  /**
   * 获取标签字段的所有选项
   * 从飞书多维表格中获取标签字段的所有可选值
   *
   * @returns 返回标签选项的字符串数组，如果获取失败则返回空数组
   * @throws 当API请求失败时抛出错误，但会被 catch 捕获并返回空数组
   */
  private async fetchTagsOptions(): Promise<string[]> {
    try {
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.baseId}/tables/${this.config.tableId}/fields`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`获取字段失败: ${response.status}`);
      }

      const data = await response.json();
      if (data.code !== 0) {
        throw new Error(data.msg || "获取字段失败");
      }

      // 查找标签字段
      const tagField = data.data.items.find(
        (field: any) => field.field_name === "标签"
      );
      if (!tagField || !tagField.property || !tagField.property.options) {
        return [];
      }

      // 返回标签选项
      return tagField.property.options.map((option: any) => option.name);
    } catch (error) {
      console.error("获取标签选项失败:", error);
      return [];
    }
  }

  /**
   * 随机选择标签
   * 从给定的标签数组中随机选择指定数量的标签
   *
   * @param tags 所有可选标签的数组
   * @param count 需要选择的标签数量
   * @returns 返回随机选择的标签数组，数量不超过指定的count或原数组长度
   */
  private getRandomTags(tags: string[], count: number): string[] {
    const shuffled = [...tags].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, tags.length));
  }

  /**
   * 根据标签获取书签
   * 从飞书多维表格中搜索包含指定标签的书签记录
   *
   * @param tags 要搜索的标签数组
   * @returns 返回包含指定标签的书签数组，每个书签都经过格式化处理
   * @throws 当API请求失败时抛出错误
   */
  private async fetchBookmarksByTags(tags: string[]): Promise<any[]> {
    const conditions = tags.map((tag) => ({
      field_name: "标签",
      operator: "contains",
      value: [tag], // 修改这里，直接使用字符串
    }));

    const requestBody = {
      filter: {
        conjunction: "or",
        conditions: conditions,
      },
      page_size: 100, // 飞书单次查询限制
    };

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.baseId}/tables/${this.config.tableId}/records/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("根据标签获取书签API响应:", errorText);
      throw new Error(`根据标签获取书签失败: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      console.error("根据标签获取书签API错误:", data);
      throw new Error(data.msg || "根据标签获取书签失败");
    }

    return data.data.items.map((item: any) => this.formatBookmark(item));
  }

  /**
   * 获取最新的书签
   * 从飞书多维表格中获取最新创建的书签记录
   *
   * @param limit 获取的书签数量限制，默认为12条
   * @returns 返回最新的书签数组，每个书签都经过格式化处理
   * @throws 当API请求失败时抛出错误
   */
  private async fetchLatestBookmarks(limit = 12): Promise<any[]> {
    // 使用与 records/search 相同的API格式
    const requestBody = {
      page_size: limit,
      sort: [
        {
          field_name: "创建时间",
          desc: true,
        },
      ],
    };

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.baseId}/tables/${this.config.tableId}/records/search?page_size=${limit}`,
      {
        method: "POST", // 改为POST请求
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody), // 使用请求体
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("获取最新书签API响应:", errorText);
      throw new Error(`获取最新书签失败: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      console.error("获取最新书签API错误:", data);
      throw new Error(data.msg || "获取最新书签失败");
    }

    return data.data.items.map((item: any) => this.formatBookmark(item));
  }

  /**
   * 随机选择书签
   * 从给定的书签数组中随机选择指定数量的书签
   *
   * @param bookmarks 所有书签的数组
   * @param count 需要选择的书签数量
   * @returns 返回随机选择的书签数组，数量不超过指定的count或原数组长度
   */
  private getRandomBookmarks(bookmarks: any[], count: number): any[] {
    const shuffled = [...bookmarks].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, bookmarks.length));
  }

  /**
   * 格式化书签数据
   * 将飞书多维表格返回的记录格式化为前端可用的书签对象
   *
   * @param item 飞书多维表格返回的记录项
   * @returns 格式化后的书签对象，包含id、title、url、description、tags和createdTime字段
   */
  private formatBookmark(item: any): any {
    // 处理标题字段 - 可能是数组或字符串
    let title = "无标题";
    if (item.fields.标题) {
      if (Array.isArray(item.fields.标题)) {
        // 如果是数组，提取文本内容
        title = item.fields.标题.map((t: any) => t.text || "").join("");
      } else if (typeof item.fields.标题 === "string") {
        // 如果是字符串，直接使用
        title = item.fields.标题;
      }
    }

    // 处理标签字段 - 可能是数组或字符串
    let tags: string[] = [];
    if (item.fields.标签) {
      if (Array.isArray(item.fields.标签)) {
        // 如果是数组，直接使用
        tags = item.fields.标签;
      } else if (typeof item.fields.标签 === "string") {
        // 如果是字符串，按逗号分割
        tags = item.fields.标签.split(",");
      }
    }

    // 处理网址字段
    let url = "";
    if (item.fields.网址) {
      if (item.fields.网址.link) {
        // 如果有link属性，使用link
        url = item.fields.网址.link;
      } else if (typeof item.fields.网址 === "string") {
        // 如果是字符串，直接使用
        url = item.fields.网址;
      }
    }

    // 处理简介字段 - 可能是数组或字符串或不存在
    let description = "";
    if (item.fields.简介) {
      if (Array.isArray(item.fields.简介)) {
        // 如果是数组，提取文本内容
        description = item.fields.简介.map((d: any) => d.text || "").join("");
      } else if (typeof item.fields.简介 === "string") {
        // 如果是字符串，直接使用
        description = item.fields.简介;
      }
    }

    return {
      id: item.record_id,
      title: title,
      url: url,
      description: description,
      tags: tags,
      createdTime: item.fields.创建时间 || new Date().toISOString(),
    };
  }
}
