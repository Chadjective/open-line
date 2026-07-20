# OpenLine Corrections Policy

*Last updated: July 20, 2026.*

OpenLine's summaries and talking points are AI-generated and published without pre-publication human review (a machine self-gate holds some drafts back; no person reads the rest before they go live — see [EDITORIAL_STANDARDS.md](EDITORIAL_STANDARDS.md)). That makes a working corrections process a load-bearing part of the platform, not a formality. This page is the whole process: how to report an error, and exactly what happens after you do.

## How to report an error

Open an issue on the [OpenLine issue tracker](https://github.com/Chadjective/open-line/issues/new) with the title `Correction — [CallDoug / CallCarney / CallChow]`. Use this template — every field helps, but an incomplete report is better than no report:

```
Title: Correction — [CallDoug / CallCarney / CallChow]

Article title:        (as shown on the site)
Article link:         (the site page, and/or the original source link)
What the site says:   (quote the specific summary line or talking point)
What is wrong:        (in your own words)
What the source says: (quote or point to the relevant part of the
                       original article, if you can)
```

You do not need to prove the error. Pointing at the specific claim is enough; verifying it against the source is our job. If you can't use GitHub, any way you can get the report to us works — the template above tells us what we need to know.

## What counts

- **A correction** is warranted when a summary, talking point, suggested ask, or tag says something the source article does not support: a wrong number, a misattributed statement, a claim not present in the source, an overstated conclusion.
- **Upstream errors** — the source article itself was corrected or retracted after we summarized it — also warrant action: we re-check the entry against the corrected article, and update or remove it to match.
- **Framing disagreements** — the summary is accurate to the source but you object to the emphasis or the accountability lens — are not corrections. We still read them, and they can lead to changes in the generation rules, but they are handled as feedback, not errors.

## Response windows

| Stage | Commitment |
|---|---|
| Acknowledgement | Within 2 business days of receipt |
| Resolution (correct, remove, or explain) | Within 7 days of receipt |
| Fabricated or misattributed statement | Urgent: aim to act within 1 day; entry removed while under review if needed |

The urgent tier exists because a talking point that puts words in a named person's mouth is the most serious failure this platform can produce, and citizens may be repeating it on the phone in the meantime.

## Internal handling steps

Each report is handled in order:

1. **Log it.** The issue is the log: it records the report date, the entry, and the claimed error.
2. **Triage.** If the report alleges a fabricated or misattributed statement, move to step 3 immediately; if a first read suggests it is plausible, remove the entry from the feed while reviewing. Everything else proceeds in order of receipt.
3. **Verify against the source.** Read the original article in full. The question is only: does the source support the published claim? The source article is the standard — not other coverage, not our own view of the facts.
4. **Act.**
   - *Claim unsupported:* correct the entry in place, or remove it if the error contaminates the whole summary. Corrected entries get a visible note ("Corrected — [date]: …") at the top of the summary.
   - *Source itself corrected/retracted upstream:* update the entry to match the corrected article, or remove it if the article was retracted.
   - *Claim supported:* the entry stands.
5. **Reply.** Answer on the issue with what we found and what we did, within the resolution window — including when the entry stands, and why. The closed issue is the public record of the exchange.
6. **Record it.** Add a line to the correction log below. If the error suggests a pattern (a source that extracts badly, a prompt rule that fails a certain article shape), file it against the pipeline, not just the entry.

## Correction log

Public record of corrections made to published entries, newest first.

*No corrections logged yet.*
