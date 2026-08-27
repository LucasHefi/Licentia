#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LICENSE_DIR = path.join(ROOT, 'public/data/licenses');
const PROFILE_DIR = path.join(ROOT, 'data/profiles/licenses');
const UNKNOWN = 'unknown';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function profileFilename(id) { return `id-${Buffer.from(id, 'utf8').toString('base64url')}.json`; }
function sorted(values) { return [...new Set(values)].sort(); }
function withUnknown(values) { return values.length ? sorted(values) : [UNKNOWN]; }

const permissionValues = new Set(['commercial-use', 'distribution', 'modifications', 'private-use', 'sublicensing']);
const conditionValues = new Map([
  ['include-copyright', 'include-copyright'], ['document-changes', 'mark-modifications'],
  ['disclose-source', 'disclose-source'], ['network-use-disclose', 'network-use-disclose'],
  ['same-license', 'same-license'], ['same-license--library', 'same-license'], ['same-license--file', 'same-license'],
]);
const limitationValues = new Map([['liability', 'liability'], ['warranty', 'warranty'], ['trademark-use', 'trademark']]);

function mapped(values, mapping) {
  const result = []; let unsupported = false;
  for (const value of Array.isArray(values) ? values : []) {
    const mappedValue = mapping instanceof Map ? mapping.get(value) : mapping.has(value) ? value : undefined;
    if (mappedValue) result.push(mappedValue); else unsupported = true;
  }
  if (unsupported || result.length === 0) result.push(UNKNOWN);
  return sorted(result);
}

function sourceText(source) { return typeof source.text === 'string' ? source.text.toLowerCase() : ''; }

function semanticFromSpdx(source, existing) {
  const profile = source.profile;
  const text = sourceText(source);
  const semantic = { ...existing.semantic };
  semantic.permissions = mapped(profile.permissions, permissionValues);
  semantic.obligations = mapped(profile.conditions, conditionValues);
  semantic.restrictions = mapped(profile.limitations, limitationValues);

  if (/strongest copyleft|strong copyleft/.test(text)) semantic.family = 'strong-copyleft';
  else if (/weak copyleft/.test(text)) semantic.family = 'weak-copyleft';
  else if (/public domain/.test(text)) semantic.family = 'public-domain-equivalent';
  else if (/permissive license/.test(text)) semantic.family = 'permissive';

  if (/used to provide a service over a network|network.*source code/.test(text)) semantic.copyleftScope = 'network';
  else if (/licensed files|files added in the larger work/.test(text)) semantic.copyleftScope = 'file';
  else if (/through interfaces provided by the licensed work/.test(text)) semantic.copyleftScope = 'library';
  else if (/larger works using a licensed work|larger works may be distributed/.test(text) && semantic.family === 'strong-copyleft') semantic.copyleftScope = 'whole-work';

  if (/express grant of patent rights/.test(text)) semantic.patentPosition = 'express-grant';
  if (/copyright and license notices must be preserved/.test(text)) semantic.noticeBurden = 'standard';
  else if (/without requirements to include the copyright notice|no conditions whatsoever/.test(text)) semantic.noticeBurden = 'none';

  const triggers = [];
  if (profile.conditions?.includes('document-changes')) triggers.push('modification');
  if (profile.conditions?.includes('disclose-source') || profile.conditions?.includes('same-license')) triggers.push('distribution');
  if (profile.conditions?.includes('network-use-disclose')) triggers.push('network-use');
  semantic.triggers = withUnknown(triggers);
  return semantic;
}

function spdxEvidence(source) {
  return typeof source.text === 'string' && source.text.length > 0
    ? ['permissions', 'obligations', 'restrictions'].map(field => ({ field, sourceId: 'spdx-license-list', locator: 'text' }))
    : [];
}

function legacyEvidence(semantic, source) {
  const evidence = [];
  const profile = source.profile ?? {};
  const add = (field, locator, supported) => {
    if (supported && semantic[field] !== UNKNOWN && !(Array.isArray(semantic[field]) && semantic[field].every(value => value === UNKNOWN))) {
      evidence.push({ field, sourceId: 'choose-a-license', locator });
    }
  };
  add('family', 'profile.description', typeof profile.description === 'string');
  add('copyleftScope', 'profile.description', typeof profile.description === 'string');
  add('patentPosition', 'profile.description', typeof profile.description === 'string');
  add('noticeBurden', /include-copyright/.test(JSON.stringify(profile.conditions ?? [])) ? 'profile.conditions' : 'profile.description', typeof profile.description === 'string');
  add('triggers', 'profile.conditions', Array.isArray(profile.conditions) && profile.conditions.length > 0);
  return evidence;
}

export function discoverTargets({ sourceRoot = LICENSE_DIR } = {}) {
  return fs.readdirSync(sourceRoot).filter(name => name.endsWith('.json')).sort().map(name => {
    const source = readJson(path.join(sourceRoot, name));
    if (source.type !== 'license' || typeof source.id !== 'string') return null;
    return source.profile && typeof source.profile === 'object' && !Array.isArray(source.profile) && Object.keys(source.profile).length > 0 ? source : null;
  }).filter(Boolean);
}

export function curate({ sourceRoot = LICENSE_DIR, profileRoot = PROFILE_DIR, mode = 'write' } = {}) {
  if (!['write', 'check'].includes(mode)) throw new Error(`unknown mode: ${mode}`);
  const targets = discoverTargets({ sourceRoot });
  if (!targets.length) throw new Error('no legacy targets discovered');
  const changed = [];
  for (const source of targets) {
    const file = path.join(profileRoot, profileFilename(source.id));
    if (!fs.existsSync(file)) throw new Error(`${source.id}: missing legacy profile`);
    const existing = readJson(file);
    if (existing.id !== source.id || existing.kind !== 'license') throw new Error(`${source.id}: profile identity mismatch`);
    // Legacy evidence may have been normalized to a resolved SPDX source during
    // release curation. Reconstruct the legacy evidence from the source profile
    // below instead of requiring an unresolved choose-a-license entry to exist.
    const semantic = semanticFromSpdx(source, existing);
    const evidence = existing.evidence.filter(item => item.sourceId !== 'spdx-license-list');
    const next = { ...existing, semantic, review: { status: ['reviewed', 'stale'].includes(existing.review.status) ? 'stale' : 'pending', recommendable: false, evidenceLevel: 'weak' }, evidence: [...evidence, ...legacyEvidence(semantic, source), ...spdxEvidence(source)] };
    const uniqueEvidence = next.evidence.filter((entry, index, all) => all.findIndex(candidate => JSON.stringify(candidate) === JSON.stringify(entry)) === index);
    next.evidence = uniqueEvidence;
    if (JSON.stringify(existing) !== JSON.stringify(next)) changed.push(source.id);
    if (mode === 'write' && JSON.stringify(existing) !== JSON.stringify(next)) writeJson(file, next);
  }
  return { targetIds: targets.map(source => source.id), changed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { const result = curate({ mode: process.argv.includes('--check') ? 'check' : 'write' }); process.stdout.write(`curated ${result.targetIds.length} legacy profiles; changed ${result.changed.length}\n`); }
  catch (error) { process.stderr.write(`legacy curation failed: ${error.message}\n`); process.exitCode = 1; }
}
