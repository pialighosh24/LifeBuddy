process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), alertIds: new Set(), contactIds: new Set() };
function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const alertIds = Array.from(created.alertIds);
  const userIds = Array.from(created.userIds);
  if (alertIds.length) {
    const ph = alertIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM sos_alerts WHERE id IN (${ph})`, alertIds);
  }
  if (userIds.length) {
    const ph = userIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM sos_alerts WHERE care_user_id IN (${ph}) OR acknowledged_by IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM emergency_contacts WHERE care_user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  created.userIds.clear(); created.alertIds.clear(); created.contactIds.clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'SOS Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}
async function createCareUser(token, name = 'SOS User') {
  const res = await request(app).post('/api/v1/care-users').set('Authorization', `Bearer ${token}`).send({ fullName: name, preferredLanguage: 'en' });
  const id = res.body?.data?.careUser?.id; if (id) created.userIds.add(id);
  return { res, id };
}
async function loginCareUser(caregiverToken, careUserId, pin = '1234') {
  await request(app).post(`/api/v1/care-users/${careUserId}/pin`).set('Authorization', `Bearer ${caregiverToken}`).send({ pin });
  const login = await request(app).post('/api/v1/auth/user/pin/login').send({ careUserId, pin });
  return login.body?.data?.token;
}

beforeAll(async () => { await pool.query('SELECT 1'); });
afterEach(async () => { await cleanup(); });
afterAll(async () => { await cleanup(); await pool.end(); });

describe('Stage 2: SOS Alerts (safety-critical)', () => {
  test('Care-user creates valid SOS with location; persistence and no false delivery claim', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const userToken = await loginCareUser(token, cu.id);

    const res = await request(app).post('/api/v1/sos').set('Authorization', `Bearer ${userToken}`)
      .send({ latitude: 23.8103, longitude: 90.4125, locationStatus: 'available', clientEventId: unique('evt') });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transmission.saved).toBe(true);
    expect(res.body.data.transmission.externalDeliveryConfirmed).toBe(false);
    expect(String(res.body.message || '') + JSON.stringify(res.body.data)).not.toMatch(/emergency service contacted|sms delivered|email delivered|push delivered/i);
    const alert = res.body.data.alert;
    expect(alert.careUserId).toBe(cu.id);
    expect(alert.alertStatus).toBe('created');
    expect(Number(alert.latitude)).toBeCloseTo(23.8103, 4);
    created.alertIds.add(alert.id);

    const [rows] = await pool.execute('SELECT * FROM sos_alerts WHERE id = ?', [alert.id]);
    expect(rows.length).toBe(1);
    expect(rows[0].care_user_id).toBe(cu.id);
    expect(rows[0].alert_status).toBe('created');
  });

  test('Reject unauthenticated/invalid coordinates and enforce ownership', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const userToken = await loginCareUser(token, cu.id);

    const unauth = await request(app).post('/api/v1/sos').send({ latitude: 1, longitude: 2 });
    expect(unauth.status).toBe(401);

    const badLat = await request(app).post('/api/v1/sos').set('Authorization', `Bearer ${userToken}`).send({ latitude: 123, longitude: 2 });
    expect(badLat.status).toBe(400);
    const badLng = await request(app).post('/api/v1/sos').set('Authorization', `Bearer ${userToken}`).send({ latitude: 23, longitude: 999 });
    expect(badLng.status).toBe(400);
    const half = await request(app).post('/api/v1/sos').set('Authorization', `Bearer ${userToken}`).send({ latitude: 23 });
    expect(half.status).toBe(400);

    // caregiver cannot create SOS via this endpoint
    const cgCreate = await request(app).post('/api/v1/sos').set('Authorization', `Bearer ${token}`).send({});
    expect(cgCreate.status).toBe(403);
  });

  test('Caregiver retrieves/acknowledges linked alerts; unlinked/unauthorized rejected; conflict on duplicate acknowledge', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const cu1 = await createCareUser(cg1.body.data.token, 'CU1');
    const cu2 = await createCareUser(cg2.body.data.token, 'CU2');
    const userToken1 = await loginCareUser(cg1.body.data.token, cu1.id);
    const userToken2 = await loginCareUser(cg2.body.data.token, cu2.id);

    const sos = await request(app).post('/api/v1/sos').set('Authorization', `Bearer ${userToken1}`).send({ locationStatus: 'unavailable' });
    expect(sos.status).toBe(201);
    const alertId = sos.body.data.alert.id; created.alertIds.add(alertId);

    const list = await request(app).get(`/api/v1/care-users/${cu1.id}/sos-alerts`).set('Authorization', `Bearer ${cg1.body.data.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.alerts.some(a => a.id === alertId)).toBe(true);
    const hist = await request(app).get(`/api/v1/care-users/${cu1.id}/sos-history`).set('Authorization', `Bearer ${cg1.body.data.token}`);
    expect(hist.status).toBe(200);

    const get = await request(app).get(`/api/v1/sos/${alertId}`).set('Authorization', `Bearer ${cg1.body.data.token}`);
    expect(get.status).toBe(200);

    const unlinked = await request(app).get(`/api/v1/sos/${alertId}`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect(unlinked.status).toBe(403);
    const crossUser = await request(app).get(`/api/v1/care-users/${cu1.id}/sos-alerts`).set('Authorization', `Bearer ${userToken2}`);
    expect(crossUser.status).toBe(403);

    const ack = await request(app).patch(`/api/v1/sos/${alertId}/acknowledge`).set('Authorization', `Bearer ${cg1.body.data.token}`);
    expect(ack.status).toBe(200);
    expect(ack.body.data.alert.alertStatus).toBe('acknowledged');
    expect(Number(ack.body.data.alert.acknowledgedBy)).toBe(Number(cg1.body.data.user.id));
    expect(ack.body.data.alert.acknowledgedAt).toBeTruthy();

    const dupAck = await request(app).patch(`/api/v1/sos/${alertId}/acknowledge`).set('Authorization', `Bearer ${cg1.body.data.token}`);
    expect(dupAck.status).toBe(409);

    const unauthAck = await request(app).patch(`/api/v1/sos/${alertId}/acknowledge`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect([403,409]).toContain(unauthAck.status); // no access or conflict depending on check order

    // resolve not supported by schema enum (no RESOLVED) - must not invent
    const resolve = await request(app).patch(`/api/v1/sos/${alertId}/resolve`).set('Authorization', `Bearer ${cg1.body.data.token}`);
    expect([400,409]).toContain(resolve.status);
  });

  test('Concurrent acknowledgement handled safely (one succeeds, other conflict)', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const userToken = await loginCareUser(token, cu.id);
    const sos = await request(app).post('/api/v1/sos').set('Authorization', `Bearer ${userToken}`).send({});
    const alertId = sos.body.data.alert.id; created.alertIds.add(alertId);

    const [r1, r2] = await Promise.all([
      request(app).patch(`/api/v1/sos/${alertId}/acknowledge`).set('Authorization', `Bearer ${token}`),
      request(app).patch(`/api/v1/sos/${alertId}/acknowledge`).set('Authorization', `Bearer ${token}`),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
    const [rows] = await pool.execute('SELECT alert_status, acknowledged_by FROM sos_alerts WHERE id = ?', [alertId]);
    expect(rows[0].alert_status).toBe('acknowledged');
    expect(rows[0].acknowledged_by).toBeTruthy();
  });
});
