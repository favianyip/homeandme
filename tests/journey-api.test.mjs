import assert from 'node:assert/strict';
import test from 'node:test';

import { HomeAndMeProjectApi, journeyConfig, pollJob } from '../journey-api.js';

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}

test('configured API enables only real service-backed capabilities', () => {
  const config = journeyConfig(
    { search: '?api=https%3A%2F%2Fevil.example' },
    { apiBaseUrl: 'https://staging.example', flags: { AI_ANALYSIS_ENABLED: true, DEMO_FALLBACK_ENABLED: true } },
  );
  assert.equal(config.apiBaseUrl, 'https://staging.example');
  assert.equal(config.flags.AI_ANALYSIS_ENABLED, true);
  assert.equal(config.flags.DEMO_FALLBACK_ENABLED, true);
});

test('client persists only the project ID and relies on an HttpOnly cookie', async () => {
  const requests = [];
  let receiver;
  const fetchImpl = async function (url, init) {
    receiver = this;
    requests.push({ url, init });
    if (url.endsWith('/api/v1/projects')) return response(201, { projectId: 'HNM-1', guestToken: 'secret' });
    return response(200, { projectId: 'HNM-1', state: 'DRAFT' });
  };
  const api = new HomeAndMeProjectApi({ baseUrl: 'https://api.example', fetchImpl, storage: memoryStorage() });
  await api.createProject('hdb', null, 1);
  await api.project();
  assert.equal(requests[1].init.headers.Authorization, undefined);
  assert.equal(requests[1].init.credentials, 'include');
  assert.equal(receiver, globalThis);
  assert.deepEqual(api.session, { projectId: 'HNM-1' });
  assert.equal(requests[1].url, 'https://api.example/api/v1/projects/HNM-1');
});

test('polling returns only after server completion', async () => {
  const statuses = ['queued', 'running', 'completed'];
  const seen = [];
  const api = { job: async () => ({ status: statuses.shift(), progressPercentage: seen.length * 50 }) };
  const result = await pollJob(api, 'job-1', (job) => seen.push(job.status), { intervalMs: 1, timeoutMs: 100 });
  assert.equal(result.status, 'completed');
  assert.deepEqual(seen, ['queued', 'running', 'completed']);
});

test('client rejects a signed artifact URL on another origin', async () => {
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async (url) => response(200, url.includes('signed-url') ? { url: 'https://evil.example/model.glb' } : {}),
  });
  api._saveSession({ projectId: 'HNM-1' });
  await assert.rejects(() => api.artifactBytes('approved_model_glb', 'model/gltf-binary'), /rejected/);
});

test('client surfaces fail-closed API errors', async () => {
  const api = new HomeAndMeProjectApi({
    baseUrl: 'https://api.example', storage: memoryStorage(),
    fetchImpl: async () => response(409, { detail: 'approve a design before checkout' }),
  });
  api._saveSession({ projectId: 'HNM-1' });
  await assert.rejects(() => api.checkout('attempt-1'), /approve a design/);
});
