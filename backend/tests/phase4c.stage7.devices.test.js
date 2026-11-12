process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), deviceIds: new Set(), tokens: new Set() };
function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const deviceIds = Array.from(created.deviceIds);
  const tokens = Array.from(created.tokens);
  if (deviceIds.length) { const ph=deviceIds.map(()=>'?').join(','); await pool.execute(`DELETE FROM device_tokens WHERE id IN (${ph})`, deviceIds); }
  if (tokens.length) { const ph=tokens.map(()=>'?').join(','); await pool.execute(`DELETE FROM device_tokens WHERE expo_push_token IN (${ph})`, tokens); }
  const userIds = Array.from(created.userIds);
  if (userIds.length) {
    const ph=userIds.map(()=>'?').join(',');
    await pool.execute(`DELETE FROM device_tokens WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  for (const k of Object.keys(created)) created[k].clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'Dev Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}

beforeAll(async()=>{await pool.query('SELECT 1');});
afterEach(async()=>{await cleanup();});
afterAll(async()=>{await cleanup(); await pool.end();});

describe('Stage 7: Device Tokens', () => {
  test('Register, list, rotate/update, unregister with MySQL persistence and masked token', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const pushToken = `ExponentPushToken[${unique('tok')}]`;
    created.tokens.add(pushToken);

    const reg = await request(app).post('/api/v1/devices/register').set('Authorization', `Bearer ${token}`)
      .send({ expoPushToken: pushToken, platform: 'android' });
    expect(reg.status).toBe(201);
    const devId = reg.body.data.device.id; created.deviceIds.add(devId);
    expect(reg.body.data.device.platform).toBe('android');
    expect(reg.body.data.device.expoPushToken).not.toBe(pushToken); // masked in response
    expect(reg.body.data.device.tokenMasked).toContain('...');

    const [db] = await pool.execute('SELECT * FROM device_tokens WHERE id = ?', [devId]);
    expect(db.length).toBe(1);
    expect(db[0].expo_push_token).toBe(pushToken);
    expect(db[0].user_id).toBe(cg.body.data.user.id);
    expect(!!db[0].is_active).toBe(true);

    const list = await request(app).get('/api/v1/devices').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.devices.some(d => d.id === devId)).toBe(true);
    expect(JSON.stringify(list.body)).not.toContain(pushToken); // full token not unnecessarily exposed

    // re-register same token -> update/reactivate (rotation/idempotent behavior)
    const reg2 = await request(app).post('/api/v1/devices/register').set('Authorization', `Bearer ${token}`)
      .send({ expoPushToken: pushToken, platform: 'ios' });
    expect(reg2.status).toBe(201);
    const [db2] = await pool.execute('SELECT platform, is_active FROM device_tokens WHERE expo_push_token = ?', [pushToken]);
    expect(db2.length).toBe(1);
    expect(db2[0].platform).toBe('ios');

    const unreg = await request(app).delete(`/api/v1/devices/${devId}`).set('Authorization', `Bearer ${token}`);
    expect(unreg.status).toBe(200);
    const [db3] = await pool.execute('SELECT is_active FROM device_tokens WHERE id = ?', [devId]);
    expect(!!db3[0].is_active).toBe(false);
  });

  test('Reject invalid platform and cross-user registration/unregistration', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const tok = `ExponentPushToken[${unique('tok2')}]`;
    created.tokens.add(tok);

    const bad = await request(app).post('/api/v1/devices/register').set('Authorization', `Bearer ${cg1.body.data.token}`)
      .send({ expoPushToken: tok, platform: 'windows' });
    expect(bad.status).toBe(400);

    const reg = await request(app).post('/api/v1/devices/register').set('Authorization', `Bearer ${cg1.body.data.token}`)
      .send({ expoPushToken: tok, platform: 'web' });
    expect(reg.status).toBe(201);
    const devId = reg.body.data.device.id; created.deviceIds.add(devId);

    // other user cannot claim same token
    const crossReg = await request(app).post('/api/v1/devices/register').set('Authorization', `Bearer ${cg2.body.data.token}`)
      .send({ expoPushToken: tok, platform: 'android' });
    expect(crossReg.status).toBe(403);

    const crossDel = await request(app).delete(`/api/v1/devices/${devId}`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect(crossDel.status).toBe(403);
  });
});
