import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.mjs';

const env = {
  SYNC_TOKEN: 'test-secret',
  DAV_FILE_URL: 'https://dav.jianguoyun.com/dav/StarLedger/StarLedger-backup.zip',
  DAV_USERNAME: 'test@example.com',
  DAV_PASSWORD: 'application-password'
};
const base = 'https://example.workers.dev';
const origin = 'https://no3456bite.github.io';
const headers = { Origin: origin, Authorization: 'Bearer test-secret' };
const originalFetch = globalThis.fetch;
let call;
globalThis.fetch = async (url, options) => {
  call = { url: String(url), ...options };
  if (options.method === 'HEAD') return new Response(null, { status: 404 });
  if (options.method === 'PUT') return new Response(null, { status: 201 });
  return new Response(new Uint8Array([0x50, 0x4b]), { status: 200 });
};
try {
  let response = await worker.fetch(new Request(base + '/status', { headers: { Origin: 'https://evil.example', Authorization: 'Bearer test-secret' } }), env);
  assert.equal(response.status, 403);
  response = await worker.fetch(new Request(base + '/status', { headers: { Origin: origin } }), env);
  assert.equal(response.status, 401);
  response = await worker.fetch(new Request(base + '/status', { headers }), env);
  assert.deepEqual(await response.json(), { exists: false });
  assert.equal(call.url, env.DAV_FILE_URL);
  assert.equal(call.method, 'HEAD');
  response = await worker.fetch(new Request(base + '/backup', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/zip' }, body: new Uint8Array([0x50, 0x4b]) }), env);
  assert.equal(response.status, 200);
  assert.equal(call.method, 'PUT');
  response = await worker.fetch(new Request(base + '/backup', { headers }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/zip');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [0x50, 0x4b]);
  response = await worker.fetch(new Request(base + '/backup', { headers }), { ...env, DAV_FILE_URL: 'https://evil.example/backup.zip' });
  assert.equal(response.status, 503);
  console.log('Cloudflare Worker relay tests passed.');
} finally {
  globalThis.fetch = originalFetch;
}
