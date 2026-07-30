# DEDC 声明台账

更新时间：2026-07-30

## 状态定义

- `verified`：在记录范围内有负责人、产品实现或权威规范支持。
- `unverified`：可能成立，但缺少线上、第三方、法务或后台证据。
- `prohibited`：默认禁止，除非法务与证据负责人明确改变状态。

实现证据只能证明“代码中存在该能力”，不能单独证明生产环境可用、效果或准确率。

## 1. 可在限定范围内使用

| 声明 | 状态 | 允许范围 | 依据/限制 |
|---|---|---|---|
| DEDC 提供 AI 辅助的卡牌送评前分析 | verified | 产品介绍、ASO 研究 | 必须避免描述为官方评级 |
| 分析包含 centering、corners、edges、surface | verified | 与真实 UI 同时展示 | 仓库实现证据；线上版本发布前再次核对 |
| 结果用于正式送评前参考 | verified | 产品定位、免责声明 | 不保证最终分数 |
| App 面向 iOS 与 Android | verified | 内部分析；发布文案需商店可见性确认 | Bundle/package 均为 `com.dedccard.app` |
| RevenueCat 已接入 | verified | 内部技术/数据说明 | 负责人及仓库实现证据；不代表已有收入或生产 offering 已验证 |
| `Spot-On TCG Card Grading` | verified | 截图 A/B 候选 | 已批准为创意假设，不得延伸为准确率保证 |
| `Proof, Not Promises.` | verified | 品牌方向 | 已批准为品牌方向；每个 Proof 必须能链接到真实证据 |

## 2. 待验证

| 声明 | 状态 | 缺少的证据 |
|---|---|---|
| 支持 14 种 TCG | unverified | 当前线上支持清单及实测 |
| 覆盖 500 万+运动卡 | unverified | 提供方范围、DEDC 实际启用范围及授权 |
| eBay 实时比价 | unverified | 生产调用、数据延迟、市场/成色口径 |
| 每月免费 50 次预评分 | unverified | 与 100 次/月来源冲突；需 RevenueCat/后端/商店当前配置 |
| 每月免费 100 次预评分 | unverified | 与 50 次/月来源冲突；需 RevenueCat/后端/商店当前配置 |
| 免费收藏管理无限或具体上限 | unverified | 当前 plan limits |
| 40 组盲测已证明稳定性或准确率 | unverified | 测试设计、原始样本、结果与复核 |
| 与 PSA 的误差通常为 0.5-1 分 | unverified | 可复现独立研究 |
| AI 能可靠识别所有瑕疵 | unverified | 能力边界与错误率 |
| 使用 DEDC 耗材可以提升预评分或官方评级 | unverified | 高风险；需受控测试、因果证据、法务审核 |
| `Lab-Verified` | unverified | 高风险；需实验室主体、方法、报告、适用范围 |
| `Grader-Safe`、`UV-Invisible`、`Acid-Free`、`Non-Abrasive` | unverified-for-app-marketing | 对应产品检测报告、范围和法务批准 |
| ACMI AP Seal 已获得 | unverified | 当前证书；品牌策略显示仍在推进 |
| App 是完全免费或最慷慨的免费方案 | unverified | 当前计划、竞品同步证据 |
| 订阅价格、试用期与权益 | unverified | 当前 Apple/Google/RevenueCat 后台 |
| 当前 Apple/Google 商店标题和描述 | unverified | 线上页面或后台导出 |

## 3. 默认禁止

| 声明 | 状态 | 安全替代表述 |
|---|---|---|
| `Most Accurate`、`Best`、`#1`、`Fastest` | prohibited | 描述真实分析维度与流程 |
| “保证获得 PSA 9/10”或保证提升官方分数 | prohibited | “提供送评前的 AI 辅助参考” |
| “PSA Approved”“PSA Official Partner”或暗示官方认可 | prohibited | 仅在必要的比较/教育语境提及评级机构，并使用批准免责声明 |
| 将 AI 预评分称为 PSA/BGS/CGC 官方评分 | prohibited | “AI pre-grade”或“AI-assisted estimate” |
| 保证卡牌价值、收益、投资回报或转售价 | prohibited | 展示数据来源和估算时间，并声明非投资建议 |
| 把规划功能描述为当前已上线 | prohibited | 明确写“planned”或不提及 |
| 把仓库代码、测试或第三方供应商能力描述为线上生产成功 | prohibited | 明确写“implemented”或“production verification pending” |
| 未经授权使用评级机构、卡牌发行商或角色 Logo/形象 | prohibited | 使用自有 Logo、真实获授权素材或中性卡牌示意 |
| “全球首个”“唯一覆盖 AI+耗材”“品类定义者”作为客观事实 | prohibited | 作为内部战略方向，不作为无证据的公开事实 |

## 4. 强制免责声明方向

涉及评分或价值时，至少表达：

```text
AI-assisted pre-grade for informational purposes only.
Not an official grade and not affiliated with PSA, BGS, CGC, or card publishers.
Final grades and market values may vary.
```

最终措辞必须经过品牌/法务批准；本台账不是法律意见。
