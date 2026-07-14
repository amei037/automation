# DEDC Reddit Opportunity Radar

一个零成本的 Reddit 机会发现样机：读取带有指定 Gmail 标签的 F5Bot
提醒，按固定规则评分、去重并写入 Google Sheets。高优先级帖子会汇总发送
到指定邮箱。

## 能做什么

- 每 10 分钟处理一次 F5Bot Gmail 提醒。
- 提取 Reddit 帖子链接、标题、摘要、subreddit 和作者。
- 识别评级意图、品相问题和价值问题。
- 根据可编辑规则打分并划分高、中、低优先级。
- 对相同 Reddit 链接去重。
- 记录处理历史和每日指标。
- 对高优先级机会发送一封汇总邮件。

## 不会做什么

- 不调用 AI 或付费模型。
- 不访问 Reddit API，也不抓取 Reddit 页面。
- 不自动发帖、评论、投票或私信。
- 不生成专业评级或价格结论。

## 开始使用

按照 [中文安装说明](docs/SETUP_ZH.md) 将以下文件放入绑定 Google Sheet
的 Apps Script 项目：

- `apps-script/Core.gs`
- `apps-script/Code.gs`
- `apps-script/appsscript.json`

本地验证：

```bash
npm test
```

当前测试覆盖 URL 规范化、F5Bot 邮件解析、五个已配置关键词、评分边界、
去重、HTML 转义和 Google Sheets 公式注入防护。

## Reddit 知识回复 Agent

仓库内的 `.agents/agents/reddit-knowledge-reply-agent.md` 定义了一个与 Radar
分离的回复 Agent。它只处理人工选中的机会，自动读取完整 Reddit 帖子和
subreddit 规则，并生成一份等待人工审核的英文知识型回复草稿。

调用时提供 Radar 的单条机会：

```json
{
  "opportunity_id": "opp-123",
  "title": "Should I grade this card?",
  "excerpt": "I am unsure about the corners.",
  "subreddit": "PokemonTCG",
  "url": "https://www.reddit.com/r/PokemonTCG/comments/abc123/example/",
  "radar_intent": "grading",
  "radar_score": 80
}
```

Agent 必须返回 `reply-agent/output.schema.json` 定义的 JSON。帖子或规则读取不完整
时返回 `needs_context`；无关机会返回 `skip`。它不会提及品牌或产品，也没有
发布、私信、点赞或其他 Reddit 写入权限。

## 当前 F5Bot 配置

- `card value`
- `centering`
- `psa grade`
- `should i grade`
- `worth grading`

配置了 `no-comments`，因此首版只监控帖子，不监控评论。
