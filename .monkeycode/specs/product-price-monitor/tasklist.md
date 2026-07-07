# 需求实施计划

- [ ] 1. 初始化项目结构与依赖
  - 创建 workspace 根 `package.json`，配置 `client/` 和 `server/` 两个 workspace
  - 初始化 `server/` TypeScript 项目：Express + knex + better-sqlite3 + playwright + node-cron + exceljs + csv-stringify + jsonwebtoken + bcryptjs
  - 初始化 `client/` Vite + React + TypeScript 项目：antd + react-router-dom + axios
  - 创建 `start.sh` 启动脚本，配置 vite proxy 转发 `/api` 到后端 (需求7)

- [ ] 2. 实现数据库连接与迁移
  - [ ] 2.1 创建 `server/src/db/connection.ts`，配置 knex + better-sqlite3 连接
  - [ ] 2.2 编写 initial migration：创建 users、platforms、keywords、keyword_platforms、products、scrape_logs 六张表 (设计文档数据模型)
  - [ ] 2.3 编写 seed：插入京东/拼多多/抖音/天猫四个平台的初始数据和搜索 URL 模板 (需求2-1)

- [ ] 3. 实现用户认证模块
  - [ ] 3.1 实现 `POST /api/auth/register`：用户名+密码注册，bcrypt 哈希存储 (需求1-1)
  - [ ] 3.2 实现 `POST /api/auth/login`：验证凭据，返回 JWT 令牌 (需求1-2)
  - [ ] 3.3 实现 `GET /api/auth/me`：返回当前登录用户信息
  - [ ] 3.4 实现 JWT 认证中间件 `server/src/middleware/auth.ts`，拦截未认证请求返回 401 (需求1-3, 1-4)

- [ ] 4. 实现平台管理与解析器框架
  - [ ] 4.1 实现 `GET /api/platforms` 和 `PUT /api/platforms/:id` (需求2-2)
  - [ ] 4.2 定义 `PlatformParser` 接口和 `ParsedProduct` 类型 (需求2-3)
  - [ ] 4.3 实现 parser 注册表 `server/src/scraper/parsers/index.ts`，根据平台 code 分发解析器
  - [ ] 4.4 实现京东解析器 `parsers/jd.ts`：从 JD 搜索结果 HTML 提取商品列表 (需求2-4)
  - [ ] 4.5 实现拼多多解析器 `parsers/pdd.ts`：从 PDD 移动端搜索结果 HTML 提取商品列表 (需求2-4)
  - [ ] 4.6 实现抖音解析器 `parsers/douyin.ts`：从抖音商城搜索结果 HTML 提取商品列表 (需求2-4)
  - [ ] 4.7 实现天猫解析器 `parsers/tmall.ts`：从天猫搜索结果 HTML 提取商品列表 (需求2-4)

- [ ] 5. 实现关键字 CRUD
  - [ ] 5.1 实现 `GET /api/keywords`：按当前用户筛选关键字列表 (需求3-4, 需求1-3)
  - [ ] 5.2 实现 `POST /api/keywords`：创建关键字，含限价验证>0、关联平台 (需求3-1, 3-2)
  - [ ] 5.3 实现 `PUT /api/keywords/:id`：更新关键字文本、限价、平台、采集间隔 (需求3-3)
  - [ ] 5.4 实现 `DELETE /api/keywords/:id`：级联删除关联的产品和日志 (需求3-3)

- [ ] 6. 检查点 - 确保后端基础 API 可运行
  - 启动 server 验证认证和关键字 CRUD 接口正常工作

- [ ] 7. 实现采集引擎
  - [ ] 7.1 实现 `server/src/scraper/engine.ts`：封装 Playwright 浏览器启动、页面导航、搜索结果 HTML 获取 (需求4-1)
  - [ ] 7.2 实现店铺去重逻辑：按 `keyword_id + platform_id + shop_name` 归一化后保留最低价，UPSERT 写入 (需求5-3, 设计文档店铺去重策略)
  - [ ] 7.3 实现 `POST /api/keywords/:id/scrape`：手动触发单次采集，调用 engine + parser + 去重 + 写入 (需求4-6)
  - [ ] 7.4 实现采集错误处理：平台失败不中断其他平台，记录错误日志并标记 below_limit (需求4-5, 需求4-4)

- [ ] 8. 实现商品查询与筛选服务
  - [ ] 8.1 实现 `GET /api/products`：分页返回低于限价的商品列表，支持按 platform_id、keyword_id、价格区间筛选，按价格排序 (需求5-1, 5-2, 5-4, 5-5)
  - [ ] 8.2 实现 `GET /api/products/stats`：返回各平台低价商品数量统计 (需求7-2)

- [ ] 9. 实现数据导出服务
  - [ ] 9.1 实现 `GET /api/export/excel`：使用 exceljs 生成 .xlsx，按平台分 sheet，包含所有导出字段 (需求6-1, 6-3, 6-4)
  - [ ] 9.2 实现 `GET /api/export/csv`：使用 csv-stringify 生成 .csv，按逗号分隔 (需求6-2, 6-3)
  - [ ] 9.3 导出接口支持按 keyword_id、platform_id 筛选，支持选中行 ID 列表导出 (需求6-5)

- [ ] 10. 实现定时任务调度
  - [ ] 10.1 实现 `server/src/scraper/scheduler.ts`：启动时加载所有启用关键字，为每个创建 cron 任务 (需求4-2)
  - [ ] 10.2 关键字更新时动态重建对应 cron 任务，关键字删除时停止任务 (需求4-3)
  - [ ] 10.3 实现 `GET /api/tasks`：返回采集日志列表，含状态、耗时、商品数量 (需求2-5)

- [ ] 11. 检查点 - 确保后端全部 API 与采集引擎可运行
  - 启动 server，手动触发一次采集验证端到端流程：搜索 → 解析 → 去重 → 入库 → 查询 → 导出

- [ ] 12. 实现前端基础框架
  - [ ] 12.1 配置 Vite + React + TypeScript + Ant Design，安装 react-router-dom、axios
  - [ ] 12.2 实现 `AppLayout.tsx`：侧边栏导航（概览、关键字、商品监控、采集任务）+ 顶栏用户信息 + 注销 (需求7-1)
  - [ ] 12.3 实现 `AuthGuard.tsx` 路由守卫：检查 token，未登录跳转 `/login` (需求1-4)
  - [ ] 12.4 实现 `AuthContext.tsx`：管理登录状态、token 存储、axios 拦截器附加 Authorization 头 (需求1-5)
  - [ ] 12.5 实现 `services/api.ts`：axios 实例封装，baseURL 为 `/api`，处理 401 自动跳转登录

- [ ] 13. 实现登录注册页面
  - [ ] 13.1 实现 `LoginPage.tsx`：用户名密码表单，调用 `/api/auth/login`，成功后跳转首页 (需求1-2)
  - [ ] 13.2 实现 `RegisterPage.tsx`：注册表单，调用 `/api/auth/register`，成功后跳转登录页 (需求1-1)

- [ ] 14. 实现关键字管理页面
  - [ ] 14.1 实现 `KeywordListPage.tsx`：表格展示关键字列表（文本、限价、平台标签、采集间隔、启用状态），支持编辑/删除/手动采集操作 (需求3-4)
  - [ ] 14.2 实现 `KeywordFormPage.tsx`：新建/编辑表单，含关键字文本、限价输入、平台多选、采集间隔选择 (需求3-1, 3-2, 4-2)

- [ ] 15. 实现商品监控页面
  - [ ] 15.1 实现 `ProductListPage.tsx`：表格展示低于限价商品（店铺、产品、价格、限价、链接、时间），平台标签颜色区分，支持筛选和排序 (需求5-2, 5-4, 5-5, 7-3)
  - [ ] 15.2 实现分页组件，默认 20 条/页 (需求7-4)
  - [ ] 15.3 实现导出按钮：调用 `/api/export/excel` 和 `/api/export/csv` 下载文件 (需求6-1, 6-2)
  - [ ] 15.4 实现行选择 + 批量导出功能 (需求6-5)

- [ ] 16. 实现概览仪表盘与采集任务页面
  - [ ] 16.1 实现 `DashboardPage.tsx`：展示各平台低价商品统计卡片、最近采集状态 (需求7-2)
  - [ ] 16.2 实现 `TaskListPage.tsx`：采集日志列表，展示每次采集的平台、状态、耗时、商品数量 (需求7-5)

- [ ] 17. 最终检查点 - 确保前后端完整联通
  - 启动完整应用，验证：注册 → 登录 → 创建关键字 → 手动采集 → 查看低价商品 → 筛选排序 → 导出 Excel/CSV → 定时任务运行
