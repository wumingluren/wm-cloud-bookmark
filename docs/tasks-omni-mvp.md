# 无名云书签 Omni 一期开发任务清单

## 1. 目标

本清单用于支撑 MVP 版本交付，目标是在当前扩展内落地一个可用的 Omni 命令面板。

## 2. 交付范围

- 全局命令面板 UI
- 查询解析
- Provider 聚合搜索
- 飞书云书签、本地书签、标签页、历史、动作命令接入
- 基础设置页
- 快捷键与消息通道

## 3. 任务拆解

### Epic A：命令面板基础框架

- A1. 新增 `omni` 目录结构与基础类型定义
- A2. 定义统一结果模型和动作模型
- A3. 定义 Provider 接口
- A4. 定义查询解析器和命令模式枚举
- A5. 定义面板状态管理 composable

验收标准：

- 具备清晰的目录边界
- UI 层不直接依赖具体数据源实现
- Provider 可独立单测

### Epic B：全局唤起与浮层容器

- B1. 在 manifest 中增加命令面板所需配置
- B2. 配置快捷键触发入口
- B3. 在 background 中新增 Omni 打开消息
- B4. 在 content script 中接收打开/关闭消息
- B5. 在现有 overlay 容器中挂载 Omni 面板组件
- B6. 实现面板遮罩层、容器、输入框、结果区基本骨架

验收标准：

- 任意页面可打开面板
- `Esc` 可关闭
- 打开后自动聚焦输入框

### Epic C：查询解析与搜索编排

- C1. 实现命令前缀解析器
- C2. 支持 `/tabs` `/bookmarks` `/feishu` `/history` `/actions`
- C3. 支持中文别名
- C4. 实现空查询策略
- C5. 实现聚合搜索 orchestrator
- C6. 实现 Provider 并发查询与失败隔离
- C7. 实现统一排序函数

验收标准：

- 输入不同命令前缀时只调用对应 Provider
- 聚合模式下结果可正常混排或分组
- 某个 Provider 报错不影响其他结果显示

### Epic D：Provider 接入

#### D1. FeishuBookmarkProvider

- 复用现有飞书搜索服务
- 增加结果归一化逻辑
- 增加错误和空态转换
- 增加 debounce 与请求取消

#### D2. BrowserBookmarkProvider

- 接入浏览器 bookmarks API
- 支持按标题和 URL 搜索
- 结果结构归一化

#### D3. TabProvider

- 接入 tabs API
- 搜索标题、URL、域名
- 归一化结果结构

#### D4. HistoryProvider

- 在 manifest 中增加 `history` 权限
- 接入 history API
- 搜索标题和 URL

#### D5. ActionProvider

- 注册首批动作命令
- 定义动作元数据、匹配关键词、执行器

验收标准：

- 五个 Provider 都能返回统一结构
- 本地 Provider 可在无飞书配置下单独工作

### Epic E：动作执行层

- E1. 实现统一动作执行器
- E2. 实现“打开链接”
- E3. 实现“切换标签页”
- E4. 实现“关闭标签页”
- E5. 实现“固定/取消固定标签页”
- E6. 实现“静音/取消静音标签页”
- E7. 实现“打开选项页”
- E8. 实现“打开侧边栏”
- E9. 实现“收藏当前页到飞书”
- E10. 实现“收藏当前页到浏览器书签”
- E11. 实现“默认搜索引擎搜索”

验收标准：

- 结果项选择后能执行对应动作
- 危险动作具备确认能力或保护逻辑

### Epic F：面板 UI 与交互

- F1. 输入框组件
- F2. 分组列表组件
- F3. 结果项组件
- F4. 来源标记与图标组件
- F5. 加载态与空态组件
- F6. 错误提示组件
- F7. 键盘导航逻辑
- F8. 命中高亮逻辑
- F9. 次级动作入口预留

验收标准：

- 可以仅用键盘完成一次完整搜索与执行
- 结果来源可读性清晰
- UI 在常见桌面分辨率下展示正常

### Epic G：最近使用与偏好设置

- G1. 定义最近使用存储结构
- G2. 记录最近执行结果
- G3. 记录最近搜索词
- G4. 实现空查询最近使用展示
- G5. 在设置页增加 Omni 配置块
- G6. 增加各 Provider 开关
- G7. 增加每组结果数量上限设置
- G8. 增加“是否允许危险操作”设置

验收标准：

- 关闭某个 Provider 后，该来源不再参与搜索
- 空查询可以看到最近使用

### Epic H：测试与验收

- H1. 查询解析器单元测试
- H2. 排序函数单元测试
- H3. Provider 归一化单元测试
- H4. 动作执行层单元测试
- H5. 面板键盘交互组件测试
- H6. E2E 验证：打开面板、搜索、执行、关闭
- H7. E2E 验证：无飞书配置降级
- H8. E2E 验证：历史权限相关行为

验收标准：

- 核心解析与编排逻辑具备自动化测试覆盖
- 至少覆盖一条完整用户链路

## 4. 推荐实现顺序

1. 搭基础类型、Parser、Orchestrator
2. 打通全局唤起与浮层
3. 接 TabProvider 和 ActionProvider
4. 接 BrowserBookmarkProvider 和 HistoryProvider
5. 接 FeishuBookmarkProvider
6. 完善 UI 与排序
7. 增加最近使用和设置项
8. 补测试

## 5. 里程碑建议

### Milestone 1：骨架可运行

- 可打开面板
- 可输入
- 可展示假数据结果
- 可键盘导航

### Milestone 2：本地对象可用

- Tabs
- Bookmarks
- History
- Actions

### Milestone 3：飞书接入完成

- 飞书云书签可搜索
- 错误和降级可用

### Milestone 4：可发布 MVP

- 设置页打通
- 最近使用打通
- 测试补齐

## 6. 代码落点建议

- `src/omni/types.ts`
- `src/omni/parser/parseQuery.ts`
- `src/omni/providers/*.ts`
- `src/omni/actions/*.ts`
- `src/omni/composables/useOmni.ts`
- `src/omni/components/*.vue`
- `src/background/main.ts`
- `src/contentScripts/views/App.vue`
- `src/manifest.ts`
- `src/options/Options.vue`

## 7. 已知依赖

- `browser.tabs`
- `browser.bookmarks`
- `browser.history`
- `browser.search`
- `browser.runtime`
- 现有 `FeishuService`
- 现有 `webext-bridge`

## 8. 风险排查清单

- 快捷键是否与浏览器或页面默认快捷键冲突
- 历史 API 在不同浏览器实现是否一致
- 面板输入法与键盘快捷键是否冲突
- Shadow DOM 下样式与焦点环是否正常
- 飞书搜索慢时是否影响本地结果渲染

## 9. 建议的 MVP 完成定义

满足以下条件即可认为一期开发完成：

- 全局快捷键可打开面板
- 支持 5 类 Provider 搜索
- 支持基础动作执行
- 支持前缀模式
- 支持键盘操作
- 支持设置开关
- 支持最近使用
- 具备基础自动化测试
