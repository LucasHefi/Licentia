# Systematic individual license review — 2026-09-09

The user authorized completing all license content reviews with subagents. The
current scope is all 727 license entries. The 84 exception records remain outside
the standalone license guide. 202 individually documented licenses from prior
batches are retained; 525 remaining entries are assigned in `assignments.json`.

## Ownership and safety of edits

Each worker owns only the curated license profiles and individual content-review
JSON files for IDs assigned to its stream. Do not edit vocabulary, schemas,
runtime public data, shared expansion JSON, report generators, code, tests or
another worker's profiles. Do not run runtime sync or global report generation.
The parent integrates these. Preserve all existing unrelated changes and source
fingerprints. Do not commit. Do not delegate further; three worker slots are in use.

Read `data/README.md`, `data/vocabulary.json`, an individually curated example
profile, and the COMPLETE pinned `public/data/licenses/<ID>.json#text` for EACH
license. Process a few licenses at a time, avoid output truncation, and retain
separate evidence for every version. Grouping related versions may help compare
them but does not replace reading each text. Do not use bulk heuristics, family
names, OSI/FSF flags or existing generic `reviewed` states as proof of review.

## Content requirements

Review the grant, subject matter (software/content/fonts/hardware/data), source
versus binary obligations, distribution/use/network/advertising triggers,
modifications, alternative paths, patent grant and termination, naming and
endorsement restrictions, disclaimers and exceptions, jurisdiction/version
choices, and any third-party dependencies incorporated by reference.

Use vocabulary 1.4.0 (parent-coordinated addition of the `use` trigger). Do not add enum values. Map supported concepts
faithfully and keep license-specific conditions in the Czech summary and
field-level evidence. Empty arrays mean reviewed absence, not missing data.
Where a material requirement cannot be represented or external scope remains
unresolved, use `unknown` only for the affected semantic field, mark the profile
`not-recommendable`, and record the precise missing model/evidence and next step.
Do not silently flatten alternatives into cumulative duties, invent patent
grants, apply one version's terms to another, or treat all copyleft as whole-work.
Deprecated IDs and unsuitable non-software grants must not be recommended as a
license for a new software project. Their content can still be fully reviewed.

Inspect primary external sources when needed to resolve referenced material or
uncertainty. Follow the browsing tool's verification requirements. The pinned
text remains authoritative for this dataset; do not rewrite canonical text,
SPDX flags, or source fingerprints from today's websites. Put primary URLs and
the relevant factual findings in evidence; do not claim legal compatibility
merely because an SPDX expression parses.

## Per-license outputs (complete one before moving on)

1. Update the existing `data/profiles/licenses/id-<base64url(ID)>.json`.
   Preserve envelope identity, schema version and `sourceFingerprint` exactly.
   Set strong review evidence and all eight semantic fields. Supply one or more
   substantive, license-specific evidence entries for every semantic field and
   review, using rule ID `guide-expansion.editorial-review` and rule version
   `2026-09-09.10`. Each locator cites pinned text sections and what they establish.
2. Write `data/content-reviews/licenses/id-<base64url(ID)>.json` ONLY when the
   individual full-text review and profile edit are finished:

```json
{
  "id": "SPDX-ID",
  "reviewedAt": "2026-09-09",
  "ruleVersion": "2026-09-09.10",
  "reviewMethod": "individual-full-text",
  "sourceFingerprint": { "copy": "the exact profile object" },
  "disposition": "eligible OR blocked",
  "summaryCs": "Useful Czech description of the actual license conditions and exceptions.",
  "blockersCs": [],
  "analysis": {
    "subjectCs": "What the grant covers and any limits on subject matter.",
    "grantCs": "Rights actually granted, including patent grant or its absence.",
    "conditionsCs": "Duties with their conditions, triggers and alternatives.",
    "limitationsCs": "Disclaimers, exceptions, termination and special restrictions.",
    "compatibilityCs": "Version/combination alternatives or explicit absence; no invented compatibility conclusion."
  },
  "sources": [
    { "url": "https://spdx.org/licenses/SPDX-ID.html", "note": "Pinned SPDX text and sections reviewed; additional primary sources if used." }
  ]
}
```

`eligible` requires `review.status=reviewed`, `recommendable=true`, no unknowns
and full evidence. `blocked` requires `review.status=not-recommendable`,
`recommendable=false` and nonempty concrete `blockersCs`. Every blocker must say
what was found in the text and what is needed next; a generic “needs review” does
not count as completed content review. Keep this distinction explicit: review
completed is different from guide eligibility.

Validate own modified profiles using the exported `validateProfile` function in
`scripts/validate-license-data.mjs` (release mode). Atomically publish review JSON
after the profile is finished, so the parent can integrate completed entries
while workers continue. Send the parent a compact progress message every 10
completed licenses and immediately for a material modeling problem. Keep working
through every assigned ID. If context must be compacted, use the assignment and
completed per-license files to resume without redoing completed work. If forced
to end a turn early, report exact completed and remaining IDs and do not claim
the stream is finished.

## Coordinated clarification: use trigger

Vocabulary 1.4.0 adds `use` for obligations that attach to use itself, including
retaining an existing notice while using a copy. It is distinct from distribution
and network-use and does not itself grant any right, imply source disclosure or
copyleft. Apply it only when the actual text conditions use, and state the exact
notice placement in the evidence. Specialized product attribution, sale, source
forms or unresolved rights still need their own analysis and may remain blocked.

## Coordinated clarification: required use acknowledgment

Vocabulary 1.4.0 also includes `include-use-acknowledgment`. Unlike retaining an
existing notice, this is a mandatory acknowledgment of use, e.g. in product
documentation or publicly when the source is not public. Pair with `use` and
explain the exact condition, placement and any alternative in the per-license
analysis. It is nonminimal and does not itself imply source disclosure or an
advertising acknowledgment. Do not apply it to optional requests. Source/binary
notice placement is expressible by existing notice duties plus precise evidence;
placement alone is not a missing obligation type. Independent unresolved grants,
external terms, subject matter or true alternative duties still remain blockers.

## Coordinated clarification: explicit patent exclusion

Vocabulary 1.4.0 includes patentPosition `express-exclusion` when the text
expressly withholds patent rights (e.g. BSD-3-Clause-Clear). This is distinct
from `none-stated` when patent licensing is not addressed. It does not create
a patent grant or a patent-claim termination. Do not attach `patent-grant`
to an exclusion; preserve any exact scope in the evidence. The guide accepts
this known position but does not consider it to meet patents=important.

## Coordinated clarification: license and package boundaries

An explicit exclusion of independently licensed bundled components does not by
itself make the clearly stated grant for this license unknown. Record the exact
covered/excluded subject matter and the need for a separate package inventory in
the individual analysis. Never claim this license covers every bundled file.
Distinguish such exclusions from unidentified external conditions incorporated
into, and required for, the grant itself; those may remain genuine blockers.

A known rule identifying an authoritative copy (such as a package header taking
precedence over a convenience copy) is recorded as such. Do not invent a conflict
that has not been observed. Reviewing this pinned license text does not verify
the header or file inventory of every external package. An actual conflicting
source or additional unknown incorporated condition needs its own resolution.

## Coordinated clarification: static required notices

`include-notice` covers both keeping an existing required notice and supplying a
specified static notice with the software or distribution channel (for example,
source availability or EUPL Article 11 public license information as required by
applicable law). Record the exact content, location, role and trigger. This does
not stand in for actively contacting earlier recipients, obtaining assent,
creating a continuous public service, or undertaking distinct legal/safety work.
EUPL 1.1 and 1.2 Article 11 use the same treatment; retain other independent
blockers such as EUPL 1.0's mandatory new-version rule.

## Continuation after midnight

The same batch continues on 2026-09-10 (Europe/Prague). Newly completed reviews
use their actual `reviewedAt` date; completed 2026-09-09 records retain their date.
The coordination rule version and batch ID remain unchanged. Final integration
records the latest actual review date without rewriting earlier review history.

## Coordinated clarification: library modification conditions

For LGPL 2.x, keep the precise conditions that a modified work remains a library
and that a facility makes the required good-faith effort to remain meaningfully
functional without an application-supplied function/table (other than an argument).
These qualify the known library modification/copyleft model; document them in
the individual analysis rather than treating them as a new unknown safety duty.
Keep the alternative linked-application distribution paths distinct: a suitable
shared-library path does not automatically require application source. Compare
each version's own text, including any conditional GPL route. Deprecated IDs
remain excluded independently of this content classification.
