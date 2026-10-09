// StarLedger manual backup relay. Configure all values as Worker secrets.
const allowOrigin = 'https://no3456bite.github.io';
const cors = {
  'Access-Control-Allow-Origin': allowOrigin,
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Cache-Control': 'no-store',
  Vary: 'Origin'
};

function reply(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { ...cors, ...extra } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.headers.get('Origin') && request.headers.get('Origin') !== allowOrigin) return reply('Origin not allowed', 403);
    if (request.method === 'OPTIONS') return reply(null, 204);
    if (!env.SYNC_TOKEN || !env.DAV_FILE_URL || !env.DAV_USERNAME || !env.DAV_PASSWORD) return reply('Worker secrets are incomplete', 503);
    if (request.headers.get('Authorization') !== `Bearer ${env.SYNC_TOKEN}`) return reply('Unauthorized', 401);
    if (!['/status', '/backup'].includes(url.pathname) || url.search) return reply('Not found', 404);
    let target;
    try {
      target = new URL(env.DAV_FILE_URL);
      if (target.protocol !== 'https:' || target.hostname !== 'dav.jianguoyun.com' || !target.pathname.startsWith('/dav/') || !target.pathname.endsWith('.zip') || target.search || target.hash) throw Error();
    } catch { return reply('Invalid DAV_FILE_URL', 503); }
    const basic = btoa(String.fromCharCode(...new TextEncoder().encode(`${env.DAV_USERNAME}:${env.DAV_PASSWORD}`)));
    const headers = { Authorization: `Basic ${basic}` };
    const method = url.pathname === '/status' ? 'HEAD' : request.method;
    if (!['GET', 'HEAD', 'PUT'].includes(method)) return reply('Method not allowed', 405);
    if (method === 'PUT') {
      if (!request.body || request.headers.get('Content-Type') !== 'application/zip') return reply('ZIP required', 400);
      const size = Number(request.headers.get('Content-Length'));
      if (Number.isFinite(size) && size > 50 * 1024 * 1024) return reply('ZIP exceeds 50 MiB', 413);
      headers['Content-Type'] = 'application/zip';
    }
    let upstream;
    try {
      upstream = await fetch(target, { method, headers, body: method === 'PUT' ? request.body : undefined, duplex: method === 'PUT' ? 'half' : undefined, redirect: 'manual' });
    } catch { return reply('WebDAV connection failed', 502); }
    if (upstream.status === 404 && method === 'HEAD') return reply(JSON.stringify({ exists: false }), 200, { 'Content-Type': 'application/json' });
    if (!upstream.ok) return reply(`WebDAV returned ${upstream.status}`, 502);
    if (method === 'HEAD' || method === 'PUT') {
      return reply(JSON.stringify({ exists: true, updatedAt: upstream.headers.get('Last-Modified') || '', bytes: Number(upstream.headers.get('Content-Length')) || null }), 200, { 'Content-Type': 'application/json' });
    }
    return reply(upstream.body, 200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="StarLedger-cloud-backup.zip"' });
  }
};
