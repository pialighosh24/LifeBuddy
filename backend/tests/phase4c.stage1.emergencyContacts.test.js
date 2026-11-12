process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), contactIds: new Set() };
function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const contactIds = Array.from(created.contactIds);
  const userIds = Array.from(created.userIds);
  if (contactIds.length) {
    const ph = contactIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM emergency_contacts WHERE id IN (${ph})`, contactIds);
  }
  if (userIds.length) {
    const ph = userIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM emergency_contacts WHERE care_user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  created.userIds.clear(); created.contactIds.clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'EC Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}
async function createCareUser(token, name = 'EC User') {
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

describe('Stage 1: Emergency Contacts', () => {
  test('Create/list/get/update/delete contacts with primary handling and MySQL persistence', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);

    const c1 = await request(app).post(`/api/v1/care-users/${cu.id}/emergency-contacts`).set('Authorization', `Bearer ${token}`)
      .send({ contactName: 'Mom', relationshipLabel: 'Mother', phoneNumber: '+8801700000001', email: 'mom@example.test', isPrimary: true });
    expect(c1.status).toBe(201);
    const id1 = c1.body.data.contact.id; created.contactIds.add(id1);
    expect(c1.body.data.contact.isPrimary).toBe(true);

    const c2 = await request(app).post(`/api/v1/care-users/${cu.id}/emergency-contacts`).set('Authorization', `Bearer ${token}`)
      .send({ contactName: 'Dad', relationshipLabel: 'Father', phoneNumber: '01700000002', isPrimary: true });
    expect(c2.status).toBe(201);
    const id2 = c2.body.data.contact.id; created.contactIds.add(id2);

    const [db] = await pool.execute('SELECT id, is_primary, contact_name, phone_number FROM emergency_contacts WHERE care_user_id = ? ORDER BY id ASC', [cu.id]);
    expect(db.length).toBe(2);
    const p1 = db.find(r => r.id === id1); const p2 = db.find(r => r.id === id2);
    expect(!!p2.is_primary).toBe(true); // latest set as primary
    expect(!!p1.is_primary).toBe(false);

    const list = await request(app).get(`/api/v1/care-users/${cu.id}/emergency-contacts`).set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.contacts.length).toBe(2);

    const get = await request(app).get(`/api/v1/emergency-contacts/${id1}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.data.contact.contactName).toBe('Mom');

    const upd = await request(app).patch(`/api/v1/emergency-contacts/${id1}`).set('Authorization', `Bearer ${token}`)
      .send({ contactName: 'Mother', isPrimary: true, phoneNumber: '+8801700000099' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.contact.isPrimary).toBe(true);
    const [afterUpd] = await pool.execute('SELECT is_primary FROM emergency_contacts WHERE id = ?', [id2]);
    expect(!!afterUpd[0].is_primary).toBe(false);

    const del = await request(app).delete(`/api/v1/emergency-contacts/${id1}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const [afterDel] = await pool.execute('SELECT id, is_primary FROM emergency_contacts WHERE care_user_id = ?', [cu.id]);
    expect(afterDel.length).toBe(1);
    expect(afterDel[0].id).toBe(id2);
    expect(!!afterDel[0].is_primary).toBe(true); // remaining becomes primary
    created.contactIds.delete(id1);
  });

  test('Invalid phone/email rejected and unauthorized/cross-caregiver access rejected', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const cu1 = await createCareUser(cg1.body.data.token, 'CU1');
    const cu2 = await createCareUser(cg2.body.data.token, 'CU2');

    const badPhone = await request(app).post(`/api/v1/care-users/${cu1.id}/emergency-contacts`).set('Authorization', `Bearer ${cg1.body.data.token}`)
      .send({ contactName: 'X', phoneNumber: 'abc' });
    expect(badPhone.status).toBe(400);
    const badEmail = await request(app).post(`/api/v1/care-users/${cu1.id}/emergency-contacts`).set('Authorization', `Bearer ${cg1.body.data.token}`)
      .send({ contactName: 'Y', phoneNumber: '0123456789', email: 'not-an-email' });
    expect(badEmail.status).toBe(400);

    const ok = await request(app).post(`/api/v1/care-users/${cu1.id}/emergency-contacts`).set('Authorization', `Bearer ${cg1.body.data.token}`)
      .send({ contactName: 'Z', phoneNumber: '0123456789' });
    expect(ok.status).toBe(201);
    const contactId = ok.body.data.contact.id; created.contactIds.add(contactId);

    const crossList = await request(app).get(`/api/v1/care-users/${cu1.id}/emergency-contacts`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect(crossList.status).toBe(403);
    const crossGet = await request(app).get(`/api/v1/emergency-contacts/${contactId}`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect(crossGet.status).toBe(403);
    const crossUpd = await request(app).patch(`/api/v1/emergency-contacts/${contactId}`).set('Authorization', `Bearer ${cg2.body.data.token}`).send({ contactName: 'Hack' });
    expect(crossUpd.status).toBe(403);

    const userToken = await loginCareUser(cg1.body.data.token, cu1.id);
    const selfList = await request(app).get(`/api/v1/care-users/${cu1.id}/emergency-contacts`).set('Authorization', `Bearer ${userToken}`);
    expect(selfList.status).toBe(200); // care-user may view own permitted contacts
    const otherUserToken = await loginCareUser(cg2.body.data.token, cu2.id);
    const crossUser = await request(app).get(`/api/v1/care-users/${cu1.id}/emergency-contacts`).set('Authorization', `Bearer ${otherUserToken}`);
    expect(crossUser.status).toBe(403);
  });
});
