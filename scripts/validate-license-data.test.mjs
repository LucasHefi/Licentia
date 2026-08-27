import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract, validateProfile, validateSchemaMetadata } from './validate-license-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPaths = [
  path.join(root, 'data/schema/license-profile.schema.json'),
  path.join(root, 'data/schema/license-exception-profile.schema.json'),
];
const licenseFieldsForTest = ['family', 'copyleftScope', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPosition', 'noticeBurden'];
const resolvedSemantic = { family: 'permissive', copyleftScope: 'none', permissions: ['commercial-use'], obligations: ['include-license-text'], triggers: ['distribution'], restrictions: ['warranty'], patentPosition: 'none-stated', noticeBurden: 'standard' };
const completeEvidence = [...licenseFieldsForTest, 'review'].map(field => ({ field, sourceId: 'spdx-license-list', locator: 'license text' }));

const base = {
  id: 'Example-1.0', kind: 'license', schemaVersion: '1.0.0',
  sourceFingerprint: { sourceId: 'spdx-license-list', revision: 'r1', contentHash: 'sha256:example' },
  review: { status: 'pending', recommendable: false, evidenceLevel: 'unknown' },
  semantic: { family: 'unknown', copyleftScope: 'unknown', permissions: ['unknown'], obligations: ['unknown'], triggers: ['unknown'], restrictions: ['unknown'], patentPosition: 'unknown', noticeBurden: 'unknown' },
  evidence: []
};

test('accepts a valid pending profile with explicit unknowns', () => assert.equal(validateProfile(base).status, 'pending'));
test('accepts every non-recommendation review state', () => {
  for (const status of ['pending', 'stale', 'blocked', 'not-recommendable']) assert.equal(validateProfile({ ...base, review: { status, recommendable: false, evidenceLevel: 'unknown' } }).status, status);
});
test('requires sorted unique vocabulary arrays and explicit unknown choices', () => {
  const { vocabulary } = validateContract();
  for (const values of Object.values(vocabulary).slice(1)) { assert.deepEqual(values, [...values].sort()); assert.equal(new Set(values).size, values.length); assert.ok(values.includes('unknown') || values.includes('pending') || values.includes('reviewed') || values.includes('blocked') || values.includes('not-recommendable') || values.includes('stale')); }
});
test('rejects malformed structured fingerprints', () => assert.throws(() => validateProfile({ ...base, sourceFingerprint: 'sha256:old' }), /\$\.sourceFingerprint: expected object/));
test('rejects reviewed profiles without sufficient evidence', () => assert.throws(() => validateProfile({ ...base, review: { status: 'reviewed', recommendable: false, evidenceLevel: 'weak' } }), /require sufficient or strong evidence/));
test('requires complete resolved field evidence for recommendable profiles', () => {
  assert.throws(() => validateProfile({ ...base, review: { status: 'pending', recommendable: true, evidenceLevel: 'sufficient' } }), /cannot contain unknown fields/);
  assert.throws(() => validateProfile({ ...base, semantic: resolvedSemantic, review: { status: 'reviewed', recommendable: true, evidenceLevel: 'sufficient' }, evidence: [{ field: 'family', sourceId: 'spdx-license-list', locator: 'license text' }] }), /evidence for every semantic field and review/);
});
test('rejects unresolved fingerprints for reviewed or recommendable profiles', () => {
  const reviewed = { ...base, review: { status: 'reviewed', recommendable: false, evidenceLevel: 'sufficient' }, evidence: [{ field: 'family', sourceId: 'spdx-license-list', locator: 'license text' }] };
  assert.throws(() => validateProfile({ ...reviewed, sourceFingerprint: { ...base.sourceFingerprint, revision: 'unresolved' } }), /\$\.sourceFingerprint\.revision: unresolved/);
  assert.throws(() => validateProfile({ ...reviewed, sourceFingerprint: { ...base.sourceFingerprint, contentHash: 'unresolved' } }), /\$\.sourceFingerprint\.contentHash: unresolved/);
  assert.throws(() => validateProfile({ ...reviewed, semantic: resolvedSemantic, evidence: completeEvidence, review: { status: 'pending', recommendable: true, evidenceLevel: 'sufficient' }, sourceFingerprint: { ...base.sourceFingerprint, revision: 'unresolved' } }), /\$\.sourceFingerprint\.revision: unresolved/);
});
test('rejects an unknown source lock id on gated profiles', () => {
  const profile = { ...base, sourceFingerprint: { ...base.sourceFingerprint, sourceId: 'unknown-source' }, review: { status: 'reviewed', recommendable: false, evidenceLevel: 'sufficient' }, evidence: [{ field: 'family', sourceId: 'spdx-license-list', locator: 'license text' }] };
  assert.throws(() => validateProfile(profile), /\$\.sourceFingerprint\.sourceId: unknown source lock id/);
});
test('enforces schema enum and conditional gate parity', () => {
  assert.doesNotThrow(() => validateContract());
});
test('enforces schema metadata invariants without mutating schema files', () => {
  for (const schemaPath of schemaPaths) {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.doesNotThrow(() => validateSchemaMetadata(schema, schemaPath));
    assert.throws(() => validateSchemaMetadata({ ...schema, $schema: 'http://json-schema.org/draft-07/schema#' }, schemaPath), /\$schema: expected draft 2020-12/);
    assert.throws(() => validateSchemaMetadata({ ...schema, required: ['id'] }, schemaPath), /required: missing schema metadata field/);
    assert.throws(() => validateSchemaMetadata({ ...schema, additionalProperties: true }, schemaPath), /additionalProperties: expected false/);
  }
});
test('provides the release data validation script', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['data:validate:release'], 'node scripts/validate-license-data.mjs --release');
});
test('accepts reviewed field evidence and rejects aggregate evidence', () => {
  const evidence = completeEvidence;
  assert.equal(validateProfile({ ...base, semantic: resolvedSemantic, review: { status: 'reviewed', recommendable: true, evidenceLevel: 'strong' }, evidence }).status, 'reviewed');
  assert.throws(() => validateProfile({ ...base, evidence: { level: 'strong', sources: ['spdx-license-list'] } }), /\$\.evidence: expected array/);
});
test('release validation permits pending auxiliary evidence but blocks unresolved sources used by reviewed profiles', () => {
  const evidence = [{ field: 'family', sourceId: 'choose-a-license', locator: 'profile.permissions' }];
  assert.doesNotThrow(() => validateProfile({ ...base, evidence }, { release: true }));
  assert.throws(() => validateProfile({ ...base, semantic: resolvedSemantic, review: { status: 'reviewed', recommendable: true, evidenceLevel: 'strong' }, evidence: completeEvidence.map(item => ({ ...item, sourceId: 'choose-a-license' })) }, { release: true }), /release refuses unresolved source choose-a-license/);
});
test('keeps exception and license semantic shapes distinct', () => {
  const exception = { ...base, id: 'Exception-1', kind: 'exception', semantic: { exceptionApplicability: 'unknown', permissions: ['unknown'], triggers: ['unknown'], restrictions: ['unknown'] } };
  assert.equal(validateProfile(exception).status, 'pending');
  assert.throws(() => validateProfile({ ...base, semantic: { ...base.semantic, exceptionApplicability: 'unknown' } }), /unknown field/);
  assert.throws(() => validateProfile({ ...exception, semantic: { ...exception.semantic, family: 'unknown' } }), /unknown field/);
});
