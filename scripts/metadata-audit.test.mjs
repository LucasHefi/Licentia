import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditCatalog, classifyDetail, stableReport, writeAudit } from './metadata-audit.mjs';

test('audits the complete SPDX catalog and keeps output deterministic', () => {
  const first = auditCatalog();
  const second = auditCatalog();
  assert.deepEqual(first.summary, { licenses: 727, exceptions: 84, total: 811, pending: 695, notRecommendable: 32, exceptionsRecommendable: 0 });
  assert.equal(first.summary.pending + first.summary.notRecommendable, 727);
  assert.equal(first.summary.exceptionsRecommendable, 0);
  assert.equal(stableReport(first), stableReport(second));
  assert.match(stableReport(first), /"ruleVersion":"lic-007-v1"/);
});

test('classifies only explicit canonical text and records field evidence', () => {
  const mit = classifyDetail({ id: 'MIT', type: 'license', text: 'Permission is hereby granted to use, copy, modify, merge, publish, distribute, sublicense, and/or sell. The copyright notice and permission notice shall be included. WITHOUT WARRANTY.' });
  assert.equal(mit.semantic.family, 'permissive');
  assert.ok(mit.semantic.permissions.includes('commercial-use'));
  assert.ok(mit.evidence.every((item) => item.ruleId.startsWith('lic-007.') && item.ruleVersion === 'lic-007-v1'));
  const ambiguous = classifyDetail({ id: 'X', type: 'license', text: 'This license permits some uses.' });
  assert.equal(ambiguous.semantic.family, 'unknown');
  const exception = classifyDetail({ id: 'E', type: 'exception', text: 'An exception to the terms of the GNU General Public License.' });
  assert.equal(exception.recommendable, false);
  assert.equal(exception.semantic.exceptionApplicability, 'conditional');
  assert.equal(exception.evidence[0].sourceId, 'spdx-exception-list');
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-007-audit-'));
  const sourceRoot = path.join(root, 'source');
  const profileRoot = path.join(root, 'profiles');
  fs.mkdirSync(path.join(sourceRoot, 'licenses'), { recursive: true });
  fs.mkdirSync(path.join(sourceRoot, 'exceptions'), { recursive: true });
  fs.mkdirSync(path.join(profileRoot, 'licenses'), { recursive: true });
  fs.mkdirSync(path.join(profileRoot, 'exceptions'), { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, 'manifest.json'), JSON.stringify({ licenses: 1, exceptions: 1 }));
  const write = (dir, value) => fs.writeFileSync(path.join(sourceRoot, dir, `id-${Buffer.from(value.id).toString('base64url')}.json`), JSON.stringify(value));
  write('licenses', { id: 'MIT', type: 'license', text: 'Permission is hereby granted without restriction. Copyright notice. WITHOUT WARRANTY.' });
  write('exceptions', { id: 'E', type: 'exception', text: 'An exception to the terms of the license.' });
  const skeleton = (id, kind, semantic) => ({ id, kind, schemaVersion: '1.0.0', sourceFingerprint: { sourceId: kind === 'license' ? 'spdx-license-list' : 'spdx-exception-list', revision: 'old', contentHash: 'old' }, review: { status: 'pending', recommendable: false, evidenceLevel: 'unknown' }, semantic, evidence: [] });
  fs.writeFileSync(path.join(profileRoot, 'licenses', 'id-TUlU.json'), JSON.stringify(skeleton('MIT', 'license', { family: 'unknown', copyleftScope: 'unknown', permissions: ['unknown'], obligations: ['unknown'], triggers: ['unknown'], restrictions: ['unknown'], patentPosition: 'unknown', noticeBurden: 'unknown' }), null, 2) + '\n');
  fs.writeFileSync(path.join(profileRoot, 'exceptions', 'id-RQ.json'), JSON.stringify(skeleton('E', 'exception', { exceptionApplicability: 'unknown', permissions: ['unknown'], triggers: ['unknown'], restrictions: ['unknown'] }), null, 2) + '\n');
  return { sourceRoot, profileRoot };
}

test('write mode classifies vocabulary-valid values, preserves conflicts, and is idempotent', () => {
  const options = fixture();
  const first = writeAudit(options);
  assert.equal(first.conflicts.length, 0);
  const exception = JSON.parse(fs.readFileSync(path.join(options.profileRoot, 'exceptions', 'id-RQ.json')));
  assert.equal(exception.semantic.exceptionApplicability, 'conditional');
  assert.equal(exception.review.recommendable, false);
  assert.ok(exception.evidence.every(item => item.sourceId === 'spdx-exception-list'));
  const before = fs.readFileSync(path.join(options.profileRoot, 'licenses', 'id-TUlU.json'));
  const second = writeAudit(options);
  const after = fs.readFileSync(path.join(options.profileRoot, 'licenses', 'id-TUlU.json'));
  assert.deepEqual(after, before);
  assert.deepEqual(second.conflicts, first.conflicts);
});

test('write mode reports and preserves curated conflicts without recommending', () => {
  const options = fixture();
  const file = path.join(options.profileRoot, 'licenses', 'id-TUlU.json');
  const profile = JSON.parse(fs.readFileSync(file));
  profile.semantic.family = 'nonstandard';
  profile.review = { status: 'reviewed', recommendable: true, evidenceLevel: 'strong' };
  fs.writeFileSync(file, JSON.stringify(profile, null, 2) + '\n');
  const report = writeAudit(options);
  assert.ok(report.conflicts.some(item => item.id === 'MIT' && item.field === 'family'));
  const result = JSON.parse(fs.readFileSync(file));
  assert.equal(result.semantic.family, 'nonstandard');
  assert.equal(result.review.recommendable, false);
  assert.equal(result.review.evidenceLevel, 'strong');
});
