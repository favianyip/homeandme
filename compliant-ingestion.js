// Compliant, fail-closed ingestion for public/licensed or owner-authorized design assets.
// This module deliberately does not discover URLs, bypass authentication, or scrape product pages.

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

export const INGEST_SCHEMA = 'hnm-ingested-asset/1';
export const SUPPORTED_FORMATS = Object.freeze(['ifc', 'dxf', 'svg', 'gltf', 'glb', 'usdz', 'json', 'csv']);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const cleanLicense = (value) => typeof value === 'string' && value.trim().length > 0 && !/^(unknown|none|n\/a)$/i.test(value.trim());
const contentType = (response) => (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

export function validateSource(source, policy, now = new Date()) {
  const errors = [];
  let url;
  try { url = new URL(source.url); } catch { errors.push('source.url must be an absolute URL'); }
  if (url && url.protocol !== 'https:') errors.push('only HTTPS sources are allowed');
  const hostRule = url && policy.hosts && policy.hosts[url.hostname];
  if (!hostRule) errors.push('source host is not explicitly allowlisted');
  if (!cleanLicense(source.license) && !source.authorizationId) errors.push('an explicit license or authorizationId is required');
  if (!source.purpose) errors.push('source.purpose is required');
  if (!source.termsUrl) errors.push('source.termsUrl is required');
  if (hostRule && hostRule.pathPrefixes && !hostRule.pathPrefixes.some((p) => url.pathname.startsWith(p))) {
    errors.push('source path is outside the allowlisted prefixes');
  }
  if (source.authorizationExpiresAt && new Date(source.authorizationExpiresAt) <= now) errors.push('source authorization has expired');
  return { ok: errors.length === 0, errors, url, hostRule };
}

function parseRobots(text, userAgent) {
  const groups = [];
  let agents = [], rules = [];
  const flush = () => { if (agents.length) groups.push({ agents, rules }); agents = []; rules = []; };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase(), value = match[2].trim();
    if (key === 'user-agent') { if (rules.length) flush(); agents.push(value.toLowerCase()); }
    else if ((key === 'allow' || key === 'disallow') && agents.length) rules.push({ allow: key === 'allow', path: value });
  }
  flush();
  const ua = userAgent.toLowerCase();
  const selected = groups.filter((g) => g.agents.some((a) => a === '*' || ua.includes(a)));
  return (pathname) => {
    const matches = selected.flatMap((g) => g.rules).filter((r) => r.path && pathname.startsWith(r.path));
    matches.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
    return matches.length ? matches[0].allow : true;
  };
}

const waits = new Map();
async function throttle(host, intervalMs) {
  const wait = Math.max(0, (waits.get(host) || 0) - Date.now());
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  waits.set(host, Date.now() + intervalMs);
}

async function checkedFetch(url, options, maxBytes, fetchImpl) {
  const response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(options.timeoutMs || 20_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url.origin}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared && declared > maxBytes) throw new Error(`asset exceeds ${maxBytes} byte limit`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error(`asset exceeds ${maxBytes} byte limit`);
  return { response, bytes };
}

/** Fetch one pre-declared URL. Set crawl=true only for permissioned crawling; API/file imports need not use robots. */
export async function collectRemote(source, policy, { fetchImpl = fetch, env = process.env, now = new Date() } = {}) {
  const gate = validateSource(source, policy, now);
  if (!gate.ok) throw new Error(`source rejected: ${gate.errors.join('; ')}`);
  const { url, hostRule } = gate;
  const userAgent = policy.userAgent || 'HomeAndMe-CompliantImporter/1.0';
  const headers = { Accept: source.accept || '*/*', 'User-Agent': userAgent };
  if (hostRule.authEnv) {
    if (!env[hostRule.authEnv]) throw new Error(`missing credential environment variable: ${hostRule.authEnv}`);
    headers.Authorization = `${hostRule.authScheme || 'Bearer'} ${env[hostRule.authEnv]}`;
  }
  if (source.crawl) {
    const robotsUrl = new URL('/robots.txt', url);
    const robots = await checkedFetch(robotsUrl, { headers: { 'User-Agent': userAgent }, timeoutMs: policy.timeoutMs }, policy.maxRobotsBytes || 512_000, fetchImpl);
    if (!parseRobots(robots.bytes.toString('utf8'), userAgent)(url.pathname)) throw new Error('robots.txt disallows this crawl path');
  }
  await throttle(url.hostname, hostRule.minIntervalMs ?? policy.minIntervalMs ?? 1000);
  const { response, bytes } = await checkedFetch(url, { headers, timeoutMs: policy.timeoutMs }, hostRule.maxBytes || policy.maxBytes || 50_000_000, fetchImpl);
  return normalizeAsset(bytes, { ...source, mediaType: contentType(response), retrievedAt: now.toISOString(), etag: response.headers.get('etag') });
}

export async function collectLocal(path, source, now = new Date()) {
  if (!cleanLicense(source.license) && !source.authorizationId) throw new Error('an explicit license or authorizationId is required');
  return normalizeAsset(await readFile(path), { ...source, url: source.url || `file:${path}`, filename: source.filename || basename(path), retrievedAt: now.toISOString() });
}

function detectFormat(bytes, meta) {
  const ext = extname(meta.filename || new URL(meta.url).pathname).slice(1).toLowerCase();
  if (SUPPORTED_FORMATS.includes(ext)) return ext;
  if (bytes.subarray(0, 4).toString() === 'glTF') return 'glb';
  if (bytes.subarray(0, 2).toString('hex') === '504b' && /usdz/i.test(meta.mediaType || '')) return 'usdz';
  throw new Error(`unsupported asset format: ${ext || 'unknown'}`);
}

const numbers = (text, pattern) => [...text.matchAll(pattern)].map((m) => Number(m[1])).filter(Number.isFinite);
function summarize(format, bytes) {
  const text = () => bytes.toString('utf8');
  if (format === 'ifc') return { entities: (text().match(/^#\d+\s*=\s*IFC/gim) || []).length, schema: text().match(/FILE_SCHEMA\s*\(\s*\('([^']+)'/i)?.[1] || null };
  if (format === 'dxf') return { entities: (text().match(/\n\s*0\s*\r?\n(?:LINE|LWPOLYLINE|POLYLINE|INSERT)\s*\r?\n/g) || []).length, unitsCode: numbers(text(), /\$INSUNITS\s*\r?\n\s*70\s*\r?\n\s*(-?\d+)/g)[0] ?? null };
  if (format === 'svg') return { elements: (text().match(/<(path|polygon|polyline|line|rect|circle|ellipse)\b/gi) || []).length, viewBox: text().match(/viewBox=["']([^"']+)/i)?.[1] || null };
  if (format === 'gltf' || format === 'json') { const value = JSON.parse(text()); return { rootType: Array.isArray(value) ? 'array' : typeof value, ...(format === 'gltf' ? { assetVersion: value.asset?.version || null, scenes: value.scenes?.length || 0 } : {}) }; }
  if (format === 'glb') return { version: bytes.readUInt32LE(4), declaredLength: bytes.readUInt32LE(8) };
  if (format === 'usdz') return { zipContainer: bytes.subarray(0, 2).toString('hex') === '504b' };
  if (format === 'csv') { const rows = text().trim() ? text().trim().split(/\r?\n/) : []; return { rows: Math.max(0, rows.length - 1), columns: rows[0] ? rows[0].split(',').length : 0 }; }
  return {};
}

export function normalizeAsset(input, meta) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const format = detectFormat(bytes, meta);
  return {
    schema: INGEST_SCHEMA,
    id: `sha256:${sha256(bytes)}`,
    format,
    byteLength: bytes.length,
    provenance: {
      sourceUrl: meta.url,
      license: meta.license || null,
      licenseUrl: meta.licenseUrl || null,
      authorizationId: meta.authorizationId || null,
      termsUrl: meta.termsUrl || null,
      retrievedAt: meta.retrievedAt,
      sha256: sha256(bytes),
      etag: meta.etag || null,
    },
    normalized: summarize(format, bytes),
    original: bytes,
  };
}

export function manifestRecord(asset) {
  const { original, ...record } = asset;
  return record;
}
