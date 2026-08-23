import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { curate, discoverTargets } from './curate-legacy-profiles.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const targetIds = discoverTargets({ sourceRoot: path.join(root, 'public/data/licenses') }).map(source => source.id);
const profileFile = id => path.join(root, 'data/profiles/licenses', `id-${Buffer.from(id).toString('base64url')}.json`);

test('curates the dynamically discovered legacy batch only and is idempotent', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-004-'));
  const profiles = path.join(temp, 'profiles'); fs.cpSync(path.join(root, 'data/profiles/licenses'), profiles, { recursive: true });
  for (const id of targetIds) {
    const file = path.join(profiles, `id-${Buffer.from(id).toString('base64url')}.json`);
    const value = JSON.parse(fs.readFileSync(file));
    value.evidence = value.evidence.filter(entry => entry.sourceId !== 'spdx-license-list');
    value.review.evidenceLevel = 'unknown';
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  }
  const before = new Map(fs.readdirSync(profiles).map(file => [file, fs.readFileSync(path.join(profiles, file), 'utf8')]));
  const first = curate({ sourceRoot: path.join(root, 'public/data/licenses'), profileRoot: profiles });
  assert.equal(first.targetIds.length, targetIds.length);
  const changed = fs.readdirSync(profiles).filter(file => fs.readFileSync(path.join(profiles, file), 'utf8') !== before.get(file));
  assert.deepEqual(changed.sort(), targetIds.map(id => `id-${Buffer.from(id).toString('base64url')}.json`).sort());
  const second = curate({ sourceRoot: path.join(root, 'public/data/licenses'), profileRoot: profiles, mode: 'check' });
  assert.deepEqual(second.changed, []);
  for (const id of targetIds) {
    const value = JSON.parse(fs.readFileSync(path.join(profiles, `id-${Buffer.from(id).toString('base64url')}.json`)));
     assert.equal(value.review.recommendable, false); assert.ok(['pending', 'stale'].includes(value.review.status)); assert.equal(value.review.evidenceLevel, 'weak');
      const chooseEvidence = value.evidence.filter(entry => entry.sourceId === 'choose-a-license');
      const spdxEvidence = value.evidence.filter(entry => entry.sourceId === 'spdx-license-list');
      const semanticFields = new Set(['family', 'copyleftScope', 'permissions', 'obligations', 'restrictions', 'patentPosition', 'noticeBurden', 'triggers']);
      assert.ok(chooseEvidence.length > 0);
      assert.ok(spdxEvidence.length > 0);
      assert.ok(chooseEvidence.every(entry => entry.locator.startsWith('profile.')));
      assert.ok(spdxEvidence.every(entry => entry.locator === 'text' || entry.locator.startsWith('text.')));
      assert.ok(spdxEvidence.every(entry => semanticFields.has(entry.field)));
      assert.ok(spdxEvidence.some(entry => entry.field === 'permissions'));
      assert.ok(spdxEvidence.some(entry => entry.field === 'obligations'));
      assert.ok(spdxEvidence.some(entry => entry.field === 'restrictions'));
      assert.ok(spdxEvidence.every(entry => entry.field !== 'review'));
      assert.ok(value.evidence.some(entry => entry.sourceId === 'choose-a-license' && entry.locator.startsWith('profile.')));
    assert.ok(!JSON.stringify(value).includes('patent-use')); assert.ok(!JSON.stringify(value).includes('trademark-use'));
  }
});

test('does not change non-target profiles in the repository', () => {
  const all = fs.readdirSync(path.join(root, 'data/profiles/licenses'));
  const targetFiles = new Set(targetIds.map(id => `id-${Buffer.from(id).toString('base64url')}.json`));
  assert.ok(all.some(file => !targetFiles.has(file)));
  for (const file of all.filter(file => !targetFiles.has(file))) assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(root, 'data/profiles/licenses', file))));
});
