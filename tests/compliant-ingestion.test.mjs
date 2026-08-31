import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRemote, manifestRecord, normalizeAsset, validateSource } from '../compliant-ingestion.js';

const policy = { maxBytes: 1000, hosts: { 'assets.example.test': { pathPrefixes: ['/licensed/'], minIntervalMs: 0 } } };
const source = { url: 'https://assets.example.test/licensed/chair.gltf', license: 'CC-BY-4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', termsUrl: 'https://assets.example.test/terms', purpose: '3D furniture catalog' };

test('source gate rejects unknown hosts and absent licensing', () => {
  const result = validateSource({ url: 'https://coohom.com/private/model.glb', purpose: 'test', termsUrl: 'https://coohom.com/terms' }, policy);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /allowlisted/);
  assert.match(result.errors.join(' '), /license/);
});

test('GLTF normalization records immutable provenance without embedding bytes in manifest', () => {
  const bytes = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, scenes: [{}] }));
  const asset = normalizeAsset(bytes, { ...source, retrievedAt: '2026-08-03T10:00:00.000Z' });
  assert.equal(asset.format, 'gltf');
  assert.equal(asset.normalized.assetVersion, '2.0');
  assert.match(asset.provenance.sha256, /^[a-f0-9]{64}$/);
  assert.equal('original' in manifestRecord(asset), false);
});

test('robots deny aborts crawl before asset request', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    return new Response('User-agent: *\nDisallow: /licensed/', { status: 200, headers: { 'content-type': 'text/plain' } });
  };
  await assert.rejects(collectRemote({ ...source, crawl: true }, policy, { fetchImpl }), /robots.txt disallows/);
  assert.deepEqual(calls, ['https://assets.example.test/robots.txt']);
});

test('approved API file is hashed and normalized', async () => {
  const body = JSON.stringify({ asset: { version: '2.0' }, scenes: [] });
  const fetchImpl = async () => new Response(body, { status: 200, headers: { 'content-type': 'model/gltf+json' } });
  const asset = await collectRemote(source, policy, { fetchImpl, now: new Date('2026-08-03T10:00:00Z') });
  assert.equal(asset.byteLength, Buffer.byteLength(body));
  assert.equal(asset.provenance.retrievedAt, '2026-08-03T10:00:00.000Z');
});

test('IFC, DXF, SVG, GLB, USDZ, JSON and CSV adapters recognize their inputs', () => {
  const fixtures = [
    ['x.ifc', "ISO-10303-21;\nFILE_SCHEMA(('IFC4'));\n#1=IFCWALL();", 'ifc'],
    ['x.dxf', '0\nSECTION\n0\nLINE\n0\nENDSEC', 'dxf'],
    ['x.svg', '<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>', 'svg'],
    ['x.glb', Buffer.from('676c5446020000000c000000', 'hex'), 'glb'],
    ['x.usdz', Buffer.from('504b0304', 'hex'), 'usdz'],
    ['x.json', '{"walls":[]}', 'json'],
    ['x.csv', 'id,name\n1,chair', 'csv'],
  ];
  for (const [filename, bytes, expected] of fixtures) {
    assert.equal(normalizeAsset(Buffer.from(bytes), { filename, url: `file:${filename}`, license: 'test', retrievedAt: 'now' }).format, expected);
  }
});
