---
name: assess-card-question
description: Assess a verified Reddit opportunity for trading-card relevance, user intent, and missing evidence. Use after reading the complete post and subreddit rules, especially to reject Radar keyword collisions and decide whether a safe knowledge-only reply can be drafted.
---

# Assess Card Question

## Assessment

1. Ignore `radar_score` when deciding relevance; it is only a queue-order signal.
2. Classify relevance as `relevant`, `uncertain`, or `irrelevant`.
3. Classify intent as `grading`, `condition`, `value`, `care`, or `other`.
4. Identify the exact question and list missing evidence such as card identity, set or edition, front and back images, corners, edges, surface under angled light, known alterations, or market and sale context.
5. Return `skip` for non-card uses of words such as centering, grading, condition, or value.
6. Return `needs_context` when relevance or intent cannot be established from verified context.

## Reply Eligibility

Allow `draft` only for a relevant question that can be answered with a useful, non-promotional framework. Do not draft merely because the Radar score is high. For image-dependent grading or condition questions, explain what evidence is missing instead of assigning a grade.
