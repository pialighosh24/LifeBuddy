process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), itemIds: new Set() };
function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const itemIds = Array.from(created.itemIds);
  const userIds = Array.from(created.userIds);
  if (itemIds.length) {
    const ph = itemIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM favourite_phrases WHERE communication_item_id IN (${ph})`, itemIds);
    await pool.execute(`DELETE FROM communication_items WHERE id IN (${ph})`, itemIds);
  }
  if (userIds.length) {
    const ph = userIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  created.userIds.clear(); created.itemIds.clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'Comm Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}
async function createCareUser(token) {
  const res = await request(app).post('/api/v1/care-users').set('Authorization', `Bearer ${token}`).send({ fullName: 'Comm User', preferredLanguage: 'en' });
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

describe('Stage 3: Communication Items', () => {
  test('Caregiver can create/update/deactivate; authenticated users retrieve/filter by category and handle inactive', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const userToken = await loginCareUser(token, cu.id);

    const key = `TEST_FOOD_${Date.now()}`;
    const create = await request(app).post('/api/v1/communication-items').set('Authorization', `Bearer ${token}`)
      .send({ itemKey: key, category: 'food', labelEn: 'Food', labelBn: 'খাবার', speakTextEn: 'I want food', speakTextBn: 'আমি খাবার চাই', iconKey: 'icon_food', sentenceRole: 'need', sortOrder: 10, isActive: true });
    expect(create.status).toBe(201);
    const itemId = create.body.data.item.id; created.itemIds.add(itemId);
    expect(create.body.data.item.iconKey).toBe('icon_food');

    const [db] = await pool.execute('SELECT * FROM communication_items WHERE id = ?', [itemId]);
    expect(db.length).toBe(1);
    expect(db[0].item_key).toBe(key);
    expect(db[0].category).toBe('food');

    const list = await request(app).get('/api/v1/communication-items').set('Authorization', `Bearer ${userToken}`).query({ category: 'food' });
    expect(list.status).toBe(200);
    expect(list.body.data.items.some(i => i.id === itemId)).toBe(true);

    const get = await request(app).get(`/api/v1/communication-items/${itemId}`).set('Authorization', `Bearer ${userToken}`);
    expect(get.status).toBe(200);
    expect(get.body.data.item.labelEn).toBe('Food');
    expect(get.body.data.item.labelBn).toBe('খাবার');

    const cats = await request(app).get('/api/v1/communication-items/categories').set('Authorization', `Bearer ${userToken}`);
    expect(cats.status).toBe(200);
    expect(cats.body.data.categories.some(c => c.category === 'food')).toBe(true);

    const upd = await request(app).patch(`/api/v1/communication-items/${itemId}`).set('Authorization', `Bearer ${token}`).send({ labelEn: 'Food Item', sortOrder: 5 });
    expect(upd.status).toBe(200);
    expect(upd.body.data.item.labelEn).toBe('Food Item');

    const del = await request(app).delete(`/api/v1/communication-items/${itemId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.data.item.isActive).toBe(false);
    const activeList = await request(app).get('/api/v1/communication-items').set('Authorization', `Bearer ${userToken}`).query({ category: 'food' });
    expect(activeList.body.data.items.some(i => i.id === itemId)).toBe(false);
    const allList = await request(app).get('/api/v1/communication-items').set('Authorization', `Bearer ${userToken}`).query({ category: 'food', active: 'all' });
    expect(allList.body.data.items.some(i => i.id === itemId)).toBe(true);
  });

  test('Invalid item handling and unauthorized management rejected', async () => {
    const cg = await registerCaregiver();
    const cu = await createCareUser(cg.body.data.token);
    const userToken = await loginCareUser(cg.body.data.token, cu.id);

    const notFound = await request(app).get('/api/v1/communication-items/999999999').set('Authorization', `Bearer ${userToken}`);
    expect(notFound.status).toBe(404);

    const userCreate = await request(app).post('/api/v1/communication-items').set('Authorization', `Bearer ${userToken}`)
      .send({ itemKey: `BAD_${Date.now()}`, labelEn: 'X', speakTextEn: 'x' });
    expect(userCreate.status).toBe(403);

    const unauth = await request(app).get('/api/v1/communication-items');
    expect(unauth.status).toBe(401);
  });
});
