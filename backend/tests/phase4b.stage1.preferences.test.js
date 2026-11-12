process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set() };

function unique(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function cleanup() {
  const ids = Array.from(created.userIds);
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await pool.execute(
    `DELETE FROM caregiver_links WHERE caregiver_id IN (${placeholders}) OR care_user_id IN (${placeholders})`,
    [...ids, ...ids]
  );
  await pool.execute(
    `DELETE FROM user_preferences WHERE user_id IN (${placeholders})`,
    ids
  );
  await pool.execute(`DELETE FROM users WHERE id IN (${placeholders})`, ids);
  created.userIds.clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const payload = { email, password: 'StrongPass123!', fullName: 'Prefs Caregiver', displayName: 'PCG', preferredLanguage: 'en' };
  const res = await request(app).post('/api/v1/auth/caregiver/register').send(payload);
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return { res, payload };
}

async function createCareUser(token, overrides = {}) {
  const payload = {
    fullName: overrides.fullName || 'Prefs Care User',
    displayName: overrides.displayName || 'PCU',
    preferredLanguage: overrides.preferredLanguage || 'en',
    relationshipType: 'guardian',
  };
  const res = await request(app).post('/api/v1/care-users').set('Authorization', `Bearer ${token}`).send(payload);
  const id = res.body?.data?.careUser?.id;
  if (id) created.userIds.add(id);
  return { res, payload, id };
}

beforeAll(async () => { await pool.query('SELECT 1'); });
afterEach(async () => { await cleanup(); });
afterAll(async () => { await cleanup(); await pool.end(); });

describe('Stage 1: Profile and Accessibility Preferences', () => {
  test('Retrieve authenticated profile and update permitted fields', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;

    const getRes = await request(app).get('/api/v1/profile').set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.profile.id).toBe(cg.res.body.data.user.id);
    expect(getRes.body.data.profile.role).toBe('caregiver');
    expect(getRes.body.data.profile.password_hash).toBeUndefined();

    const patchRes = await request(app)
      .patch('/api/v1/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Updated CG', preferredLanguage: 'bn', phoneNumber: '0123456789' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.profile.displayName).toBe('Updated CG');
    expect(patchRes.body.data.profile.preferredLanguage).toBe('bn');

    const [rows] = await pool.execute('SELECT display_name, preferred_language, phone_number FROM users WHERE id = ?', [cg.res.body.data.user.id]);
    expect(rows[0].display_name).toBe('Updated CG');
    expect(rows[0].preferred_language).toBe('bn');
    expect(rows[0].phone_number).toBe('0123456789');
  });

  test('Retrieve linked care-user preferences (creates defaults) and persist to MySQL', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;
    const cu = await createCareUser(token);
    expect(cu.res.status).toBe(201);

    const res = await request(app)
      .get(`/api/v1/care-users/${cu.id}/preferences`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const prefs = res.body.data.preferences;
    expect(prefs.userId).toBe(cu.id);
    expect(prefs.language).toBe('en');
    expect(prefs.textSize).toBe('large');
    expect(prefs.contrastMode).toBe('high');
    expect(Number(prefs.speechRate)).toBe(1);
    expect(prefs.voiceEnabled).toBe(true);
    expect(prefs.reducedMotion).toBe(false);
    expect(prefs.notificationsEnabled).toBe(true);

    const [rows] = await pool.execute('SELECT * FROM user_preferences WHERE user_id = ?', [cu.id]);
    expect(rows.length).toBe(1);
    expect(rows[0].text_size).toBe('large');
    expect(rows[0].contrast_mode).toBe('high');
  });

  test('Update valid preferences and verify MySQL persistence', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;
    const cu = await createCareUser(token);

    const putRes = await request(app)
      .put(`/api/v1/care-users/${cu.id}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        language: 'bn',
        textSize: 'xlarge',
        contrastMode: 'normal',
        speechRate: 0.75,
        voiceEnabled: false,
        reducedMotion: true,
        notificationsEnabled: false,
      });
    expect(putRes.status).toBe(200);
    const prefs = putRes.body.data.preferences;
    expect(prefs.language).toBe('bn');
    expect(prefs.textSize).toBe('xlarge');
    expect(prefs.contrastMode).toBe('normal');
    expect(Number(prefs.speechRate)).toBeCloseTo(0.75, 2);
    expect(prefs.voiceEnabled).toBe(false);
    expect(prefs.reducedMotion).toBe(true);
    expect(prefs.notificationsEnabled).toBe(false);

    const [rows] = await pool.execute('SELECT language, text_size, contrast_mode, speech_rate, voice_enabled, reduced_motion, notifications_enabled FROM user_preferences WHERE user_id = ?', [cu.id]);
    expect(rows.length).toBe(1);
    expect(rows[0].language).toBe('bn');
    expect(rows[0].text_size).toBe('xlarge');
    expect(rows[0].contrast_mode).toBe('normal');
    expect(Number(rows[0].speech_rate)).toBeCloseTo(0.75, 2);
    expect(!!rows[0].voice_enabled).toBe(false);
    expect(!!rows[0].reduced_motion).toBe(true);
    expect(!!rows[0].notifications_enabled).toBe(false);
  });

  test('Reject invalid preference values', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;
    const cu = await createCareUser(token);

    const badText = await request(app)
      .put(`/api/v1/care-users/${cu.id}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ textSize: 'huge' });
    expect(badText.status).toBe(400);

    const badRate = await request(app)
      .put(`/api/v1/care-users/${cu.id}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ speechRate: 3.5 });
    expect(badRate.status).toBe(400);

    const badLang = await request(app)
      .put(`/api/v1/care-users/${cu.id}/preferences`)
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'fr' });
    expect(badLang.status).toBe(400);
  });

  test('Reject unauthorized access and cross-caregiver access', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const cu = await createCareUser(cg1.res.body.data.token);

    const noAuth = await request(app).get(`/api/v1/care-users/${cu.id}/preferences`);
    expect(noAuth.status).toBe(401);

    const cross = await request(app)
      .get(`/api/v1/care-users/${cu.id}/preferences`)
      .set('Authorization', `Bearer ${cg2.res.body.data.token}`);
    expect(cross.status).toBe(403);

    const crossPut = await request(app)
      .put(`/api/v1/care-users/${cu.id}/preferences`)
      .set('Authorization', `Bearer ${cg2.res.body.data.token}`)
      .send({ textSize: 'small' });
    expect(crossPut.status).toBe(403);
  });

  test('Care-user can access own preferences but not another user\'s', async () => {
    const cg = await registerCaregiver();
    const cu1 = await createCareUser(cg.res.body.data.token, { fullName: 'CU One' });
    const cu2 = await createCareUser(cg.res.body.data.token, { fullName: 'CU Two' });

    await request(app)
      .post(`/api/v1/care-users/${cu1.id}/pin`)
      .set('Authorization', `Bearer ${cg.res.body.data.token}`)
      .send({ pin: '1234' });
    const login = await request(app).post('/api/v1/auth/user/pin/login').send({ careUserId: cu1.id, pin: '1234' });
    expect(login.status).toBe(200);
    const userToken = login.body.data.token;

    const own = await request(app)
      .get(`/api/v1/care-users/${cu1.id}/preferences`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(own.status).toBe(200);
    expect(own.body.data.preferences.userId).toBe(cu1.id);

    const other = await request(app)
      .get(`/api/v1/care-users/${cu2.id}/preferences`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(other.status).toBe(403);
  });
});
