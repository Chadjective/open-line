# OpenLine Editorial Standards

*Last updated: July 20, 2026. This page is versioned in the [OpenLine repository](https://github.com/Chadjective/open-line); any change to it is visible in the commit history.*

OpenLine is a small, independent civic platform. It runs three sites — **CallDoug** (Doug Ford, Premier of Ontario), **CallCarney** (Mark Carney, Prime Minister of Canada), and **CallChow** (Olivia Chow, Mayor of Toronto) — each of which collects published news coverage of one elected official and generates summaries and talking points to help constituents call that official's office.

This page describes exactly how that works, including the parts that should temper your confidence in it. It is written to be checked against the code that runs the platform, which is public in the repository above.

## What OpenLine does

- Collects articles once a day from a fixed list of news outlets' public RSS feeds.
- Filters them by keyword — each instance watches for its official's name and role (for CallDoug: "Doug Ford," "Ford government," "Ontario premier," "Premier Ford," "Queen's Park") in the article's title and feed summary.
- Uses an AI model to produce, for each matching article: a summary, talking points, a suggested ask, and a note on respectful tone.
- Publishes those alongside a link to the original article, and lists the official's public office contact information.
- Where one story implicates more than one level of government — a federal–provincial housing deal that cities must deliver, say — it may appear on more than one site, each summarized for that office's specific accountability.

## What OpenLine does not do

- **No original reporting.** Everything here restates someone else's published work. The source link is the journalism; we are a layer on top of it.
- **No fact-checking.** We do not verify the claims in the articles we summarize. If a source outlet gets something wrong, our summary will repeat the error.
- **No pre-publication human review.** No person reads a summary before it goes live. There is a machine gate — described below — and anything it flags is held back for human review. But everything that passes the gate publishes with no human eyes on it.
- **No claim of political balance.** We do not describe ourselves as non-partisan, because our source list cannot support that claim. See the next section.
- **No motive claims or character attacks.** The generation rules constrain summaries to actions, decisions, and documented consequences — not what an official supposedly intends, and not who they supposedly are.
- **No personal information.** We do not publish home addresses, personal phone numbers, or anything about officials' families, and we do not encourage harassment of officials or their staff.

## Where the articles come from

Each site draws from a fixed, named list of RSS feeds. These are the complete lists — there are no unnamed sources:

**CallDoug (Doug Ford):** CBC Ontario, The Narwhal, The Breach, Ricochet.

**CallCarney (Mark Carney):** CBC Politics, The Narwhal, The Breach, Ricochet.

**CallChow (Olivia Chow):** CBC Toronto, NOW Toronto, TorontoToday.

An honest characterization of that list: each site is anchored by a CBC feed, a large general-audience public broadcaster; the remainder are independent outlets whose editorial identities and coverage priorities sit left of centre (The Narwhal, The Breach, Ricochet, NOW Toronto). No conservative-leaning or business-press outlet is currently on any list.

This matters because **source selection determines which stories exist on the platform at all.** Our generation rules constrain how any given article is summarized; they do nothing about which articles arrive. A feed drawn largely from outlets that prioritize climate, labour, and housing coverage will surface a different picture of an official than a feed drawn from business-press outlets would — before any AI is involved.

What we can honestly claim is this: **the same method is applied to every official, regardless of party.** The same rules, the same gate, the same constraints govern the summaries for a Progressive Conservative premier, a Liberal prime minister, and a progressive mayor. The method is uniform. The source mix is not balanced, and we do not claim it is.

Two further selection effects worth knowing about:

- Articles are matched by keywords in the **title and feed summary**. Coverage of an official that names them only deep in the body is missed.
- Article text is extracted automatically and truncated at roughly 6,000 characters. Very long pieces are summarized from their opening portion.

## How summaries are generated

Summaries are produced by an AI model — currently `gpt-4o-mini`, running on GitHub Models. Each article's extracted text is sent to the model with a fixed set of instructions: a written voice guide with worked examples, and a required output format. The instructions include:

- Ground every claim in the article text; add no facts, statistics, or quotes not present in the source.
- Do not fabricate; if unsure, omit.
- Apply the same accountability lens regardless of the official's party.
- Focus on policy decisions, their consequences for constituents, and what accountability would look like — not motives or character.
- Talking points must support a calm, factual conversation with office staff, not win an argument.

These are instructions to a model, not guarantees. AI models sometimes misread, overstate, or misattribute even when instructed not to. The instructions reduce the failure rate; they do not eliminate it.

## The self-gate

After drafting, the model is required to judge its own draft against the rules above and flag it if anything is unsourced, partisan in framing, or overreaching — with a stated reason.

- **Flagged drafts do not publish.** They are recorded in a held queue in the public repository, with the reason, and surface in a daily review digest for a human to look at. A held item only ever publishes if a person explicitly promotes it; left alone, it stays unpublished.
- **Unflagged drafts publish automatically.** This is the honest limit of the system: the gate is the same class of AI that wrote the draft, judging itself. Treat it as a filter that catches some failures, not a guarantee that none pass.
- Two things are dropped without publishing regardless: articles whose text could not be retrieved, and model output that fails to parse.

## What the talking points are — and are not

**Talking points are a starting point, not verified fact.** They are an AI's restatement of one outlet's reporting. Before you call an official's office and assert something as true, read the original article — it is linked on every entry — and satisfy yourself that the point survives contact with the source. If a summary and its source article disagree, the article is right and the summary is wrong, and we want to hear about it.

## Corrections

If you find an error — in a summary, a talking point, a suggested ask, or anything else on the platform — open an issue on the [OpenLine issue tracker](https://github.com/Chadjective/open-line/issues) titled `Correction — [site]`. The full intake template and handling process are in [CORRECTIONS.md](CORRECTIONS.md).

Our commitments: we acknowledge correction reports within **two business days**, and resolve them — by correcting, removing, or explaining why the entry stands — within **seven days**. Reports that a summary attributes to someone a statement they did not make are treated as urgent; we aim to act on those within one day, removing the entry while we review if necessary.

## About this page

This page describes the system as it is, not as we would like it to be. When the system changes — sources added or removed, review steps introduced, generation rules revised — this page changes with it, and the repository history records both.
