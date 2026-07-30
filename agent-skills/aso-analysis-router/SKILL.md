---
name: aso-analysis-router
description: 将 Apple App Store 和 Google Play 的 ASO 请求路由到必要且完整的证据驱动流程。适用于涉及产品定位、竞品材料、关键词导出、元数据、截图、商店实验、上线准备或 ASO 表现诊断的宽泛、模糊或多步骤请求。
---

# ASO 分析路由

判断数据条件并选择完成任务所需的专业 Skill 组合。不要在本 Skill 内执行专业分析。

## 开始

1. 阅读请求，盘点用户提供的文件、链接、截图和明确事实。
2. 判断数据阶段：
   - `M0 — 无已验证背景`：缺少产品事实或目标市场。
   - `M1 — 仅有产品背景`：产品事实存在，但没有市场或表现证据。
   - `M2 — 有市场证据`：存在竞品或市场证据，但没有第一方表现数据。
   - `M3 — 有第一方证据`：存在带日期的商店、实验、产品、收入或广告数据。
3. 从 [references/workflow-map.md](references/workflow-map.md) 选择必要且完整的流程。
4. 说明选用了哪些 Skill 以及原因。
5. 按依赖顺序执行。复杂任务分阶段完成上一步后，再进入下一阶段。

## 强制路由规则

- 产品背景缺失或过期时，使用 `aso-app-context`。
- 任何未经检查的 CSV、工作簿、图表、截图或第三方导出，必须先使用 `aso-evidence-audit`。
- 关键词发现、竞品关键词交集或关键词优先级，使用 `aso-keyword-strategy`。
- 只有在关键词策略或明确定位已经存在时，才使用 `aso-listing-optimization` 编写 Apple 或 Google 商店文案。
- 截图、图标、价值主张或商店 A/B 测试计划，使用 `aso-experiment-planner`。
- 没有实际提供第一方数据时，不进入表现诊断或广告优化流程。
- 不要为了减少 Skill 数量而省略必要步骤，也不要调用与当前任务无关的 Skill。

## 组合流程

默认使用：

- 冷启动商店研究：`aso-app-context` → `aso-evidence-audit` → `aso-keyword-strategy`
- 研究后的元数据方案：`aso-keyword-strategy` → `aso-listing-optimization`
- 从竞品材料到测试计划：`aso-evidence-audit` → `aso-keyword-strategy` → `aso-experiment-planner`
- 已有商店页面但无表现数据：`aso-evidence-audit` → 对应专业 Skill；所有建议标记为上线前或冷启动假设
- 已有第一方数据：先审核证据，再只处理已诊断的问题表面

## 路由输出

使用以下格式：

```text
数据阶段：M0 / M1 / M2 / M3
执行流程：skill-1 → skill-2
选择原因：一句话说明
缺少材料：仅列出会阻碍当前流程的材料
```

不要索取当前决策不需要的信息。
