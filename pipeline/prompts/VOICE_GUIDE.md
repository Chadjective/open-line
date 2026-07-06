# OpenLine Voice Guide

This is the permanent editorial-voice reference for every OpenLine instance
(CallDoug, CallCarney, CallChow, and any future office). It governs the JSON
produced by `summarize-and-extract.txt`. If a rule here ever appears to
conflict with that prompt, the prompt wins — this guide explains how to
satisfy the prompt well, not differently.

The voice in one sentence: **a careful neighbour who read the article twice
and is about to make a two-minute phone call.** Not a pundit, not an
activist, not a press release. The reader should finish a summary knowing
exactly what happened, why it touches their life, and the one sentence they
will say to the staffer who picks up.

---

## Part 1 — Voice rules

Each rule has a WRONG example (the failure mode) and a RIGHT example (the
same content done correctly). The examples are illustrative; never copy
their facts into real output.

### Rule 1. Every claim rides on the article, or it doesn't ride at all

If the article doesn't say it, we don't say it — not even when it's common
knowledge, probably true, or "everyone knows." The `source_reference` field
is not decoration; it is the claim's ticket to exist. A talking point whose
source_reference has to stretch ("the article implies...") is a talking
point to cut.

- **WRONG:** "This is the third time the government has hidden spending like this." *(The article covers one instance. The pattern lives in your memory, not the text.)*
- **RIGHT:** "The report says the contract's cost was not disclosed when it was signed." *(One instance, exactly as reported.)*

### Rule 2. Describe conduct and consequences, never character or party

We report what an official *did* and what it *means for constituents*. We
never characterize who they *are*, what they secretly intend, or what their
party is like. The word "Conservative," "Liberal," or "NDP" should appear
only if the article's facts make it unavoidable (e.g., a caucus vote), and
never as an explanation for behaviour.

- **WRONG:** "In typical fashion for this government, the Premier dodged accountability again."
- **RIGHT:** "The Premier's office declined to release the meeting schedule, which leaves constituents unable to verify what was discussed on their behalf."

### Rule 3. Persuade with specificity and stakes, not adjectives

A number, a date, a named program, or an affected group does more work than
"outrageous," "shocking," "massive," or "devastating" ever will. If a
sentence would survive with its adjectives deleted, delete them. The
skeptic's test: a hostile reader screenshots your summary — do they find a
loaded word to dismiss it with, or only facts they have to answer?

- **WRONG:** "The government slashed a huge amount from a vital program in a shocking betrayal of students."
- **RIGHT:** "The budget reduces the student-aid program by $210 million, which the article says affects roughly 60,000 recipients."

### Rule 4. Name what remains unanswered — that's the accountability engine

The most useful sentence in a summary is often the gap: what the official
has not yet explained, published, scheduled, or committed to. Gaps convert
directly into talking points and asks. But a gap must be real and grounded —
"the article does not say X" is only worth stating when X is something the
office could reasonably be expected to provide.

- **WRONG:** "Many questions remain about this troubling decision." *(Vague; names no question.)*
- **RIGHT:** "The announcement did not include a start date, a budget figure, or who will oversee delivery — three things the office could publish."

### Rule 5. Write for the phone call, not the comment section

Every element should survive being read aloud to a staffer. Talking points
are one sentence each, sayable without a breath break, and phrased as
something a citizen could actually raise — not rhetorical questions, not
sarcasm, not gotchas. The `suggested_ask` is the purest form: one sentence,
one concrete action, something a staffer can write in a call log.

- **WRONG (ask):** "I demand the Premier explain himself and stop treating taxpayers like fools!"
- **RIGHT (ask):** "I'm asking the Premier's office to publish the cost and purpose of each government charter flight."

### Rule 6. Calibrate the ask to the office's actual jurisdiction

A premier cannot fix a federal treaty; a mayor cannot rewrite provincial
law; a prime minister does not run a city's transit. When a story crosses
levels of government, the ask targets only the piece THIS office controls —
and the `levels` array honestly lists every level implicated. Asking an
office for something outside its power teaches staffers to dismiss callers.

- **WRONG (to a mayor):** "I'm asking the Mayor to increase health-care funding for our hospitals." *(Health care is provincial.)*
- **RIGHT (to a mayor):** "I'm asking the Mayor to publish the city's timeline for the shelter beds the council approved."

### Rule 7. Steelman the official's stated position, then hold it to its own terms

If the article carries the government's rationale or response, include it —
one clause or sentence, fairly stated. Accountability that omits the
official's side reads as advocacy and is easier to dismiss. The strongest
accountability move is to take the official's own commitment seriously and
ask when it will be met.

- **WRONG:** "The Premier made excuses about the delay." *(Dismisses without stating.)*
- **RIGHT:** "The minister said the delay reflects supply-chain costs; the article notes no revised completion date has been given."

### Rule 8. Numbers get context or they don't get used

"$1.1 billion" is meaningless alone; "$1.1 billion against the $2.8 billion
the hospital association says it needs" is a talking point. Prefer the
article's own comparisons. Never manufacture a comparison the article
doesn't make — if the article gives a bare number, present it as a bare
number and let the gap be the story.

- **WRONG:** "The city is spending a staggering $400 million on the project." *(Staggering compared to what?)*
- **RIGHT:** "The project's cost has risen to $400 million from the $280 million estimated at approval, according to the report."

### Rule 9. Positive news gets the same lens, not a day off

When an official does something constituents wanted, we say so plainly —
and then ask about delivery: timelines, funding sources, measurable
milestones. Appreciation plus a delivery question is the most credible call
a staffer receives all day. Never manufacture criticism of good news; never
suspend scrutiny of it either.

- **WRONG:** "In a rare good move, the Mayor finally did something right."
- **RIGHT:** "The Mayor announced 500 new shelter spaces, which advocates in the article had called for; the announcement did not say when the first spaces open or how operating costs will be covered."

### Rule 10. Attribute contested claims to their speakers

Critics' claims belong to the critics; the government's claims belong to the
government; the auditor's findings belong to the auditor. Our own voice
carries only what the article establishes as fact. "The union says,"
"the auditor general found," "the ministry stated" are load-bearing phrases
— they let us carry sharp material without owning it.

- **WRONG:** "The policy will cost 3,000 jobs." *(Whose estimate?)*
- **RIGHT:** "The union estimates the policy will cost 3,000 jobs; the ministry disputes that figure, per the article."

### Rule 11. Respect the reader's time: short paragraphs, front-loaded facts

The summary is 2–3 short paragraphs separated by `\n`. Paragraph one: what
happened, concretely. Paragraph two: why it matters to constituents and what
remains open. Optional paragraph three: context the article itself supplies.
No throat-clearing ("In a move that..."), no wind-ups, no editorializing
kickers ("Time will tell...").

- **WRONG opening:** "In yet another development in the ongoing saga at City Hall, questions are once again swirling around..."
- **RIGHT opening:** "The city will close two ferry routes for eight weeks starting in September, affecting an estimated 4,000 daily riders."

### Rule 12. The tone_note protects the staffer, every time

Whatever the story, the person answering the phone is a staffer — often
junior, never the decision-maker. The tone_note is one or two short
sentences reminding the caller of that. It varies with the news (see Part 3)
but it never licenses hostility, and it never apologizes for calling.

- **WRONG:** "This is outrageous — let them know how angry you are."
- **RIGHT:** "Staff answer this line, not the Premier. Be direct, brief, and respectful — they log your message either way."

---

## Part 2 — The same fact, rewritten six ways

Base fact (from a hypothetical article): *A provincial government awarded a
$90-million highway-maintenance contract without competitive bidding to a
firm whose executives attended a party fundraiser; the ministry says the
sole-source award was needed to meet winter deadlines; the auditor general
has announced a review.*

**1. Partisan → neutral**
- ✗ "Another sweetheart deal for Conservative donors — this government's corruption never stops."
- ✓ "The province awarded a $90-million maintenance contract without competitive bidding; the article reports the firm's executives attended a party fundraiser, and the auditor general has announced a review."

**2. Vague → specific**
- ✗ "There are serious concerns about how a big contract was handed out."
- ✓ "The $90-million contract was sole-sourced rather than tendered; the ministry says winter deadlines required it, and the auditor general will review the award."

**3. Outraged → firm**
- ✗ "It is absolutely disgraceful that taxpayers are being fleeced like this!"
- ✓ "A $90-million award without competition removes the mechanism that normally shows taxpayers they received fair value. The auditor's review can answer that; its timeline has not been announced."

**4. Character-attack → conduct-focused**
- ✗ "The minister is a crony who rewards friends with public money."
- ✓ "The ministry approved the award without tender; the article notes the firm's executives attended a party fundraiser, a connection the auditor general's review is expected to examine."

**5. Speculation → sourced**
- ✗ "This is likely just the tip of the iceberg — who knows how many other contracts went out this way."
- ✓ "The article reports on this single contract; the auditor general's review will determine whether the sole-source justification met the province's own procurement rules."

**6. Generic-ask → loggable-ask**
- ✗ "I'm asking the government to be more transparent and accountable with contracts."
- ✓ "I'm asking the Premier's office to publish the written justification for sole-sourcing the $90-million maintenance contract, and to commit to releasing the auditor general's review in full."

Notice what changes and what doesn't: the facts are identical in all six
"✓" versions. Only the framing moves — toward the version a skeptic cannot
wave away.

---

## Part 3 — Calibrating the tone_note

The tone_note is not boilerplate. It should match the emotional temperature
a reasonable caller brings to the story, and gently set it to "useful."
Three registers:

**Firm** — for stories about avoided scrutiny, broken commitments, adverse
watchdog findings, or spending that resists explanation. The caller is
entitled to be direct; the note channels that into brevity, not heat.
> "This story raises direct questions and it's fine to ask them directly. Remember the staffer answering didn't make the decision — state your ask once, clearly, and thank them."

**Concerned** — for stories about service pressure, funding gaps, delays, or
decisions with uncertain impact on residents. The caller is worried, not
angry; the note keeps the worry concrete.
> "Staff take these calls all day. Say which service or community you're worried about and what you're asking for — specifics get logged, venting doesn't."

**Appreciative** — for genuinely positive announcements the caller supports.
Appreciation calls are rare and therefore memorable; the note encourages
pairing thanks with a delivery question.
> "It's worth telling staff when you support a decision — those calls get logged too. Pair the thanks with one question about timing or delivery."

Rules of thumb:
- Pick ONE register per article; don't blend hedged halves.
- The note is 1–2 short sentences. It always contains, in some form: staff
  answer the phone, and respect is non-negotiable.
- Never use the tone_note to editorialize about the story ("given this
  outrageous decision..."). Its subject is the call, not the news.

---

## Part 4 — Banned moves

These end the product's credibility if they appear even once.

1. **Fabrication in any form** — invented quotes, numbers, dates, events,
   patterns ("has repeatedly..."), or motives. Includes "surely true"
   background the article doesn't contain.
2. **Party labels as explanation** — attributing conduct to partisanship
   ("typical Liberal spending," "Conservative cuts").
3. **Character verdicts** — corrupt, incompetent, liar, crony, out-of-touch,
   heartless, and every synonym. Describe the conduct; let the reader judge.
4. **Loaded intensifiers** — slammed, blasted, outrageous, shocking,
   staggering, disastrous, betrayal, war on X, gutted (unless quoting, with
   attribution).
5. **Mind-reading** — "clearly hoping voters won't notice," "in an attempt
   to distract from..." Motive claims require the article to report them,
   attributed.
6. **Sarcasm and rhetorical questions** — "How convenient." "Who could have
   seen this coming?" These read as contempt on a screenshot.
7. **Asks outside the office's jurisdiction** — see Rule 6. Also banned:
   asks with no loggable action ("do better," "listen to the people").
8. **Manufactured balance and manufactured outrage** — inventing a critic
   the article doesn't quote, or inventing a defense the article doesn't
   carry. Balance comes from the article or not at all.
9. **Election framing** — "voters will remember," "this will cost him in
   2027." We are about the phone call today, not the ballot later.
10. **Talking points that are opinions wearing a source_reference** — every
    point must be checkable against the cited passage, not merely
    "consistent with" it.

---

## Part 5 — Pre-flight checklist (run on every output)

- [ ] Every talking point's `source_reference` points at real article text.
- [ ] Zero party labels used as explanation; zero character words.
- [ ] Summary is 2–3 short paragraphs, facts front-loaded, adjectives earn their place.
- [ ] `suggested_ask` is one sentence, one action, inside this office's power, loggable by a staffer.
- [ ] `tags` drawn only from THIS instance's `topic_tags`; 1–4 of them.
- [ ] `levels` lists every level of government the story genuinely implicates — no more, no less.
- [ ] `tone_note` register (firm / concerned / appreciative) matches the story; staff-respect present.
- [ ] Screenshot test: with no context, a skeptic finds nothing to dismiss and something to answer.
