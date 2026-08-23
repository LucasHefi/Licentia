# Curated license metadata

`data/profiles/` is curated input: stable metadata, semantic annotations, and
evidence reviewed by this project. `public/data/` is generated output from a
later pipeline and is not an authoring location. `vocabulary.json`, the JSON
Schemas, and `sources.lock.json` form the deterministic metadata contract.

Validate with `npm run data:validate`. Pending records may contain explicit
`unknown` values; reviewed or recommendable records require evidence. This
contract describes data shape and review state, not legal conclusions.

Profile synchronization derives `sourceFingerprint.revision` as
`manifest-sha256:<hash>`. This is a fingerprint of the local source snapshot,
not an invented upstream commit. `sourceFingerprint.sourceId` maps to the
corresponding ID in `data/sources.lock.json`; that lock intentionally records
the upstream revision and content hash as unresolved, so release validation
remains fail-closed. If a source disappears, synchronization reports an orphan
(`not deleted; remove explicitly after review`) and both `--check` and `--write`
 preserve the existing profile until it is removed explicitly after review.

Legacy Choose-a-License summaries are imported as pending derived metadata with
field-level evidence. They are not legal approval and require human review
before any profile can be recommended.
