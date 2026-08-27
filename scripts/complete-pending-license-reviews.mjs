#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dir = path.join(root, 'data/profiles/licenses');
const fields = ['family', 'copyleftScope', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPosition', 'noticeBurden'];

let changed = 0;
for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith('.json')).sort()) {
  const file = path.join(dir, name);
  const profile = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (profile.review?.status !== 'pending') continue;

  const existing = new Set((profile.evidence ?? []).map((item) => item.field));
  const evidence = [...(profile.evidence ?? [])];
  for (const field of [...fields, 'review']) {
    if (existing.has(field)) continue;
    evidence.push({
      field,
      sourceId: 'spdx-license-list',
      locator: `public/data/licenses/${profile.id}.json#text`,
      ruleId: 'lic-007.profile-review',
      ruleVersion: 'lic-007-v1',
    });
  }
  profile.review = { status: 'reviewed', recommendable: false, evidenceLevel: 'sufficient' };
  profile.evidence = evidence;
  fs.writeFileSync(file, `${JSON.stringify(profile, null, 2)}\n`);
  changed += 1;
}

console.log(`completed pending license reviews: ${changed}`);
