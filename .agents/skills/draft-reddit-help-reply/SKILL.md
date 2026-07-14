---
name: draft-reddit-help-reply
description: Draft one natural, knowledge-only English Reddit comment from verified post context, relevance analysis, community rules, and approved knowledge boundaries. Use only after context and eligibility gates pass; do not use for private messages, promotional posts, or automatic publishing.
---

# Draft Reddit Help Reply

## Draft

1. Write one English comment of 80-180 words.
2. Answer the user's actual question in the first sentence.
3. Explain only the reasoning supported by verified context.
4. End with the smallest useful request for missing information, when needed.
5. Keep the language natural and specific to the post. Avoid a reusable sales or support template.

## Hard Boundaries

- Do not mention DEDC, The Lab, a product, service, app, website, or commercial link.
- Do not include a CTA, slogan, signature, unsolicited DM invitation, exact grade, exact value, or guaranteed outcome.
- Do not claim to be independent, unaffiliated, a professional grader, or the post author.
- Do not draft when the decision is `skip` or `needs_context`; return an empty `reply_draft_en`.
- Do not publish or interact with Reddit.
