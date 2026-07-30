---
name: dedc-product-context
description: 为 DEDC Card 的 ASO、Apple App Store、Google Play、广告、商店素材、品牌文案、竞品和增长分析提供经过清洗的产品事实、品牌规范、证据状态与声明边界。用户提到 DEDC、DEDC Card、DEDC App、评级前准备、品牌色、Logo、商店文案或 DEDC 营销材料时使用，并在其他 ASO Skill 之前建立产品上下文。
---

# DEDC 产品背景

把本 Skill 作为 DEDC 营销任务的事实入口。不得把品牌战略、规划功能或市场推算自动升级为当前产品事实。

## 必读顺序

1. 阅读 [references/product-context.md](references/product-context.md)，确认产品、市场、数据阶段和证据边界。
2. 涉及文案、商店素材、Logo、色彩或视觉时，阅读 [references/brand-guidelines.md](references/brand-guidelines.md)。
3. 涉及功能承诺、准确率、免费额度、评级机构、价格、领先性或效果时，阅读 [references/claims-register.md](references/claims-register.md)。

## 使用规则

- 优先采用有来源和截止日期的事实。
- 将仓库实现证据与生产环境证据分开；代码存在不等于线上可用。
- 将负责人确认视为产品背景证据，不视为市场效果证明。
- 将品牌策略方案视为定位与创意方向，不视为功能上线证明。
- 对相互冲突的数字同时保留并标记冲突，不自行选择。
- 用户提供更新材料时，只更新对应事实及其来源，不重写原始品牌文件。
- 没有第一方表现数据时，将建议标记为冷启动假设。

## 输出边界

在给出 DEDC 建议时，至少明确：

```text
产品事实依据：
数据阶段：
可使用声明：
待验证声明：
禁止使用声明：
建议中的假设：
```

如果当前请求只要求建立背景，不要提前生成关键词、商店文案或广告方案。
