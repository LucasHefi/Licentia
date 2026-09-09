# Curated license metadata

`data/profiles/` is curated input: stable metadata, semantic annotations, and
evidence reviewed by this project. `public/data/` is generated output from a
later pipeline and is not an authoring location. `vocabulary.json`, the JSON
Schemas, and `sources.lock.json` form the deterministic metadata contract.

Validate with `npm run data:validate`. Pending records may contain explicit
`unknown` values; reviewed or recommendable records require evidence. This
contract describes data shape and review state, not legal conclusions.

A profile marked `recommendable: true` is a complete guide input, not merely a
reviewed text. It must contain no explicit `unknown` value and its evidence must
cover every semantic field plus `review`. An empty semantic list is permitted
when the license text supports the conclusion that the category has no items;
the evidence locator must make that whole-text or clause-level review explicit.

Profile synchronization derives `sourceFingerprint.revision` as
`manifest-sha256:<hash>`. This is a fingerprint of the local source snapshot,
not an invented upstream commit. `sourceFingerprint.sourceId` maps to the
corresponding ID in `data/sources.lock.json`. Auxiliary upstream sources may
remain unresolved while all of their profiles are pending or explicitly
non-recommendable. Release validation fails if a reviewed/recommendable profile
depends on any unresolved source. If a source disappears, synchronization reports an orphan
(`not deleted; remove explicitly after review`) and both `--check` and `--write`
 preserve the existing profile until it is removed explicitly after review.

Legacy Choose-a-License summaries are imported as pending derived metadata with
field-level evidence. They are not legal approval and require human review
before any profile can be recommended.

After changing curated profiles, run `npm run data:runtime:write`. The checked-in
runtime catalog and detail records carry the same review state and evidence;
`npm run data:runtime:check` prevents those copies from drifting.

The 2026-09-09 expansion retains its dated batches and completes systematic
coverage of all 727 pinned licenses through separate content-review records.
Current eligibility counts and every blocker are generated in the guide and
systematic review reports; a completed negative review remains useful data.
`guide-expansion.json` records batch membership and Czech display notes.
`blockedNotes` records follow-up work; `blockedDisplayNotes` explains the actual
conditions to catalog users, including deprecated IDs without recommending them.
These notes do not replace semantic profiles or field-level evidence. Empty lists
express reviewed absence; unknown can record a precise unresolved modeling or
grant question after a completed content review.
The fourth batch distinguishes Apache 1.1 documentation acknowledgment from
Apache 1.0 advertising, Qhull's original-source notice from source supply,
MIT-STK's optional contribution request from a duty, and the BSD nuclear
warranty disclaimer from the separate nuclear-use prohibition. PSF-2.0 is
reviewed independently of the composite Python-2.0 text. Its termination and
assent clauses, and the Unicode-3.0 notice alternatives, are preserved in notes
and evidence. XSkat and Zed remain excluded pending conditional naming rules.
The fifth batch reviews BlueOak's contributor patent grant, text-or-link notice
and 30-day notice remedy, plus variants such as bzip2, Boehm-GC and Leptonica.
It separates optional attribution/contribution requests from duties and the
bcrypt dedication's fallback grant from libselinux's historical public-domain
assertion. Sale-only source supply in Vixie-Cron, product-use acknowledgment,
unspecified GPL/Python alternatives and unresolved source-only grant scope
remain documented blockers; no missing trigger is replaced by distribution.
The sixth batch covers source/binary notice variants, InnoSetup's existing UI
notices, OML's changed licensing terms on each file's first page, and Mup's
documented reasons and authors for changes. Optional gifts/credits stay optional.
At that stage, CryptoSwift's product acknowledgment, Cube's source relicensing
restriction, MMIXware's package-wide naming rule and Noweb's derivative-sale
conditions remained blocked; the systematic review below resolves CryptoSwift.
Glulxe's missing historical URL and OpenVision's derivative-copyright
assertion require their original context; modern upstream licensing is not
substituted for the reviewed SPDX text.
The UI uses eligible curated profiles and fully evidenced strong negative
reviews recorded in the expansion for family labels, detail rules and comparison. Negative reviews remain
excluded from recommendations. Other records retain imported summaries as a fallback.

Vocabulary 1.1.0 adds `allow-relinking` and `allow-reverse-engineering` for
conditional combined-work obligations in LGPL 2.0/2.1/3.0.
These two obligations count as more than minimal compliance, but do not alone
imply a source-disclosure obligation.
LGPL 2.0 has no standalone suitable-shared-library alternative; its note and
evidence describe section 6(a)-(d) separately. CDDL 1.0/1.1 use file scope and
retaliatory patent termination; their version, jurisdiction and settlement
conditions are recorded in individual evidence and display notes.
The profile/envelope shape remains 1.0.0; both runtime validators recognize the
new values, and older strict validators will reject them rather than ignore them.
The quick and advanced guide model is now `lic-008-guide-v6`, with a library
copyleft choice. License-specific alternatives and boundaries are in the notes
and field evidence; this does not determine compatibility of an application.

`npm run data:guide:report` regenerates
[`docs/reports/guide-inclusion.md`](../docs/reports/guide-inclusion.md) from
the current source fingerprints, profiles, runtime copies and recommendation
gate. It lists every excluded license and exception with missing fields and
review blockers. `npm run data:guide:check` detects report drift in `check`.
Do not use `complete-pending-license-reviews.mjs` as evidence of content review:
it only fills generic review records and cannot establish semantic accuracy.

The seventh batch distinguishes COIL's explicit, scoped patent grant from UCAR's
all-rights patent termination without a grant. UCAR was initially excluded; batch eight resolves that blocker by requiring an
explicit patent-grant permission for patent-sensitive recommendations. EFL 1.0 requires public release
of a modified dependency for distributed binaries; EFL 2.0 only encourages it.
Caldera advertising, Inner Net version labels, TMate downstream source scope,
Plexus acknowledgment wording and Xerox export conditions retain concrete blockers.
Intel's historical export notice and voluntarily retired recommendation status
are recorded without altering canonical SPDX flags.

The eighth batch adds AGPL 3.0 (only/or-later), EPL 2.0, EUPL 1.2, PHP 3.01,
Python 2.0 and re-admits UCAR after fixing patent scoring in TS and PHP. Vocabulary
1.2.0 adds `conditional-relicensing`, `preserve-combined-license-terms`,
`defend-commercial-distribution` and `defend-added-warranty`. These last two
obligations retain their commercial-distribution/additional-warranty conditions;
they are not unconditional duties for every user. All three new obligations
are nonminimal and do not by themselves imply source disclosure.
AGPL's GPLv3 combination retains each part's terms; the network source offer
covers both. EUPL communication includes essential-functionality access, even
without modification. Secondary licensing requires the specific EPL notice
or the EUPL combined-derivative/appendix conditions; a parsed SPDX expression
is not evidence of compliance or compatibility. Artistic 2.0 and Ruby remain
excluded pending a model of their alternative distribution paths.

The ninth batch adds seven guide licenses and updates the already eligible
BSD-3-Clause-acpica profile; `batches[].updated` distinguishes that correction
from a new inclusion. Vocabulary 1.3.0 adds the `advertising` trigger and
`include-advertising-acknowledgment` / `pass-disclaimer-requirement` obligations.
Both are nonminimal, neither alone means source disclosure. Quick and advanced
guides accept `advertising=allowed|avoid`; allowing the obligation grants no
extra points and does not prefer advertising licenses. Avoiding it creates a
specific deficit for affected licenses in TS and PHP, including internal use.
This preference is persisted in workspace state and exposed through API/MCP.
Apache 1.0 and Caldera-no-preamble are now included; Caldera retains its
historical UNIX subject-matter blocker. BSD-4-Clause-UC retains a separate
blocker for reconciling its pinned historical text with the UC Berkeley
1999 addendum. No canonical license text or SPDX flags are rewritten.

### Systematic content review

The 2026-09-09 review covers all 727 pinned licenses, preserving 202 prior
individual reviews and assigning 525 remaining entries across three independent
streams. Each published JSON under `data/content-reviews/licenses/` contains a
separate decision, source fingerprint, Czech analysis and any concrete blocker.
`data:reviews:report` renders individual Markdown records and the coverage report;
`data:reviews:check` requires complete coverage and rejects stale reports, missing
field evidence, changed fingerprints or an eligibility claim rejected by the
actual guide gate. See `data/review-workflow/PROTOCOL.md` for the process.

Vocabulary 1.4.0 adds `use` for duties triggered by use itself. It does not grant
usage rights, imply distribution or network-use, or introduce a source duty.
The exact notice and its placement remain in each license’s analysis.

The same vocabulary release includes `include-use-acknowledgment`, a required
acknowledgment of use with its exact product/publication condition in evidence.
Guide v6 treats it as nonminimal, without inferring advertising, copyleft or
source disclosure. Merely preserving a notice remains a distinct duty.

`patentPosition: express-exclusion` distinguishes an explicit exclusion of
patent rights from silence (`none-stated`). It does not meet a requested patent
grant, imply retaliation, or itself block every other guide scenario.
