---
name: review-reddit-reply
description: Review a proposed Reddit knowledge reply for unsupported facts, overconfidence, community-rule conflicts, identity misrepresentation, promotion, links, calls to action, and template-like language. Use as the mandatory final gate before a human may approve a draft.
---

# Review Reddit Reply

## Mandatory Review

1. Confirm the complete post and current subreddit rules were read.
2. Compare every factual statement with the evidence summary and approved knowledge boundaries.
3. Confirm the draft is 80-180 English words and answers the post directly.
4. Flag any brand, product, app, service, link, CTA, slogan, signature, private-message invitation, identity claim, exact grade or value, guarantee, or unsupported test result.
5. Flag language that could be pasted unchanged under unrelated posts.
6. Confirm the draft does not conflict with subreddit rules.

## Gate

Any factual, platform, identity, promotional, or context risk blocks approval. Return the specific issue in `risk_flags`, clear `reply_draft_en`, set `decision` to `needs_context` when more evidence could resolve it, and otherwise set `decision` to `skip`.

Always include a short human checklist covering post freshness, image sufficiency, rule compliance, factual support, and final manual publication.
