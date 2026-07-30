# DEDC Card 产品背景

更新时间：2026-07-30

用途：DEDC 内部 ASO、商店素材、广告与增长分析

数据阶段：`M2` - 已有产品背景与竞品/市场材料，但没有稳定的第一方商店表现数据

## 1. 来源与证据等级

| ID | 来源 | 截止日期 | 用途 | 边界 |
|---|---|---:|---|---|
| S1 | 产品负责人在当前项目中的明确说明 | 2026-07-30 | 上线状态、市场、数据接入状态 | 可证明产品背景，不能证明市场效果 |
| S2 | `apps/mobile`、API、数据库和发布文档 | 2026-07-30 | 标识符、版本、实现能力、集成状态 | 实现存在不自动等于生产环境已验证 |
| S3 | `dedc规范文件(2).pdf`，内部 T1 品牌规范 | 2026-07-21 | Logo、标准色、字体和视觉规范 | 品牌事实的最高优先级来源 |
| S4 | `09-品牌全案策略方案-V2.md` | 2026-06-25 | 定位、用户假设、市场研究、创意方向 | 混合策略、推算和规划，不作为单独的功能证明 |
| S5 | 七麦、MobileAction、竞品 CSV 与排名趋势图 | 2026-07-27 至 2026-07-28 | 冷启动关键词和竞品研究 | 第三方观察，不代表 DEDC 自身表现 |
| S6 | DEDC ASO 研究与截图方案 | 2026-07-28 至 2026-07-29 | 当前候选关键词、截图与实验假设 | 候选方案不等于已发布商店元数据 |

来源冲突时使用 `S3 > S1 > 已验证生产证据 > S2 > S4/S6 > S5`。涉及线上可用性时，生产证据高于仓库实现。

## 2. 产品身份

| 字段 | 当前值 | 状态 | 来源 |
|---|---|---|---|
| 品牌 | DEDC，Logo 带 `SINCE 2013` | verified | S3 |
| 产品工作名称 | DEDC Card | verified | S1、S2、S6；当前线上标题仍需另行核对 |
| Apple 当前商店标题 | unknown | unverified | 尚未提供 App Store 链接或后台导出 |
| Apple ID | unknown | unverified | 尚未提供 |
| Bundle ID | `com.dedccard.app` | verified | S2；仓库实现证据 |
| Google Package Name | `com.dedccard.app` | verified | S2；仓库实现证据 |
| Google Play URL | `https://play.google.com/store/apps/details?id=com.dedccard.app` | verified | S2；配置证据，页面可见性需另行核对 |
| 平台 | iOS、Android | verified | S1、S2；生产可见性需商店核对 |
| 仓库版本 | `1.1.1` | verified | S2；不自动等于商店当前版本 |
| 当前阶段 | 已上线但尚未正式推广 | verified | S1；负责人确认 |
| 首要市场 | 美国 | verified | S1；负责人确认 |
| 目标语言 | 英语 | verified | S1；负责人确认 |

`verified` 只表示其指定来源能够支持该事实。发布到商店前仍需根据备注判断是否需要线上版本核对。

## 3. 一句话产品功能

DEDC Card 是面向卡牌收藏者的 AI 辅助送评前分析工具，通过卡牌图像提供预评分和品相维度参考，帮助用户在正式送评前理解卡牌状况。

产品结果属于 AI 辅助参考，不是 PSA、BGS、CGC 或其他评级机构的官方评级，也不保证最终评级结果或市场价值。

## 4. 当前可确认的产品能力

| 能力 | 状态 | 证据与边界 |
|---|---|---|
| 拍摄/上传卡牌图像进行分析 | verified | S2；仅证明实现，生产端到端状态仍需线上证据 |
| 输出总分或预评分结果 | verified | S2、S6；发布前核对线上版本 |
| 展示 `centering`、`corners`、`edges`、`surface` 四项维度 | verified | S2、S6；发布前核对线上版本 |
| 展示原图与分析标注图 | verified | S2、S6；发布前核对线上版本 |
| 浏览卡牌目录与搜索卡牌 | verified | S2；仅证明实现 |
| 保存卡牌/收藏管理 | verified | S2；仅证明实现，免费保存上限需后台确认 |
| 保存或分享评级报告 | verified | S2、S6；仅证明实现，图片化分享仍有规划内容 |
| 订阅与权益管理 | verified | RevenueCat SDK、月度/年度产品与 Pro entitlement 路径存在；价格、试用和生产 offering 需后台确认 |
| 市场价格数据 | unverified | eBay/市场数据适配存在；生产凭据、配额和线上返回尚无证据 |
| AI 提供方 | unverified | Ximilar 适配存在；生产请求和配额尚无证据 |

## 5. 尚未确认或不得自动采用的产品能力

- 支持的具体卡牌游戏、卡种、版本和地区范围。
- “支持 14 种 TCG”及具体清单。
- 是否支持体育卡，以及体育卡的完整能力范围。
- eBay 是否为线上实时价格、数据延迟和价格含义。
- 免费预评分次数、免费收藏数量和重置周期。
- 50 次/月与 100 次/月存在来源冲突，确认前不得选用任一数字。
- 月度/年度价格、免费试用、退款和各平台权益差异。
- AI 识别瑕疵后自动推荐 DEDC 耗材是否已在线上版本开放。
- 修复前后评分对比、一键生成分享卡及其他 PRD 功能是否已上线。
- Firebase Analytics/Crashlytics/Remote Config 等 Firebase 能力尚未接入。

## 6. 用户与问题

### 当前核心用户方向

认真对待卡牌品相与价值、正在考虑是否送评的 TCG 收藏者。

### 核心用户问题

- 不确定卡牌是否值得正式送评。
- 难以系统判断居中、边角、边缘和表面状况。
- 正式评级成本、等待时间和结果不确定性较高。

### 战略用户假设

以下画像来自品牌策略，只作为研究假设：

- Primary：硬核收藏者。
- Secondary：卡店经营者或高频卡牌处理者。
- Growth：刚开始了解卡牌价值和评级的新收藏者。

人口统计、收入、支出、市场规模和付费意愿均不得当作已验证用户数据。

## 7. 定位与语调

| 项目 | 内容 | 状态 |
|---|---|---|
| 品类方向 | 评级前准备 / pre-grading preparation | approved strategy |
| 功能定位 | AI 辅助预评分与品相分析 | supported by implementation |
| 品牌人格 | Sage 85% × Creator 15% | approved strategy |
| 内容人格 | The Lab | approved strategy，非产品功能 |
| 主张方向 | `Proof, Not Promises.` | approved strategy，发布前需与实际证据匹配 |
| 当前首图候选 | `Spot-On TCG Card Grading` | creative hypothesis，非效果结论 |
| 高风险定位语 | `The Pre-Grading Authority — AI-Powered. Lab-Verified.` | `Authority`/`Lab-Verified` 需声明审批与证据 |

## 8. 商业模式

- 模式：免费能力 + Pro 订阅方向。
- RevenueCat：负责人确认已接入，仓库存在 iOS/Android SDK、购买、恢复购买、月度/年度产品和权益判断路径。
- 不得仅凭接入 RevenueCat 推断真实收入、转化率、价格或活跃订阅数。
- 免费额度、价格、试用、产品 ID、offering 和平台权益必须以当前 RevenueCat 及商店后台为准。

## 9. 当前测量准备度

| 来源 | 状态 | 可用范围 | 限制 |
|---|---|---|---|
| App Store Connect | unavailable | 未来可接入 | 当前没有稳定表现数据 |
| Google Play Console | unavailable | 未来可接入 | 当前没有稳定表现数据 |
| RevenueCat | unavailable | 订阅、权益、收入 | 已确认接入，但本任务未提供可分析的生产数据 |
| Firebase | planned | 未来产品事件、留存等 | 当前未接入 |
| 七麦 | available-as-export | 竞品关键词、覆盖、排名趋势 | 第三方数据；需保留市场、平台和导出日期 |
| MobileAction | available-as-export | 竞品和关键词研究 | 第三方数据；需保留字段定义和导出日期 |
| Apple Ads | unavailable | 未来投放 | 当前无广告数据 |
| Google Ads | unavailable | 未来投放 | 当前无广告数据 |

RevenueCat 不能替代商店曝光、安装来源、产品行为、留存或广告归因数据。

## 10. 当前市场材料

已知材料包括：

- `Card Grader Pro_关键词覆盖数据_20260727.csv`
- `Card Centering Calculator_关键词覆盖数据_20260728.csv`
- `Collectr - TCG Collector App_关键词覆盖数据_20260728.csv`
- `HoloDex _ASM关键词_2026-07-27.csv`
- `HoloDex - TCG Scan & Collect_关键词覆盖数据_20260727.csv`
- `Card Grader Pro近一年排名趋势.png`
- `HoloDex 近一年排名趋势.png`

这些 App 是当前研究样本，不自动等于全部直接竞品。

## 11. 当前目标

1. 冷启动阶段：以证据支持美国英语市场的关键词、商店元数据和截图假设。
2. 上线后：积累 App Store Connect、Google Play Console、产品事件和 RevenueCat 数据。
3. 数据成熟后：将商店表现、市场数据和付费数据结合，用于 Apple Ads 与 Google Ads 决策。

## 12. 当前缺口

- Apple App Store 链接、Apple ID 和当前线上完整元数据。
- Google Play 当前线上完整元数据与可见状态核验。
- 支持卡牌范围与扫描限制。
- 当前免费额度、订阅价格、试用与权益。
- Ximilar、eBay 和报告分享的生产行为证据。
- 品牌/法务批准的 PSA、BGS、CGC 使用方式与免责声明。
- 第一方曝光、访问、安装、转化、留存和收入基线。
