---
name: aso-optimizer
description: 面向 Apple App Store 和 Google Play 的一体化 ASO 分析与优化 Skill。用户提出 ASO、竞品、七麦或 MobileAction 数据分析、关键词研究、商店元数据、截图与图标测试、冷启动策略、App Store Connect、Google Play Console、RevenueCat 或后续广告增长请求时使用。
---

# ASO 优化助手

根据当前证据完成必要且完整的 ASO 流程。先确认产品事实和数据边界，再进行关键词、商店文案或实验决策。

## 开始

1. 盘点用户提供的产品资料、文件、链接、截图和明确事实。
2. 判断数据阶段：
   - `M0`：缺少已验证产品背景。
   - `M1`：只有产品背景，没有市场或表现证据。
   - `M2`：有竞品或市场证据，没有第一方表现数据。
   - `M3`：有带日期和范围的第一方商店、产品、收入、实验或广告数据。
3. 按下表选择必要模块。不要为了减少模块而省略必要步骤，也不要读取与当前任务无关的模块。
4. 复杂任务按依赖顺序分阶段执行，完成并确认上一步后再进入下一步。

## 模块路由

| 任务 | 必读文件 | 可选后续 |
|---|---|---|
| 产品背景缺失、冲突或过期 | [app-context.md](references/app-context.md)、[context-schema.md](references/context-schema.md) | 证据审计 |
| CSV、表格、截图、趋势图或第三方导出 | [evidence-audit.md](references/evidence-audit.md)、[evidence-contract.md](references/evidence-contract.md) | 关键词策略 |
| 关键词发现、交集、缺口和优先级 | [keyword-strategy.md](references/keyword-strategy.md)、[keyword-method.md](references/keyword-method.md) | 商店文案 |
| Apple 或 Google 商店元数据 | [listing-optimization.md](references/listing-optimization.md)、[platform-metadata.md](references/platform-metadata.md)、[claim-safety.md](references/claim-safety.md) | 实验规划 |
| 截图、图标、价值主张或商店测试 | [experiment-planner.md](references/experiment-planner.md)、[experiment-policy.md](references/experiment-policy.md) | 结果记录 |

## 默认组合流程

- 冷启动研究：产品背景 → 证据审计 → 关键词策略。
- 元数据方案：证据审计 → 关键词策略 → 商店文案。
- 素材测试：产品背景 → 证据审计 → 实验规划。
- 有第一方数据：先审计数据范围，再只处理已诊断的问题。

## 确定性工具

- 检查 ASO CSV：

```bash
python3 scripts/inspect_aso_csv.py <file> [<file> ...]
```

- 比较多份兼容的关键词导出：

```bash
python3 scripts/compare_keyword_exports.py <file> [<file> ...]
```

- 校验 Apple 或 Google 元数据：

```bash
python3 scripts/check_metadata.py metadata.json
```

- 在已知基线与最小可检测差异时估算实验样本量：

```bash
python3 scripts/estimate_sample_size.py --baseline 0.25 --relative-mde 0.10
```

脚本输出是审计或规划输入，不自动等于业务结论。

## 全局约束

- 区分事实、推断、假设和建议，并为重要结论标明来源。
- 没有第一方数据时，将建议标记为冷启动假设，不承诺排名、转化或收入提升。
- 竞品覆盖和第三方热度不能单独证明产品相关性。
- 不平均不同提供方的原生分数，不制造不透明的综合机会分。
- Apple 与 Google 的字段、索引逻辑和实验规则分开处理。
- RevenueCat 只用于其覆盖的订阅、权益和收入范围，不能替代商店曝光、产品行为或广告归因。
- 不虚构功能、准确率、奖项、用户数、合作关系、免费范围或“官方”身份。
- 没有基线流量时，不提供虚构的实验周期、样本量或置信度。
- 只询问会阻碍当前决策的信息。

## 输出

默认使用中文，并按以下结构组织：

```text
数据阶段：M0 / M1 / M2 / M3
执行流程：
结论摘要：
使用材料与证据：
关键发现：
建议与优先级：
不确定性和数据缺口：
下一步行动：
```

商店文案使用目标市场语言。无法确认的内容写为 `unknown`，不要补造。
