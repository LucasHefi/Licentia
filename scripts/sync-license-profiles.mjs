#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateProfile } from './validate-license-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULTS = { root: ROOT, sourceRoot: path.join(ROOT, 'public/data'), profileRoot: path.join(ROOT, 'data/profiles') };

function fail(message) { throw new Error(message); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function hash(value) { return `sha256:${crypto.createHash('sha256').update(canonical(value)).digest('hex')}`; }
function readJson(file, label = file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${label}: invalid JSON (${error.message})`); }
}
function safeFilename(id) {
  if (typeof id !== 'string' || !id || id === '.' || id === '..' || id.includes('/') || id.includes('\\') || id.includes('\0')) fail(`source id ${JSON.stringify(id)}: unsafe path segment`);
  return `id-${Buffer.from(id, 'utf8').toString('base64url')}.json`;
}
function sourceFiles(dir, kind) {
  if (!fs.existsSync(dir)) fail(`${kind}: missing source directory ${dir}`);
  return fs.readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isFile()).sort((a, b) => a.name.localeCompare(b.name)).map(entry => path.join(dir, entry.name));
}

export function enumerateSources(options = {}) {
  const { sourceRoot, manifestPath = path.join(sourceRoot, 'manifest.json') } = { ...DEFAULTS, ...options };
  const manifest = readJson(manifestPath, 'manifest.json');
  if (!manifest || typeof manifest !== 'object') fail('manifest.json: expected object');
  const revision = `manifest-sha256:${hash(manifest).slice(7)}`;
  const records = [];
  const ids = new Map();
  for (const [kind, directory] of [['license', 'licenses'], ['exception', 'exceptions']]) {
    const files = sourceFiles(path.join(sourceRoot, directory), kind);
    for (const file of files) {
      const source = readJson(file, file);
      if (!source || typeof source !== 'object' || Array.isArray(source)) fail(`${file}: expected JSON object`);
      if (source.type !== kind) fail(`${file}.type: unknown source kind ${JSON.stringify(source.type)}`);
      if (typeof source.id !== 'string' || !source.id) fail(`${file}.id: missing source ID`);
      const previous = ids.get(source.id);
      if (previous) fail(`${file}.id: duplicate source ID ${JSON.stringify(source.id)} (also ${previous})`);
      ids.set(source.id, file);
      records.push({ id: source.id, kind, source, file, filename: safeFilename(source.id), fingerprint: { sourceId: kind === 'license' ? 'spdx-license-list' : 'spdx-exception-list', revision, contentHash: hash(source) } });
    }
  }
  for (const [kind, key] of [['license', 'licenses'], ['exception', 'exceptions']]) {
    if (manifest[key] !== undefined && manifest[key] !== records.filter(record => record.kind === kind).length) fail(`manifest.${key}: expected ${manifest[key]} source files, discovered ${records.filter(record => record.kind === kind).length}`);
  }
  const filenames = new Map();
  for (const record of records) { if (filenames.has(record.filename)) fail(`${record.file}.id: filename collision with ${filenames.get(record.filename)}`); filenames.set(record.filename, record.id); }
  return { manifest, revision, records: records.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)) };
}

function unknownSemantic(kind) {
  return kind === 'license'
    ? { family: 'unknown', copyleftScope: 'unknown', permissions: ['unknown'], obligations: ['unknown'], triggers: ['unknown'], restrictions: ['unknown'], patentPosition: 'unknown', noticeBurden: 'unknown' }
    : { exceptionApplicability: 'unknown', permissions: ['unknown'], triggers: ['unknown'], restrictions: ['unknown'] };
}
const LEGACY_PERMISSION_VALUES = new Set(['commercial-use', 'distribution', 'modifications', 'patent-grant', 'private-use', 'sublicensing']);
const LEGACY_CONDITION_VALUES = new Map([
  ['include-copyright', 'include-copyright'], ['document-changes', 'mark-modifications'],
  ['disclose-source', 'disclose-source'], ['network-use-disclose', 'network-use-disclose'],
  ['same-license', 'same-license'], ['same-license--library', 'same-license'], ['same-license--file', 'same-license'],
]);
const LEGACY_LIMITATION_VALUES = new Map([['liability', 'liability'], ['warranty', 'warranty'], ['trademark-use', 'trademark']]);
function mappedLegacyValues(values, vocabulary, mapping) {
  const result = new Set(); let unsupported = false;
  for (const value of Array.isArray(values) ? values : []) {
    const mapped = mapping instanceof Map ? mapping.get(value) : vocabulary.has(value) ? value : undefined;
    if (mapped) result.add(mapped); else unsupported = true;
  }
  if (unsupported || result.size === 0) result.add('unknown');
  return [...result].sort();
}
function migratedLegacyProfile(record, base) {
  const legacy = record.source.profile;
  if (record.kind !== 'license' || !legacy || typeof legacy !== 'object') return base;
  const conditions = Array.isArray(legacy.conditions) ? legacy.conditions : [];
  const scopeCondition = conditions.find(value => value === 'same-license--library' || value === 'same-license--file');
  const semantic = {
    ...base.semantic,
    permissions: mappedLegacyValues(legacy.permissions, LEGACY_PERMISSION_VALUES, undefined),
    obligations: mappedLegacyValues(conditions, null, LEGACY_CONDITION_VALUES),
    restrictions: mappedLegacyValues(legacy.limitations, null, LEGACY_LIMITATION_VALUES),
  };
  const evidence = [
    { field: 'permissions', sourceId: 'choose-a-license', locator: 'profile.permissions' },
    { field: 'obligations', sourceId: 'choose-a-license', locator: 'profile.conditions' },
    { field: 'restrictions', sourceId: 'choose-a-license', locator: 'profile.limitations' },
  ];
  if (scopeCondition) {
    semantic.copyleftScope = scopeCondition.slice('same-license--'.length);
    semantic.obligations = [...new Set([...semantic.obligations, 'same-license'])].sort();
    evidence.push({ field: 'copyleftScope', sourceId: 'choose-a-license', locator: 'profile.conditions' });
  }
  return { ...base, sourceFingerprint: record.fingerprint, review: { status: 'pending', recommendable: false, evidenceLevel: 'unknown' }, semantic, evidence };
}
function isUntouchedPendingSkeleton(profile) {
  return profile?.review?.status === 'pending' && profile.review.recommendable === false
    && profile.review.evidenceLevel === 'unknown' && Array.isArray(profile.evidence) && profile.evidence.length === 0
    && canonical(profile.semantic) === canonical(unknownSemantic(profile.kind));
}
export function profileFor(record, existing) {
  const sameFingerprint = existing?.sourceFingerprint?.sourceId === record.fingerprint.sourceId && existing?.sourceFingerprint?.revision === record.fingerprint.revision && existing?.sourceFingerprint?.contentHash === record.fingerprint.contentHash;
  if (record.source.profile && (!existing || (sameFingerprint && isUntouchedPendingSkeleton(existing)))) {
    return migratedLegacyProfile(record, existing ?? { id: record.id, kind: record.kind, schemaVersion: '1.0.0', sourceFingerprint: record.fingerprint, review: { status: 'pending', recommendable: false, evidenceLevel: 'unknown' }, semantic: unknownSemantic(record.kind), evidence: [] });
  }
  if (existing && sameFingerprint && record.source.deprecated !== true) return existing;
  if (existing) return { ...existing, id: record.id, kind: record.kind, schemaVersion: '1.0.0', sourceFingerprint: record.fingerprint, review: { ...existing.review, status: record.source.deprecated === true ? 'not-recommendable' : existing.review?.status === 'pending' ? 'pending' : 'stale', recommendable: false } };
  const deprecated = record.source.deprecated === true;
  return { id: record.id, kind: record.kind, schemaVersion: '1.0.0', sourceFingerprint: record.fingerprint, review: { status: deprecated ? 'not-recommendable' : 'pending', recommendable: false, evidenceLevel: 'unknown' }, semantic: unknownSemantic(record.kind), evidence: [] };
}
function profilePath(record, profileRoot) { return path.join(profileRoot, `${record.kind}s`, record.filename); }
function existingProfiles(profileRoot) {
  const result = new Map();
  for (const kind of ['license', 'exception']) {
    const dir = path.join(profileRoot, `${kind}s`); if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) if (entry.isFile() && entry.name.endsWith('.json')) result.set(path.join(`${kind}s`, entry.name), { file: path.join(dir, entry.name), value: readJson(path.join(dir, entry.name)) });
  }
  return result;
}
export function sync({ mode = 'check', ...options } = {}) {
  if (!['check', 'write'].includes(mode)) fail(`unknown mode ${mode}`);
  const { profileRoot } = { ...DEFAULTS, ...options };
  const catalog = enumerateSources(options); const old = existingProfiles(profileRoot); const expected = new Map(); const problems = []; const hardProblems = [];
  for (const record of catalog.records) expected.set(path.join(`${record.kind}s`, record.filename), record);
  for (const [relative, entry] of old) {
    try { validateProfile(entry.value, { file: entry.file }); } catch (error) { hardProblems.push(`${relative}: invalid profile (${error.message})`); }
  }
  const orphanProblems = [...old.keys()].filter(relative => !expected.has(relative)).map(relative => `${relative}: orphan profile (not deleted; remove explicitly after review)`);
  if (mode === 'write' && (hardProblems.length || orphanProblems.length)) fail([...hardProblems, ...orphanProblems].join('\n'));
  for (const record of catalog.records) {
    const relative = path.join(`${record.kind}s`, record.filename);
    const target = profilePath(record, profileRoot); let existing;
    if (fs.existsSync(target)) existing = old.get(relative)?.value;
    if (hardProblems.some(problem => problem.startsWith(`${relative}:`))) existing = undefined;
    const profile = profileFor(record, existing);
    if (!existing) problems.push(`${relative}: missing profile`);
    else if (canonical(existing) !== canonical(profile)) problems.push(`${relative}: changed profile`);
    if (mode === 'write' && canonical(existing ?? {}) !== canonical(profile)) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(profile, null, 2)}\n`); }
  }
  problems.push(...orphanProblems);
  const allProblems = [...hardProblems, ...problems];
  if (allProblems.length && mode === 'check') fail(allProblems.join('\n'));
  if (mode === 'write') {
    const checked = sync({ mode: 'check', ...options });
    return { ...catalog, expected: expected.size, problems: checked.problems };
  }
  return { ...catalog, expected: expected.size, problems: allProblems };
}
function help() { return 'Usage: node scripts/sync-license-profiles.mjs [--check|--write|--help]\n--check  verify profiles without writing (default)\n--write  create/update profiles without deleting orphans'; }
if (import.meta.url === `file://${process.argv[1]}`) {
  try { const args = process.argv.slice(2); if (args.includes('--help')) process.stdout.write(`${help()}\n`); else { const mode = args.includes('--write') ? 'write' : 'check'; const result = sync({ mode }); process.stdout.write(`catalog profiles ${mode} valid: ${result.records.filter(r => r.kind === 'license').length} licenses, ${result.records.filter(r => r.kind === 'exception').length} exceptions\n`); if (result.problems.length) process.stderr.write(`${result.problems.join('\n')}\n`); } }
  catch (error) { process.stderr.write(`profile sync failed: ${error.message}\n`); process.exitCode = 1; }
}
