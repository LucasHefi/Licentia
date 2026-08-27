#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vocabularyPath = path.join(root, 'data/vocabulary.json');
const topLevel = ['id', 'kind', 'schemaVersion', 'sourceFingerprint', 'review', 'semantic', 'evidence'];
const vocabularyKeys = ['vocabularyVersion', 'reviewStatuses', 'evidenceLevels', 'licenseFamilies', 'copyleftScopes', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPositions', 'noticeBurden', 'exceptionApplicability'];
const licenseFields = ['family', 'copyleftScope', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPosition', 'noticeBurden'];
const exceptionFields = ['exceptionApplicability', 'permissions', 'triggers', 'restrictions'];
const schemaPaths = { license: path.join(root, 'data/schema/license-profile.schema.json'), exception: path.join(root, 'data/schema/license-exception-profile.schema.json') };
const schemaMetadataFields = ['id', 'kind', 'schemaVersion', 'sourceFingerprint', 'review', 'semantic', 'evidence'];

export function fail(message) { throw new Error(message); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function requireObject(value, at) { if (!isObject(value)) fail(`${at}: expected object`); }
function requireString(value, at) { if (typeof value !== 'string' || value.length === 0) fail(`${at}: expected non-empty string`); }
function enumValue(value, values, at) { if (typeof value !== 'string' || !values.includes(value)) fail(`${at}: unknown enum value ${JSON.stringify(value)}`); }
function exactKeys(value, keys, at) { for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${at}.${key}: unknown field`); }
function sortedUnique(values, at) {
  if (!Array.isArray(values)) fail(`${at}: expected array`);
  if (new Set(values).size !== values.length) fail(`${at}: values must be unique`);
  if (values.some((value, index) => index > 0 && values[index - 1] > value)) fail(`${at}: values must be sorted`);
}
function arrayOfEnums(value, values, at) {
  sortedUnique(value, at);
  value.forEach((item, index) => enumValue(item, values, `${at}[${index}]`));
}
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`${file}: invalid JSON (${error.message})`); } }

function validateSchemaGate(schema, trigger, at) {
  const gates = Array.isArray(schema.allOf) ? schema.allOf : [];
  const gate = gates.find(entry => {
    const review = entry?.if?.properties?.review;
    return entry?.if?.required?.includes('review') && review?.required?.includes(trigger) && (trigger === 'status' ? review.properties?.status?.const === 'reviewed' : review.properties?.recommendable?.const === true);
  });
  if (!gate) fail(`${at}.allOf: missing non-vacuous ${trigger} evidence gate`);
  const then = gate.then;
  if (!then?.required?.includes('evidence') || then.properties?.evidence?.minItems !== 1) fail(`${at}.allOf: ${trigger} gate must require evidence minItems 1`);
  if (!then?.required?.includes('review') || !then.properties.review.required?.includes('evidenceLevel') || JSON.stringify(then.properties.review.properties?.evidenceLevel?.enum) !== JSON.stringify(['sufficient', 'strong'])) fail(`${at}.allOf: ${trigger} gate must constrain review evidenceLevel`);
  const fingerprint = then.properties?.sourceFingerprint;
  if (!then.required?.includes('sourceFingerprint') || !fingerprint?.required?.includes('revision') || !fingerprint.required?.includes('contentHash') || fingerprint.properties?.revision?.not?.const !== 'unresolved' || fingerprint.properties?.contentHash?.not?.const !== 'unresolved') fail(`${at}.allOf: ${trigger} gate must reject unresolved fingerprints`);
}

export function validateSchemaMetadata(schema, at) {
  if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') fail(`${at}.$schema: expected draft 2020-12`);
  if (!Array.isArray(schema.required) || !schemaMetadataFields.every(field => schema.required.includes(field))) fail(`${at}.required: missing schema metadata field`);
  if (schema.additionalProperties !== false) fail(`${at}.additionalProperties: expected false`);
}

function validateSchemaContract(kind, vocabulary) {
  const schema = readJson(schemaPaths[kind]);
  validateSchemaMetadata(schema, schemaPaths[kind]);
  const fields = kind === 'license' ? licenseFields : exceptionFields;
  const vocabularyKeysForFields = { family: 'licenseFamilies', copyleftScope: 'copyleftScopes', patentPosition: 'patentPositions' };
  const semantic = schema.$defs?.semantic;
  if (!isObject(semantic) || !isObject(semantic.properties)) fail(`${schemaPaths[kind]}.$defs.semantic: expected semantic properties`);
  for (const field of fields) {
    const property = semantic.properties[field];
    const expected = vocabulary[vocabularyKeysForFields[field] || field];
    const actual = property?.type === 'array' ? property.items?.enum : property?.enum;
    if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${schemaPaths[kind]}.$defs.semantic.properties.${field}: enum drift`);
    if (property?.type === 'array' && property.uniqueItems !== true) fail(`${schemaPaths[kind]}.$defs.semantic.properties.${field}: uniqueItems is required`);
  }
  validateSchemaGate(schema, 'status', schemaPaths[kind]);
  validateSchemaGate(schema, 'recommendable', schemaPaths[kind]);
}

export function validateContract() {
  const vocabulary = readJson(vocabularyPath);
  requireObject(vocabulary, '$'); exactKeys(vocabulary, vocabularyKeys, '$'); requireString(vocabulary.vocabularyVersion, '$.vocabularyVersion');
  for (const key of vocabularyKeys.slice(1)) { sortedUnique(vocabulary[key], `$.${key}`); vocabulary[key].forEach((value, index) => enumValue(value, vocabulary[key], `$.${key}[${index}]`)); }
  const lock = readJson(path.join(root, 'data/sources.lock.json'));
  requireObject(lock, '$'); exactKeys(lock, ['schemaVersion', 'sources'], '$');
  if (lock.schemaVersion !== '1.0.0') fail('$.schemaVersion: unsupported source lock version');
  if (!Array.isArray(lock.sources) || lock.sources.length === 0) fail('$.sources: expected non-empty array');
  const ids = new Set();
  lock.sources.forEach((source, index) => {
    const at = `$.sources[${index}]`; requireObject(source, at); exactKeys(source, ['id', 'identity', 'sourcePaths', 'revision', 'contentHash'], at);
    requireString(source.id, `${at}.id`); if (ids.has(source.id)) fail(`${at}.id: duplicate source id`); ids.add(source.id); requireString(source.identity, `${at}.identity`);
    if (!Array.isArray(source.sourcePaths) || source.sourcePaths.length === 0) fail(`${at}.sourcePaths: expected non-empty array`);
    for (const field of ['revision', 'contentHash']) { requireObject(source[field], `${at}.${field}`); exactKeys(source[field], ['status', 'value', 'reason'], `${at}.${field}`); if (source[field].status !== 'resolved' && source[field].status !== 'unresolved') fail(`${at}.${field}.status: expected resolved or unresolved`); if (source[field].status === 'unresolved') { if (source[field].value !== null) fail(`${at}.${field}.value: unresolved value must be null`); requireString(source[field].reason, `${at}.${field}.reason`); } else requireString(source[field].value, `${at}.${field}.value`); }
  });
  validateSchemaContract('license', vocabulary); validateSchemaContract('exception', vocabulary);
  return { vocabulary, sources: lock.sources };
}

export function validateProfile(profile, { file = '<profile>', vocabulary, sources, release = false } = {}) {
  const contract = vocabulary && sources ? { vocabulary, sources } : validateContract();
  vocabulary ??= contract.vocabulary;
  sources ??= contract.sources;
  requireObject(profile, '$'); exactKeys(profile, topLevel, '$'); requireString(profile.id, '$.id');
  if (!['license', 'exception'].includes(profile.kind)) fail('$.kind: expected "license" or "exception"');
  if (profile.schemaVersion !== '1.0.0') fail('$.schemaVersion: expected "1.0.0"');
  requireObject(profile.sourceFingerprint, '$.sourceFingerprint'); exactKeys(profile.sourceFingerprint, ['sourceId', 'revision', 'contentHash'], '$.sourceFingerprint');
  for (const key of ['sourceId', 'revision', 'contentHash']) requireString(profile.sourceFingerprint[key], `$.sourceFingerprint.${key}`);
  requireObject(profile.review, '$.review'); exactKeys(profile.review, ['status', 'recommendable', 'evidenceLevel'], '$.review');
  enumValue(profile.review.status, vocabulary.reviewStatuses, '$.review.status');
  if (typeof profile.review.recommendable !== 'boolean') fail('$.review.recommendable: expected boolean');
  enumValue(profile.review.evidenceLevel, vocabulary.evidenceLevels, '$.review.evidenceLevel');
  requireObject(profile.semantic, '$.semantic'); const fields = profile.kind === 'license' ? licenseFields : exceptionFields; exactKeys(profile.semantic, fields, '$.semantic');
  for (const field of fields) { const vocabularyKey = field === 'family' ? 'licenseFamilies' : field === 'copyleftScope' ? 'copyleftScopes' : field === 'patentPosition' ? 'patentPositions' : field; if (!(field in profile.semantic)) fail(`$.semantic.${field}: required field`); const value = profile.semantic[field]; if (Array.isArray(value)) arrayOfEnums(value, vocabulary[vocabularyKey], `$.semantic.${field}`); else enumValue(value, vocabulary[vocabularyKey], `$.semantic.${field}`); }
  if (!Array.isArray(profile.evidence)) fail('$.evidence: expected array');
  profile.evidence.forEach((item, index) => { const at = `$.evidence[${index}]`; requireObject(item, at); exactKeys(item, ['field', 'sourceId', 'locator', 'ruleId', 'ruleVersion'], at); requireString(item.field, `${at}.field`); requireString(item.sourceId, `${at}.sourceId`); requireString(item.locator, `${at}.locator`); if (item.ruleId !== undefined || item.ruleVersion !== undefined) { requireString(item.ruleId, `${at}.ruleId`); requireString(item.ruleVersion, `${at}.ruleVersion`); } if (!fields.includes(item.field) && item.field !== 'review') fail(`${at}.field: unknown evidence field`); });
  if (profile.review.recommendable === true) {
    const unresolvedFields = fields.filter(field => {
      const value = profile.semantic[field];
      return value === 'unknown' || (Array.isArray(value) && value.includes('unknown'));
    });
    if (unresolvedFields.length) fail(`$.semantic: recommendable profiles cannot contain unknown fields (${unresolvedFields.join(', ')})`);
    const evidenced = new Set(profile.evidence.map(item => item.field));
    const missingEvidence = [...fields, 'review'].filter(field => !evidenced.has(field));
    if (missingEvidence.length) fail(`$.evidence: recommendable profiles require evidence for every semantic field and review (${missingEvidence.join(', ')})`);
  }
  const gated = profile.review.status === 'reviewed' || profile.review.recommendable === true;
  if (gated) {
    if (!sources.some(source => source.id === profile.sourceFingerprint.sourceId)) fail('$.sourceFingerprint.sourceId: unknown source lock id');
    for (const field of ['revision', 'contentHash']) if (profile.sourceFingerprint[field] === 'unresolved') fail(`$.sourceFingerprint.${field}: unresolved fingerprints are not allowed for reviewed/recommendable profiles`);
  }
  if (gated && !['sufficient', 'strong'].includes(profile.review.evidenceLevel)) fail('$.review.evidenceLevel: reviewed/recommendable profiles require sufficient or strong evidence');
  if (gated && profile.evidence.length === 0) fail('$.evidence: reviewed/recommendable profiles require field-level evidence');
  if (release && gated) {
    const usedSources = new Set([profile.sourceFingerprint.sourceId, ...profile.evidence.map(item => item.sourceId)]);
    for (const sourceId of usedSources) {
      const lock = sources.find(source => source.id === sourceId);
      if (!lock) fail(`$.evidence: source ${sourceId} is missing from the source lock`);
      if (lock.revision.status !== 'resolved' || lock.contentHash.status !== 'resolved') fail(`$.evidence: release refuses unresolved source ${sourceId} for a reviewed/recommendable profile`);
    }
  }
  return { file, id: profile.id, status: profile.review.status };
}

export function validatePaths(paths, options = {}) { const contract = validateContract(options); return paths.map(file => validateProfile(readJson(path.resolve(file)), { ...options, file, vocabulary: contract.vocabulary, sources: contract.sources })); }

if (import.meta.url === `file://${process.argv[1]}`) { try { const args = process.argv.slice(2); const requested = args.filter(arg => arg !== '--release'); const profilePaths = requested.length ? requested : ['licenses', 'exceptions'].flatMap(kind => fs.readdirSync(path.join(root, 'data/profiles', kind)).filter(name => name.endsWith('.json')).map(name => path.join(root, 'data/profiles', kind, name))); validatePaths(profilePaths, { release: args.includes('--release') }); process.stdout.write(`license data contract valid: ${profilePaths.length} profiles${args.includes('--release') ? ' (release)' : ''}\n`); } catch (error) { process.stderr.write(`license data contract invalid: ${error.message}\n`); process.exitCode = 1; } }
