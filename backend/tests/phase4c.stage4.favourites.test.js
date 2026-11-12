process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), itemIds: new Set(), favIds: new Set() };
function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const favIds = Array.from(created.favIds);
  const itemIds = Array.from(created.itemIds);
  const userIds = Array.from(created.userIds);
  if (favIds.length) { const ph=favIds.map(()=>'?').join(','); await pool.execute(`DELETE FROM favourite_phrases WHERE id IN (${ph})`, favIds); }
  if (userIds.length) { const ph=userIds.map(()=>'?').join(','); await pool.execute(`DELETE FROM favourite_phrases WHERE care_user_id IN (${ph})`, userIds); }
  if (itemIds.length) { const ph=itemIds.map(()=>'?').join(','); await pool.execute(`DELETE FROM favourite_phrases WHERE communication_item_id IN (${ph})`, itemIds); await pool.execute(`DELETE FROM communication_items WHERE id IN (${ph})`, itemIds); }
  if (userIds.length) {
    const ph=userIds.map(()=>'?').join(',');
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  created.userIds.clear(); created.itemIds.clear(); created.favIds.clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'Fav Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}
async function createCareUser(token, name='Fav User') {
  const res = await request(app).post('/api/v1/care-users').set('Authorization', `Bearer ${token}`).send({ fullName: name, preferredLanguage: 'en' });
  const id = res.body?.data?.careUser?.id; if (id) created.userIds.add(id);
  return { res, id };
}
async function loginCareUser(caregiverToken, careUserId, pin='1234') {
  await request(app).post(`/api/v1/care-users/${careUserId}/pin`).set('Authorization', `Bearer ${caregiverToken}`).send({ pin });
  const login = await request(app).post('/api/v1/auth/user/pin/login').send({ careUserId, pin });
  return login.body?.data?.token;
}

beforeAll(async()=>{await pool.query('SELECT 1');});
afterEach(async()=>{await cleanup();});
afterAll(async()=>{await cleanup(); await pool.end();});

describe('Stage 4: Favourite Phrases', () => {
  test('Add/list/remove favourites, prevent duplicates, verify persistence and ownership', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const userToken = await loginCareUser(token, cu.id);

    // create a communication item to favourite
    const itemKey = `FAV_ITEM_${Date.now()}`;
    const item = await request(app).post('/api/v1/communication-items').set('Authorization', `Bearer ${token}`)
      .send({ itemKey, category: 'need', labelEn: 'Water', speakTextEn: 'I want water', speakTextBn: 'আমি পানি চাই' });
    expect(item.status).toBe(201);
    const itemId = item.body.data.item.id; created.itemIds.add(itemId);

    const add = await request(app).post(`/api/v1/care-users/${cu.id}/favourites`).set('Authorization', `Bearer ${userToken}`)
      .send({ communicationItemId: itemId, phraseLabel: 'Water' });
    expect(add.status).toBe(201);
    const favId = add.body.data.favourite.id; created.favIds.add(favId);
    expect(add.body.data.favourite.phraseEn).toBeTruthy();

    const [db] = await pool.execute('SELECT * FROM favourite_phrases WHERE id = ?', [favId]);
    expect(db.length).toBe(1);
    expect(db[0].care_user_id).toBe(cu.id);
    expect(db[0].communication_item_id).toBe(itemId);

    const dup = await request(app).post(`/api/v1/care-users/${cu.id}/favourites`).set('Authorization', `Bearer ${userToken}`)
      .send({ communicationItemId: itemId });
    expect(dup.status).toBe(409);

    const list = await request(app).get(`/api/v1/care-users/${cu.id}/favourites`).set('Authorization', `Bearer ${userToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.favourites.some(f => f.id === favId)).toBe(true);

    // linked caregiver may retrieve
    const cgList = await request(app).get(`/api/v1/care-users/${cu.id}/favourites`).set('Authorization', `Bearer ${token}`);
    expect(cgList.status).toBe(200);

    const del = await request(app).delete(`/api/v1/favourites/${favId}`).set('Authorization', `Bearer ${userToken}`);
    expect(del.status).toBe(200);
    const [after] = await pool.execute('SELECT id FROM favourite_phrases WHERE id = ?', [favId]);
    expect(after.length).toBe(0);
    created.favIds.delete(favId);
  });

  test('Reject invalid item and cross-user access', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const cu1 = await createCareUser(cg1.body.data.token, 'CU1');
    const cu2 = await createCareUser(cg2.body.data.token, 'CU2');
    const userToken1 = await loginCareUser(cg1.body.data.token, cu1.id);
    const userToken2 = await loginCareUser(cg2.body.data.token, cu2.id);

    const badItem = await request(app).post(`/api/v1/care-users/${cu1.id}/favourites`).set('Authorization', `Bearer ${userToken1}`)
      .send({ communicationItemId: 999999999 });
    expect(badItem.status).toBe(400);

    const add = await request(app).post(`/api/v1/care-users/${cu1.id}/favourites`).set('Authorization', `Bearer ${userToken1}`)
      .send({ phraseEn: 'I need help', phraseLabel: 'Help' });
    expect(add.status).toBe(201);
    const favId = add.body.data.favourite.id; created.favIds.add(favId);

    const cross = await request(app).get(`/api/v1/care-users/${cu1.id}/favourites`).set('Authorization', `Bearer ${userToken2}`);
    expect(cross.status).toBe(403);
    const crossDel = await request(app).delete(`/api/v1/favourites/${favId}`).set('Authorization', `Bearer ${userToken2}`);
    expect(crossDel.status).toBe(403);
  });
});
