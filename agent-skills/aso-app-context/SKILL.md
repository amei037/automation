---
name: aso-app-context
description: 为 Apple App Store 和 Google Play 分析创建或更新经过验证、记录来源的 App 背景。适用于 ASO 项目开始时，或产品事实、市场、声明、竞品、变现、数据接入和上线状态缺失、冲突或过期时。
---

# ASO App 背景

建立可复用的事实来源，不得虚构缺失的产品信息。

## 工作流程

1. 查找已有的 `aso-app-context.md`。
2. 提问前先阅读用户提供的产品文档和商店元数据。
3. 按 [references/context-schema.md](references/context-schema.md) 填写背景。
4. 标记每项重要声明：
   - `verified`：有产品行为、负责人确认或权威记录支持。
   - `unverified`：可能成立，但尚无可靠依据。
   - `prohibited`：已知错误、容易误导、存在法律风险或超出产品能力。
5. 对可能变化的事实记录来源和 `as_of` 日期。
6. 只询问会阻碍下一步流程的字段。
7. 保存或返回 `aso-app-context.md`。

## 最低必需背景

以下信息明确前，不要开始关键词或商店文案推荐：

- App 名称，以及已经创建的稳定标识符。
- 平台：Apple、Google 或两者。
- 目标商店地区、国家和语言。
- 一句话产品功能。
- 主要用户和用户问题。
- 当前上线状态。
- 已支持功能与计划功能。
- 变现模式。
- 已知法律、品牌、IP 或宣传声明限制。

## 数据接入状态

记录以下来源是否可用：

- App Store Connect
- Google Play Console
- MobileAction 或其他市场数据
- 七麦或其他 CSV 导出
- 产品事件
- RevenueCat
- Apple Ads
- Google Ads

缺失也是有效状态。不得把“计划接入”写成“已经接入”。

## 输出

最后必须包含：

```text
背景状态：完整 / 可使用但存在缺口 / 无法继续
已验证优势：...
待验证声明：...
禁止使用声明：...
现有证据：...
下一流程缺少的输入：...
建议进入的 Skill：...
```

除非用户在同一任务中明确要求，否则不要直接提供 ASO 建议。
