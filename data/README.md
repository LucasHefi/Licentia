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
