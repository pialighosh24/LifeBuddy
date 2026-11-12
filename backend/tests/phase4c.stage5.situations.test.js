process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), situationKeys: new Set() };
function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const keys = Array.from(created.situationKeys);
  if (keys.length) {
    const ph = keys.map(() => '?').join(',');
    await pool.execute(`DELETE FROM situation_steps WHERE situation_key IN (${ph})`, keys);
  }
  const userIds = Array.from(created.userIds);
  if (userIds.length) {
    const ph = userIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  created.userIds.clear(); created.situationKeys.clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'Sit Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}

beforeAll(async()=>{await pool.query('SELECT 1');});
afterEach(async()=>{await cleanup();});
afterAll(async()=>{await cleanup(); await pool.end();});

describe('Stage 5: Situation Assistant', () => {
  test('List and retrieve situation with ordered steps from MySQL (no hardcoded data)', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const key = `TEST_WASH_${Date.now()}`.toUpperCase();
    created.situationKeys.add(key);
    await pool.execute(
      `INSERT INTO situation_steps (care_user_id, situation_key, title_en, title_bn, step_order, instruction_en, instruction_bn, image_key, is_predefined, is_active)
       VALUES (NULL, ?, 'Washing Hands', 'হাত ধোয়া', 1, 'Turn on water', 'পানি চালু করুন', 'img1', 1, 1),
              (NULL, ?, 'Washing Hands', 'হাত ধোয়া', 2, 'Use soap', 'সাবান ব্যবহার করুন', 'img2', 1, 1)`,
      [key, key]
    );

    const list = await request(app).get('/api/v1/situations').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.situations.some(s => s.situationKey === key && s.stepCount === 2)).toBe(true);

    const get = await request(app).get(`/api/v1/situations/${key}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.data.situation.situationKey).toBe(key);
    expect(get.body.data.steps).toHaveLength(2);
    expect(get.body.data.steps[0].stepOrder).toBe(1);
    expect(get.body.data.steps[0].instructionEn).toBe('Turn on water');
    expect(get.body.data.steps[1].instructionBn).toBe('সাবান ব্যবহার করুন');

    const steps = await request(app).get(`/api/v1/situations/${key}/steps`).set('Authorization', `Bearer ${token}`);
    expect(steps.status).toBe(200);
    expect(steps.body.data.steps.map(s=>s.stepOrder)).toEqual([1,2]);
  });

  test('Invalid situation returns 404 and unauthenticated rejected', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const notFound = await request(app).get('/api/v1/situations/DOES_NOT_EXIST_XYZ').set('Authorization', `Bearer ${token}`);
    expect(notFound.status).toBe(404);
    const unauth = await request(app).get('/api/v1/situations');
    expect(unauth.status).toBe(401);
  });
});
