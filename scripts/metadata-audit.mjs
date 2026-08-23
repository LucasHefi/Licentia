#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { enumerateSources } from './sync-license-profiles.mjs';
import { validateProfile } from './validate-license-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULTS = { sourceRoot: path.join(ROOT, 'public/data'), profileRoot: path.join(ROOT, 'data/profiles') };
export const RULE_VERSION = 'lic-007-v1';

const unknownLicense = () => ({ family: 'unknown', copyleftScope: 'unknown', permissions: ['unknown'], obligations: ['unknown'], triggers: ['unknown'], restrictions: ['unknown'], patentPosition: 'unknown', noticeBurden: 'unknown' });
const unknownException = () => ({ exceptionApplicability: 'unknown', permissions: ['unknown'], triggers: ['unknown'], restrictions: ['unknown'] });
const sorted = (values) => [...new Set(values)].sort();
const isUnknown = (value) => value === 'unknown' || (Array.isArray(value) && value.length === 1 && value[0] === 'unknown');
const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const hash = (value) => `sha256:${crypto.createHash('sha256').update(canonical(value)).digest('hex')}`;
const safeFilename = (id) => `id-${Buffer.from(id, 'utf8').toString('base64url')}.json`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
/** @typedef {{sourceRoot?: string, profileRoot?: string}} AuditOptions */

function evidence(field, ruleId, sourceId, locator = 'text') {
  return { field, sourceId, locator, ruleId, ruleVersion: RULE_VERSION };
}

export function classifyDetail(detail) {
  const text = typeof detail.text === 'string' ? detail.text : '';
  const lower = text.toLowerCase();
  if (detail.type === 'exception') {
    const semantic = unknownException();
    const evidenceItems = /** @type {Array<Record<string, string>>} */ ([]);
    if (/exception to the terms|special exception|exception to the license/i.test(text)) {
      semantic.exceptionApplicability = 'conditional';
      semantic.triggers = ['combination'];
      evidenceItems.push(evidence('exceptionApplicability', 'lic-007.exception-scope', 'spdx-exception-list'));
      evidenceItems.push(evidence('triggers', 'lic-007.exception-combination', 'spdx-exception-list'));
    }
    return { semantic, evidence: evidenceItems, recommendable: false };
  }
  const semantic = unknownLicense();
  const evidenceItems = /** @type {Array<Record<string, string>>} */ ([]);
  const add = (field, value, ruleId) => { semantic[field] = value; evidenceItems.push(evidence(field, ruleId, 'spdx-license-list')); };
  if (/gnu general public license|gpl/i.test(text) && /copyleft license|same freedoms|corresponding source/i.test(text)) add('family', /network use|remote network interaction/i.test(lower) ? 'network-copyleft' : 'strong-copyleft', 'lic-007.copyleft-family');
  else if (/lesser general public license|lgpl/i.test(text)) add('family', 'weak-copyleft', 'lic-007.copyleft-family');
  else if (/permission is hereby granted|free of charge.*without restriction/i.test(lower)) add('family', 'permissive', 'lic-007.permissive-grant');
  if (/network use|remote network interaction/i.test(lower)) add('copyleftScope', 'network', 'lic-007.network-trigger');
  else if (semantic.family === 'strong-copyleft') add('copyleftScope', 'whole-work', 'lic-007.whole-work-copyleft');
  else if (semantic.family === 'weak-copyleft') add('copyleftScope', 'library', 'lic-007.library-copyleft');
  else if (semantic.family === 'permissive') add('copyleftScope', 'none', 'lic-007.no-copyleft');
  const permissions = /** @type {string[]} */ ([]); if (/without restriction|commercial use|sell/i.test(lower)) permissions.push('commercial-use'); if (/copy|publish|distribute/i.test(lower)) permissions.push('distribution'); if (/modify|change/i.test(lower)) permissions.push('modifications'); if (/private use|private-use/i.test(lower)) permissions.push('private-use'); if (/sublicense/i.test(lower)) permissions.push('sublicensing'); if (/patent license|patent grant/i.test(lower)) permissions.push('patent-grant'); if (permissions.length) add('permissions', sorted(permissions), 'lic-007.explicit-permissions');
  const obligations = /** @type {string[]} */ ([]); if (/copyright notice/i.test(lower)) obligations.push('include-copyright'); if (/permission notice|license text|terms and conditions/i.test(lower)) obligations.push('include-license-text'); if (/source code|corresponding source/i.test(lower)) obligations.push('provide-corresponding-source'); if (/same license|same licence/i.test(lower)) obligations.push('same-license'); if (/mark.*modification|modified files/i.test(lower)) obligations.push('mark-modifications'); if (obligations.length) add('obligations', sorted(obligations), 'lic-007.explicit-obligations');
  const restrictions = /** @type {string[]} */ ([]); if (/without warranty/i.test(lower)) restrictions.push('warranty'); if (/liable|liability/i.test(lower)) restrictions.push('liability'); if (/trademark/i.test(lower)) restrictions.push('trademark'); if (restrictions.length) add('restrictions', sorted(restrictions), 'lic-007.explicit-restrictions');
  if (/patent.*termination|termination.*patent/i.test(lower)) add('patentPosition', 'defensive-termination', 'lic-007.patent-termination'); else if (/patent license|patent grant/i.test(lower)) add('patentPosition', 'express-grant', 'lic-007.patent-grant');
  if (semantic.obligations.includes('include-copyright') || semantic.obligations.includes('include-license-text')) add('noticeBurden', 'standard', 'lic-007.notice-requirement');
  return { semantic, evidence: evidenceItems, recommendable: false };
}

function profilePath(record, profileRoot) { return path.join(profileRoot, `${record.kind}s`, safeFilename(record.id)); }
function profileInfo(record, profileRoot) { const file = profilePath(record, profileRoot); return { file, profile: fs.existsSync(file) ? readJson(file) : null }; }

/** @param {AuditOptions} options */
export function auditCatalog(options = {}) {
  const { sourceRoot, profileRoot } = { ...DEFAULTS, ...options };
  const catalog = enumerateSources({ ...options, sourceRoot });
  const records = catalog.records.map(record => {
    const detail = record.source;
    const classification = classifyDetail(detail);
    const { profile } = profileInfo(record, profileRoot);
    const stale = profile?.sourceFingerprint?.contentHash && profile.sourceFingerprint.contentHash !== record.fingerprint.contentHash;
    return { id: record.id, kind: record.kind, deprecated: detail.deprecated === true, reviewStatus: profile?.review?.status ?? 'pending', stale: Boolean(stale), semantic: classification.semantic, evidence: classification.evidence };
  });
  const licenses = records.filter(record => record.kind === 'license');
  const exceptions = records.filter(record => record.kind === 'exception');
  const coverage = {}; const conflicts = [];
  for (const record of catalog.records) {
    const { profile } = profileInfo(record, profileRoot); const classification = classifyDetail(record.source);
    coverage[record.id] = sorted(classification.evidence.filter(item => profile?.evidence?.some(existing => canonical(existing) === canonical(item))).map(item => item.field));
    for (const item of classification.evidence) {
      const current = profile?.semantic?.[item.field]; const classified = classification.semantic[item.field];
      if (!isUnknown(current) && !isUnknown(classified) && canonical(current) !== canonical(classified)) conflicts.push({ id: record.id, kind: record.kind, field: item.field, existing: current, classified });
    }
  }
  conflicts.sort((a, b) => `${a.kind}:${a.id}:${a.field}`.localeCompare(`${b.kind}:${b.id}:${b.field}`));
  return { ruleVersion: RULE_VERSION, sourceRevision: catalog.revision, sourceHash: hash(records.map(({ id, kind, semantic }) => ({ id, kind, semantic }))), summary: { licenses: licenses.length, exceptions: exceptions.length, total: records.length, pending: licenses.filter(r => r.reviewStatus === 'pending').length, notRecommendable: licenses.filter(r => r.reviewStatus === 'not-recommendable').length, exceptionsRecommendable: 0 }, coverage, conflicts, records, reviewQueue: sorted(records.filter(r => r.kind === 'license' && (r.reviewStatus !== 'reviewed' || r.stale)).map(r => r.id)) };
}

function applyProfiles(report, options) {
  const { sourceRoot, profileRoot } = { ...DEFAULTS, ...options };
  const catalog = enumerateSources({ ...options, sourceRoot });
  const next = /** @type {Array<{file: string, value: any}>} */ ([]);
  const conflicts = /** @type {Array<{id: string, kind: string, field: string, existing: any, classified: any}>} */ ([]);
  const coverage = /** @type {Record<string, string[]>} */ ({});
  for (const record of catalog.records) {
    const { file, profile } = profileInfo(record, profileRoot);
    if (!profile) throw new Error(`missing profile: ${file}`);
    const classification = classifyDetail(record.source);
    const candidate = structuredClone(profile);
    const covered = [];
    for (const item of classification.evidence) {
      const field = item.field; const classified = classification.semantic[field]; const current = candidate.semantic[field];
      if (isUnknown(classified)) continue;
      if (!isUnknown(current) && canonical(current) !== canonical(classified)) { conflicts.push({ id: record.id, kind: record.kind, field, existing: current, classified }); continue; }
      candidate.semantic[field] = classified; covered.push(field);
      if (!candidate.evidence.some(existing => canonical(existing) === canonical(item))) candidate.evidence.push(item);
    }
    candidate.review = { ...candidate.review, recommendable: false };
    if (covered.length && candidate.review.status !== 'reviewed' && candidate.review.evidenceLevel === 'unknown') candidate.review.evidenceLevel = 'weak';
    candidate.evidence.sort((a, b) => canonical(a).localeCompare(canonical(b)));
    coverage[record.id] = sorted(covered);
    next.push({ file, value: candidate });
  }
  conflicts.sort((a, b) => `${a.kind}:${a.id}:${a.field}`.localeCompare(`${b.kind}:${b.id}:${b.field}`));
  return { next, conflicts, coverage };
}

/** @param {AuditOptions} options */
export function writeAudit(options = {}) {
  const report = auditCatalog(options); const { next, conflicts, coverage } = applyProfiles(report, options);
  for (const entry of next) validateProfile(entry.value, { file: entry.file });
  const tempDir = fs.mkdtempSync(path.join(path.dirname(options.profileRoot ?? DEFAULTS.profileRoot), '.metadata-audit-'));
  try {
    for (const entry of next) { const target = path.join(tempDir, path.relative(options.profileRoot ?? DEFAULTS.profileRoot, entry.file)); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(entry.value, null, 2)}\n`); }
    for (const entry of next) { const target = path.join(tempDir, path.relative(options.profileRoot ?? DEFAULTS.profileRoot, entry.file)); fs.renameSync(target, entry.file); }
  } finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
  const result = auditCatalog(options); result.coverage = coverage; result.conflicts = conflicts; return result;
}

function stableValue(value) { return Array.isArray(value) ? `[${value.map(stableValue).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}` : JSON.stringify(value); }
export function stableReport(report) { return `${stableValue(report)}\n`; }

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = process.argv.slice(2); const write = args.includes('--write'); const outIndex = args.indexOf('--out');
    const options = {}; for (const name of ['sourceRoot', 'profileRoot']) { const index = args.indexOf(`--${name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`); if (index >= 0) options[name] = path.resolve(args[index + 1]); }
    const report = write ? writeAudit(options) : auditCatalog(options); const output = outIndex >= 0 ? args[outIndex + 1] : null; if (output) fs.writeFileSync(path.resolve(output), stableReport(report)); else process.stdout.write(stableReport(report));
  } catch (error) { process.stderr.write(`metadata audit failed: ${error.message}\n`); process.exitCode = 1; }
}
