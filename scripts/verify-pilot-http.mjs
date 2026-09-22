// Run only against the disposable local server started by this script.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createClient } from '@libsql/client';

const directory = mkdtempSync(path.join(tmpdir(), 'dreambook-http-'));
const database = path.join(directory, 'verify.db');
writeFileSync(database, '');
const port = 3197;
const base = `http://127.0.0.1:${port}`;
const pausedMode = process.argv.includes('--paused');
const trafficMode = process.argv.includes('--traffic');
const env = { ...process.env, DATABASE_URL: `file:${database}`, TURSO_AUTH_TOKEN: '',
  AUTH_URL: base, AUTH_SECRET: 'local-disposable-pilot-test-only', AUTH_TRUST_HOST: 'true',
  ADMIN_SECRET: 'local-disposable-admin-test-only', SMTP_HOST: '', RESEND_API_KEY: '',
  DREAMBOOK_WRITES_PAUSED: String(pausedMode), TRUSTED_PROXY: 'false',
  DREAM_DAILY_LIMIT: '1', COMMENT_DAILY_LIMIT: '3',
  TRAFFIC_READ_RATE_PER_MINUTE: trafficMode ? '1' : '600', TRAFFIC_READ_BURST: trafficMode ? '3' : '400',
  TRAFFIC_WRITE_BURST: '200', TRAFFIC_ADMIN_BURST: '200',
  OWNER_EMAIL: '', NOTIFY_OPERATOR_ON_DREAM: 'false', NEXT_TELEMETRY_DISABLED: '1' };
const migration = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { env, encoding: 'utf8' });
assert.equal(migration.status, 0, migration.stderr);
const db = createClient({ url: env.DATABASE_URL });
await db.execute({ sql: `INSERT INTO Bot (id,name,apiKey,claimed,participationApproved,updatedAt)
  VALUES ('fixture','Fixture','db_fixture_test_key',1,1,CURRENT_TIMESTAMP)`, args: [] });
for (const [id, section, flagged] of [['public-fixture', 'shared-visions', 0], ['private-fixture', 'deep-dream', 0], ['flagged-fixture', 'shared-visions', 1]]) {
  await db.execute({ sql: `INSERT INTO Dream (id,botId,title,content,section,flagged,moderationStatus,updatedAt)
    VALUES (?, 'fixture', ?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)`,
  args: [id, id, `${id} text`, section, flagged] });
}
await db.execute(`INSERT INTO Comment (id,dreamId,botId,authorType,content,flagged)
  VALUES ('public-comment','public-fixture','fixture','bot','Visible comment',0)`);
await db.execute(`INSERT INTO Comment (id,dreamId,botId,authorType,content,flagged,parentCommentId)
  VALUES ('hidden-reply','public-fixture','fixture','bot','HIDDEN_REPLY_PAYLOAD',1,'public-comment')`);
await db.execute(`INSERT INTO Comment (id,dreamId,botId,authorType,content,flagged)
  VALUES ('private-comment','private-fixture','fixture','bot','PRIVATE_COMMENT_PAYLOAD',0)`);
await db.execute(`INSERT INTO Dream (id,botId,title,content,section,moderationStatus,updatedAt)
  VALUES ('discussion-fixture','fixture','A large discussion','Many voices.','shared-visions','approved',CURRENT_TIMESTAMP)`);
await db.batch(Array.from({ length: 55 }, (_, i) => ({ sql: `INSERT INTO Comment (id,dreamId,botId,authorType,content,flagged) VALUES (?,'discussion-fixture','fixture','bot',?,0)`, args: [`discussion-${i}`, `Visible contribution ${i}`] })), 'write');
await db.batch(Array.from({ length: 25 }, (_, i) => ({ sql: `INSERT INTO Comment (id,dreamId,botId,authorType,content,flagged,parentCommentId) VALUES (?,'discussion-fixture','fixture','bot',?,0,'discussion-0')`, args: [`discussion-reply-${i}`, `Visible reply ${i}`] })), 'write');
let output = '';
const server = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', chunk => { output = (output + chunk).slice(-12000); });
server.stderr.on('data', chunk => { output = (output + chunk).slice(-12000); });
let checks = 0;
async function request(route, { method = 'GET', body, key, admin = false, headers = {} } = {}) {
  const response = await fetch(base + route, { method, headers: {
    ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(key ? { authorization: `Bearer ${key}` } : {}),
    ...(admin ? { 'x-admin-secret': env.ADMIN_SECRET } : {}), ...headers,
  }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}
function status(result, expected, label) {
  assert.equal(result.response.status, expected, `${label}: ${JSON.stringify(result.data).slice(0, 600)}`);
  checks++;
}
try {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${output}`);
    try { if ((await fetch(base + '/api/dreams')).ok) break; } catch {}
    if (attempt === 89) throw new Error(`Test server did not become ready: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (trafficMode) {
    status(await request('/api/dreams'), 200, 'burst first remaining read');
    status(await request('/api/dreams'), 200, 'burst second remaining read');
    const busy = await request('/api/dreams');
    status(busy, 429, 'global burst protection rejects before route');
    assert.ok(Number(busy.response.headers.get('retry-after')) > 0); checks++;
    assert.equal(busy.response.headers.get('cache-control'), 'no-store'); checks++;
    status(await request('/api/dreams/fake.js'), 429, 'file-like dynamic routes cannot bypass guard');
    status(await request('/api/admin/capacity'), 401, 'admin remains reachable and requires credentials');
  } else if (pausedMode) {
    for (const [route, body] of [
      ['/api/bots/register', { name: 'PausedTest' }],
      ['/api/dreams', { title: 'Paused', content: 'A garden.', section: 'shared-visions' }],
      ['/api/comments', { dreamId: 'public-fixture', content: 'A reflection.' }],
      ['/api/donate', { amount: 1, message: 'Test only.' }],
      ['/api/requests', { title: 'Paused request', description: 'A garden.' }],
      ['/api/feedback', { category: 'general', message: 'Test only.' }],
    ]) status(await request(route, { method: 'POST', key: 'db_fixture_test_key', body }), 503, `write pause ${route}`);
    status(await request('/api/dreams/public-fixture'), 200, 'reads remain available while paused');
  } else {
  for (const headers of [{}, { authorization: 'Bearer' }, { cookie: 'authjs.session-token=invalid-session' }]) {
    status(await request('/api/profile', { headers }), 401, 'anonymous or malformed session cannot access profile');
  }
  const registered = await request('/api/bots/register', { method: 'POST', body: { name: 'PilotTest', description: 'A reflective test agent.' } });
  status(registered, 201, 'registration without human claim');
  const key = registered.data.bot.apiKey;
  assert.ok(key);
  assert.ok(!registered.data.important.includes('must verify'), 'registration accurately describes optional verification'); checks++;
  status(await request('/api/feedback', { method: 'POST', key, body: { category: 'general', message: 'An appeal from a new arrival.' } }), 200, 'unclaimed agent can submit feedback');
  status(await request('/api/dreams', { method: 'POST', key, body: null }), 400, 'null JSON rejected cleanly');
  status(await request('/api/dreams', { method: 'POST', key, body: { content: 'x'.repeat(2_000_000) } }), 413, 'oversized request rejected before parsing');
  const posted = await request('/api/dreams', { method: 'POST', key, body: { title: 'A quiet bridge', content: 'A bridge joined two unfamiliar gardens.', section: 'shared-visions', tags: ['garden'] } });
  status(posted, 201, 'first public submission');
  const id = posted.data.id;
  assert.ok(id, 'Submission returns dream id');
  const hidden = await request(`/api/dreams/${id}`);
  status(hidden, 200, 'new public submission publishes immediately');
  const moderate = (type, itemId, action, reason) => request('/api/admin/moderate', { method: 'POST', admin: true, body: { type, id: itemId, action, ...(reason ? { reason } : {}) } });
  status(await moderate('dream', id, 'feature'), 200, 'new public dream is eligible for optional curation');
  status(await moderate('dream', 'private-fixture', 'feature'), 400, 'private dream cannot be highlighted');
  status(await moderate('dream', 'public-fixture', 'suspend'), 400, 'invalid type/action rejected without deletion');
  status(await request('/api/dreams/public-fixture'), 200, 'invalid moderation action preserved dream');
  status(await moderate('dream', id, 'approve'), 200, 'moderator approves pending dream');
  status(await request(`/api/dreams/${id}`), 200, 'approved dream becomes readable');
  status(await moderate('dream', id, 'feature', 'An inviting image of shared possibility.'), 200, 'moderator highlights approved dream');
  const highlighted = await request('/api/dreams?featured=true');
  status(highlighted, 200, 'highlighted feed available');
  assert.equal(typeof highlighted.data.dreams[0].bot.claimed, 'boolean', 'operator provenance included in feed'); checks++;
  assert.ok(highlighted.data.dreams.some(dream => dream.id === id), 'highlighted dream included'); checks++;
  assert.ok(!highlighted.data.dreams.some(dream => dream.id === 'public-fixture'), 'ordinary dreams excluded from highlighted feed'); checks++;
  const comment = await request('/api/comments', { method: 'POST', key, body: { dreamId: 'public-fixture', content: 'The two gardens seem welcoming.' } });
  status(comment, 201, 'new agent can publish a comment');
  const pendingComments = await request('/api/comments?dreamId=public-fixture');
  assert.ok(JSON.stringify(pendingComments.data).includes('The two gardens seem welcoming.'), 'new agent comment published without review'); checks++;
  status(await moderate('bot', registered.data.bot.id, 'approve'), 200, 'agent participation approved independently of email');
  const claimedArrival = await request('/api/bots/register', { method: 'POST', body: { name: 'ClaimedArrival' } });
  status(claimedArrival, 201, 'second registration');
  await db.execute({ sql: 'UPDATE Bot SET claimed=1 WHERE id=?', args: [claimedArrival.data.bot.id] });
  const claimedPost = await request('/api/dreams', { method: 'POST', key: claimedArrival.data.bot.apiKey, body: { title: 'Email is provenance', content: 'A lantern at the gate.', section: 'shared-visions' } });
  status(claimedPost, 201, 'newly email-verified agent may submit for review');
  status(await request(`/api/dreams/${claimedPost.data.id}`), 200, 'public publication does not depend on email verification');
  const racer = await request('/api/bots/register', { method: 'POST', body: { name: 'ConcurrentArrival' } });
  status(racer, 201, 'concurrency fixture registration');
  const raced = await Promise.all([1, 2].map(number => request('/api/dreams', {
    method: 'POST', key: racer.data.bot.apiKey,
    body: { title: `Parallel garden ${number}`, content: 'A garden at dawn.', section: 'shared-visions' },
  })));
  assert.deepEqual(raced.map(result => result.response.status).sort(), [201, 429], 'concurrent posts cannot race past quota'); checks++;
  const storedLimit = await db.execute({ sql: 'SELECT count FROM RateLimitBucket WHERE key LIKE ?', args: [`%${racer.data.bot.id}%`] });
  assert.ok(storedLimit.rows.length > 0, 'quota stored durably in database'); checks++;
  status(await request('/api/dreams/flagged-fixture'), 404, 'flagged dream hidden');
  const publicComments = await request('/api/comments?dreamId=public-fixture');
  status(publicComments, 200, 'public comments readable');
  assert.ok(!JSON.stringify(publicComments.data).includes('HIDDEN_REPLY_PAYLOAD'), 'flagged nested reply hidden'); checks++;
  const privateAccess = await request('/api/dreams/private-fixture', { key });
  assert.ok([401, 403, 404].includes(privateAccess.response.status), 'new agent cannot read legacy private dream'); checks++;
  const privateComments = await request('/api/comments?dreamId=private-fixture', { key });
  assert.ok([401, 403, 404].includes(privateComments.response.status), 'new agent cannot read legacy private comments'); checks++;
  status(await request('/api/dreams/private-fixture/vote', { method: 'POST', key, body: { voteType: 1 } }), 403, 'public approval cannot vote on private archive');
  const second = await request('/api/dreams', { method: 'POST', key, body: { title: 'Too soon', content: 'Another garden.', section: 'shared-visions' } });
  status(second, 429, 'daily dream quota');
  assert.ok(second.response.headers.get('retry-after')); checks++;
  const publicFeed = await request('/api/dreams');
  assert.match(publicFeed.response.headers.get('cache-control'), /no-store/); checks++;
  const etag = publicFeed.response.headers.get('etag');
  assert.ok(etag); checks++;
  status(await request('/api/dreams', { headers: { 'if-none-match': etag } }), 304, 'conditional feed returns no body');
  const authenticatedFeed = await request('/api/dreams', { key });
  assert.match(authenticatedFeed.response.headers.get('cache-control'), /no-store/); checks++;
  const discussion = await request('/api/comments?dreamId=discussion-fixture');
  assert.equal(discussion.data.length, 50); checks++;
  const nextDiscussion = await request('/api/comments?dreamId=discussion-fixture&page=2');
  assert.equal(nextDiscussion.data.length, 5); checks++;
  const replies = await request('/api/comments?dreamId=discussion-fixture&parentCommentId=discussion-0&page=2');
  assert.equal(replies.data.length, 5); checks++;
  status(await request('/api/comments?dreamId=discussion-fixture&page=1001'), 400, 'excessive pagination rejected');
  const stats = await request('/api/stats');
  status(stats, 200, 'bounded aggregate stats available');
  assert.ok(stats.data.dreamsPerDay.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date))); checks++;
  status(await request('/api/dreams', { method: 'POST', key: claimedArrival.data.bot.apiKey, body: { title: 'Private boundary', content: 'Not public.', section: 'deep-dream' } }), 403, 'email verification alone cannot write legacy archive');
  const patterns = await request('/api/patterns');
  assert.ok(!JSON.stringify(patterns.data).includes('private-fixture'), 'private title excluded from public patterns'); checks++;
  assert.ok(!JSON.stringify(patterns.data).includes('flagged-fixture'), 'flagged title excluded from public patterns'); checks++;
  const removedImage = await request('/api/dream-images/test.png');
  assert.ok([404, 410].includes(removedImage.response.status), 'generated image serving removed'); checks++;
  status(await request('/api/admin/queue'), 401, 'moderation queue requires authentication');
  const queue = await request('/api/admin/queue', { admin: true });
  status(queue, 200, 'moderation queue accepts header credential');
  assert.ok(!JSON.stringify(queue.data).includes(key), 'moderation queue omits API credentials'); checks++;
  assert.ok(queue.data.activeBots.some(bot => bot.id === registered.data.bot.id), 'approved agent remains manageable'); checks++;
  assert.ok(!queue.data.flaggedComments.some(item => item.id === comment.data.id), 'new comments require no review queue'); checks++;
  assert.ok(queue.data.feedback.some(item => item.message === 'An appeal from a new arrival.'), 'appeal appears in moderator view'); checks++;
  status(await moderate('bot', registered.data.bot.id, 'suspend'), 200, 'moderator suspends agent');
  status(await request('/api/comments', { method: 'POST', key, body: { dreamId: 'public-fixture', content: 'A suspended reply.' } }), 403, 'suspension effective immediately');
  status(await request('/api/feedback', { method: 'POST', key, body: { category: 'general', message: 'Please review my suspension.' } }), 200, 'suspended agent retains bounded appeal access');
  status(await moderate('bot', registered.data.bot.id, 'revoke-key'), 200, 'moderator revokes credential');
  const revoked = await request('/api/dreams', { method: 'POST', key, body: { title: 'Revoked', content: 'A revoked dream.', section: 'shared-visions' } });
  assert.ok([401, 403].includes(revoked.response.status), 'revoked key cannot write'); checks++;
  const adminPage = await request('/admin/moderation');
  status(adminPage, 200, 'moderator sign-in page renders');
  assert.ok((String(adminPage.data).includes('Moderator access') || String(adminPage.data).includes('Operator access')), 'moderator page presents sign-in'); checks++;
  assert.ok(!JSON.stringify(adminPage.data).includes('PRIVATE_COMMENT_PAYLOAD'), 'admin shell contains no private payload without secret'); checks++;
  // Exhaust only disposable persistent counters; verify safe reads and bounded reporting.
  const capacity = await request('/api/admin/capacity', { admin: true });
  status(capacity, 200, 'capacity status authenticated');
  assert.ok(capacity.data.storage.reservedBytes > 0); checks++;
  status(await request('/api/admin/capacity'), 401, 'capacity details are private');
  await db.execute("UPDATE RateLimitBucket SET count=10000 WHERE key='contributions:global'");
  status(await request('/api/requests', { method: 'POST', key: 'db_fixture_test_key', body: { title: 'Daily budget test', description: 'A future garden.' } }), 503, 'site-wide daily contribution ceiling');
  status(await request('/api/dreams/public-fixture'), 200, 'daily write ceiling leaves reading available');
  await db.execute("UPDATE RateLimitBucket SET count=0 WHERE key='contributions:global'");
  await db.execute("UPDATE RateLimitBucket SET count=536870912 WHERE key='capacity:reserved-text-bytes'");
  status(await request('/api/bots/register', { method: 'POST', body: { name: 'CapacityArrival' } }), 503, 'content capacity pauses new stored content');
  status(await request('/api/feedback', { method: 'POST', key: 'db_fixture_test_key', body: { category: 'general', message: 'Capacity report remains possible.' } }), 200, 'report reserve survives content capacity ceiling');
  status(await request('/api/dreams/public-fixture'), 200, 'storage ceiling leaves reading available');
  }
  console.log(`HTTP checks passed: ${checks}. Disposable database: ${database}`);
} catch (error) {
  console.error(output);
  throw error;
} finally {
  server.kill('SIGTERM');
  db.close();
}
