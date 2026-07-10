# DEDC Reddit Opportunity Radar 安装说明

这份说明从空白 Google Sheet 开始，不需要购买 Google Workspace、n8n、
Reddit API 或 AI 模型。

## 一、准备

你需要：

- 一个可以正常收取 F5Bot 提醒的 Gmail 账号。
- 一个 Google Sheet。
- 已启用关键词的 F5Bot 免费账号。

建议使用专门用于该项目的 Google 账号。不要把最终表格设置成“知道链接的
任何人都能访问”。

## 二、创建 Google Sheet

1. 打开 <https://sheets.google.com/>。
2. 创建空白表格，名称可以设为 `DEDC Reddit Radar`。
3. 点击菜单“扩展程序” -> “Apps Script”。

脚本必须绑定到这个 Sheet。不要在 `script.google.com` 单独创建无绑定项目，
否则 `SpreadsheetApp.getActiveSpreadsheet()` 找不到目标表格。

## 三、添加 Apps Script 文件

### 1. Code.gs

Apps Script 默认存在一个 `Code.gs`。删除其中原有内容，粘贴仓库
`apps-script/Code.gs` 的完整内容。

### 2. Core.gs

点击左侧“文件”旁的加号，选择“脚本”，名称输入 `Core`。将仓库
`apps-script/Core.gs` 的完整内容粘贴进去。

### 3. appsscript.json

1. 点击左侧“项目设置”。
2. 启用“在编辑器中显示 appsscript.json 清单文件”。
3. 返回编辑器，打开 `appsscript.json`。
4. 用仓库 `apps-script/appsscript.json` 的内容完整替换。
5. 点击保存。

## 四、首次初始化

1. 在 Apps Script 顶部函数下拉框选择 `setupRadar`。
2. 点击“运行”。
3. Google 要求授权时，选择接收 F5Bot 邮件的账号。
4. 仔细检查权限后允许脚本访问 Gmail、Sheets、发送邮件和管理本项目触发器。

`setupRadar` 会创建五张工作表：

- `Opportunities`：等待人工处理的帖子。
- `Keywords`：评分规则，可以直接修改。
- `Processed`：去重和错误审计记录。
- `Metrics`：每日指标。
- `Settings`：标签、批量上限、阈值和通知邮箱。

该函数可以重复运行，不会清空已有数据。如果表头被手动修改，它会停止并
提示错误，避免把数据写进错误列。

## 五、检查 Settings

打开 `Settings` 工作表：

| 设置 | 默认值 | 说明 |
|---|---:|---|
| `notification_email` | 当前 Google 账号 | 高分机会汇总收件人；留空则不发邮件 |
| `source_label` | `reddit-radar` | 需要处理的 Gmail 标签 |
| `processed_label` | `reddit-radar-processed` | 已成功处理的邮件标签 |
| `error_label` | `reddit-radar-error` | 无法解析的邮件标签 |
| `lookback_days` | `7` | 只读取最近多少天 |
| `batch_size` | `50` | 每次最多处理多少封；代码上限也是 50 |
| `medium_threshold` | `50` | 中优先级起始分 |
| `high_threshold` | `70` | 高优先级及邮件提醒起始分 |

如果 `notification_email` 是空白，请手动填写接收提醒的邮箱。

## 六、创建 Gmail 标签和过滤器

最稳妥的方式是收到第一封 F5Bot 提醒后创建过滤器：

1. 在 Gmail 打开一封 F5Bot 提醒。
2. 点击邮件右上角“更多”。
3. 选择“过滤此类邮件”或“过滤类似邮件”。
4. 保留 F5Bot 发件人条件，点击“创建过滤器”。
5. 勾选“应用标签”，新建标签 `reddit-radar`。
6. 如已有 F5Bot 邮件，可勾选“同时应用于匹配的会话”。
7. 不要勾选“标记为已读”。

脚本第一次运行 `processF5BotAlerts` 时会自动创建
`reddit-radar-processed` 和 `reddit-radar-error`。

当前 F5Bot 使用 `no-comments`，因此提醒只来自 Reddit 帖子。这个设置适合
首版验证，先降低评论噪声。

## 七、先运行演示数据

1. 回到 Apps Script。
2. 选择 `runDemo`。
3. 点击“运行”。
4. 回到 Google Sheet。

预期结果：

- `Opportunities` 出现评级和价值询问示例。
- 噪声示例不会进入机会表。
- `Processed` 出现创建或忽略记录。
- `Metrics` 出现当天汇总。
- 再运行一次 `runDemo` 不会产生重复机会。

## 八、运行一次真实邮件测试

确认 Gmail 中至少有一封满足以下条件的邮件：

- 带有 `reddit-radar` 标签。
- 处于未读状态。
- 正文含可访问的 `reddit.com` 或 `redd.it` 链接。

然后：

1. 在 Apps Script 选择 `processF5BotAlerts`。
2. 点击“运行”。
3. 返回 Sheet 检查 `Opportunities` 和 `Processed`。
4. 检查 Gmail：成功处理的邮件应标记已读并带有
   `reddit-radar-processed`。

如果正文没有 Reddit 链接，邮件会保留未读并带有
`reddit-radar-error`，原因记录在 `Processed.error_message`。

## 九、开启每 10 分钟自动运行

真实邮件测试成功后：

1. 在 Apps Script 选择 `installTenMinuteTrigger`。
2. 点击“运行”。
3. 在左侧打开“触发器”，确认只有一个 `processF5BotAlerts` 定时触发器。

重复运行 `installTenMinuteTrigger` 会先删除旧的同名触发器，再创建一个新
触发器，不会叠加多个任务。

需要暂停时运行 `removeRadarTriggers`。

## 十、调整规则

`Keywords` 工作表每行是一条规则：

- `enabled`：复选框，取消后立即停用。
- `category`：`grading`、`condition`、`value` 或 `other`。
- `pattern`：关键词或正则表达式。
- `match_type`：`contains`、`phrase`、`regex` 或 `subreddit`。
- `score_delta`：匹配后的加分或减分。

前三天先不要频繁调整。每天人工复核高、中、低分结果，再根据误报记录修改
规则。不要只保留高分记录，低分样本是判断规则是否漏报的依据。

## 十一、给老板展示什么

连续运行三天后，从 `Metrics` 和 `Opportunities` 提取：

- 每天自动扫描的提醒数量。
- 去重后的真实机会数量。
- 高优先级数量。
- 已回复数量。
- 从发现到人工复核的平均分钟数。
- 5 条最有代表性的真实帖子。

目标不是证明规则系统能替代人工，而是证明自动收集和排序值得投入更好的
监听或 AI 工具。

## 十二、常见问题

### 没有任何数据

- 检查 Gmail 邮件是否带 `reddit-radar` 标签并保持未读。
- 检查 F5Bot 最近是否真的有命中。
- 手动运行 `processF5BotAlerts`，然后打开 Apps Script 左侧“执行记录”。

### 邮件进入 error 标签

打开 `Processed` 查看 `error_message`。当前解析器要求正文或主题中出现
`reddit.com` 或 `redd.it` 链接。

### 没有收到高分汇总邮件

- 检查 `Settings.notification_email` 是否填写。
- 检查新机会是否真的达到 `high_threshold`。
- Apps Script 只在当次运行产生新高分机会时发送汇总。

### 修改设置后报错

- `medium_threshold` 必须小于 `high_threshold`。
- `high_threshold` 不能超过 100。
- Gmail 三个标签名称不能为空。
- 数字配置必须为正数。

### 查看自动任务是否正常

Apps Script 左侧“执行记录”会显示每次运行的时间、状态和错误。触发器失败时，
Google 也会向脚本所有者发送失败通知。

## 隐私和安全边界

- 脚本只搜索带 `source_label` 的未读邮件。
- Reddit 标题和摘要写入 Sheet 前会防止被解释为公式。
- 邮件 HTML 会转义帖子标题等外部文本。
- 不保存 Reddit 密码、Token 或 Cookie。
- 不自动执行任何 Reddit 互动。
- Sheet 必须保持为受限访问。

