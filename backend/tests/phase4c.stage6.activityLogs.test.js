process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), routineIds: new Set(), medicineIds: new Set(), contactIds: new Set(), sosIds: new Set(), activityIds: new Set() };
function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const userIds = Array.from(created.userIds);
  const activityIds = Array.from(created.activityIds);
  if (activityIds.length) {
    const ph = activityIds.map(()=>'?').join(',');
    await pool.execute(`DELETE FROM activity_logs WHERE id IN (${ph})`, activityIds);
  }
  if (userIds.length) {
    const ph = userIds.map(()=>'?').join(',');
    await pool.execute(`DELETE FROM activity_logs WHERE actor_user_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
  }
  const routineIds = Array.from(created.routineIds);
  if (routineIds.length) { const ph=routineIds.map(()=>'?').join(','); await pool.execute(`DELETE FROM routine_completions WHERE routine_id IN (${ph})`, routineIds); await pool.execute(`DELETE FROM routine_steps WHERE routine_id IN (${ph})`, routineIds); await pool.execute(`DELETE FROM routines WHERE id IN (${ph})`, routineIds); }
  const medIds = Array.from(created.medicineIds);
  if (medIds.length) { const ph=medIds.map(()=>'?').join(','); await pool.execute(`DELETE FROM medicine_logs WHERE medicine_id IN (${ph})`, medIds); await pool.execute(`DELETE FROM medicine_reminders WHERE medicine_id IN (${ph})`, medIds); await pool.execute(`DELETE FROM medicines WHERE id IN (${ph})`, medIds); }
  const sosIds = Array.from(created.sosIds);
  if (sosIds.length) { const ph=sosIds.map(()=>'?').join(','); await pool.execute(`DELETE FROM sos_alerts WHERE id IN (${ph})`, sosIds); }
  const contactIds = Array.from(created.contactIds);
  if (contactIds.length) { const ph=contactIds.map(()=>'?').join(','); await pool.execute(`DELETE FROM emergency_contacts WHERE id IN (${ph})`, contactIds); }
  if (userIds.length) {
    const ph = userIds.map(()=>'?').join(',');
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  for (const k of Object.keys(created)) created[k].clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'Act Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}
async function createCareUser(token, name='Act User') {
  const res = await request(app).post('/api/v1/care-users').set('Authorization', `Bearer ${token}`).send({ fullName: name, preferredLanguage: 'en' });
  const id = res.body?.data?.careUser?.id; if (id) created.userIds.add(id);
  return { res, id };
}
async function loginCareUser(caregiverToken, careUserId, pin='1234') {
  await request(app).post(`/api/v1/care-users/${careUserId}/pin`).set('Authorization', `Bearer ${caregiverToken}`).send({ pin });
  const login = await request(app).post('/api/v1/auth/user/pin/login').send({ careUserId, pin });
  return login.body?.data?.token;
}

async function trackLogsForUser(userId) {
  const [rows] = await pool.execute('SELECT id, event_type, actor_user_id, care_user_id, metadata_json, summary FROM activity_logs WHERE actor_user_id = ? OR care_user_id = ? ORDER BY id DESC LIMIT 50', [userId, userId]);
  rows.forEach(r => created.activityIds.add(r.id));
  return rows;
}

beforeAll(async()=>{await pool.query('SELECT 1');});
afterEach(async()=>{await cleanup();});
afterAll(async()=>{await cleanup(); await pool.end();});

describe('Stage 6: Activity Logs', () => {
  test('Important operations create logs with correct actor/care-user and no secrets', async () => {
    const cg = await registerCaregiver();
    const cgToken = cg.body.data.token;
    const cgId = cg.body.data.user.id;
    const cu = await createCareUser(cgToken);
    const userToken = await loginCareUser(cgToken, cu.id);

    // preference update
    const pref = await request(app).put(`/api/v1/care-users/${cu.id}/preferences`).set('Authorization', `Bearer ${cgToken}`).send({ textSize: 'medium' });
    expect(pref.status).toBe(200);
    // routine completion
    const routine = await request(app).post(`/api/v1/care-users/${cu.id}/routines`).set('Authorization', `Bearer ${cgToken}`).send({ titleEn: 'Log Routine', steps: [{ instructionEn: 'Step A' }] });
    expect(routine.status).toBe(201);
    const routineId = routine.body.data.routine.id; created.routineIds.add(routineId);
    const stepId = routine.body.data.steps[0].id;
    const comp = await request(app).post(`/api/v1/routines/${routineId}/completions`).set('Authorization', `Bearer ${userToken}`).send({ routineStepId: stepId, completionStatus: 'completed' });
    expect(comp.status).toBe(201);
    // medicine log
    const med = await request(app).post(`/api/v1/care-users/${cu.id}/medicines`).set('Authorization', `Bearer ${cgToken}`).send({ medicineName: 'Log Med' });
    expect(med.status).toBe(201);
    const medId = med.body.data.medicine.id; created.medicineIds.add(medId);
    const mlog = await request(app).post(`/api/v1/medicines/${medId}/logs`).set('Authorization', `Bearer ${cgToken}`).send({ status: 'taken', scheduledFor: '2026-11-10T07:00:00.000Z' });
    expect(mlog.status).toBe(201);
    // sos create + ack
    const sos = await request(app).post('/api/v1/sos').set('Authorization', `Bearer ${userToken}`).send({ locationStatus: 'unavailable' });
    expect(sos.status).toBe(201);
    const alertId = sos.body.data.alert.id; created.sosIds.add(alertId);
    expect(sos.body.data.activityLog).toBeDefined(); // separate outcome documented/returned
    const ack = await request(app).patch(`/api/v1/sos/${alertId}/acknowledge`).set('Authorization', `Bearer ${cgToken}`);
    expect(ack.status).toBe(200);
    expect(ack.body.data.activityLog).toBeDefined();
    // emergency contact changes
    const ec = await request(app).post(`/api/v1/care-users/${cu.id}/emergency-contacts`).set('Authorization', `Bearer ${cgToken}`).send({ contactName: 'EC', phoneNumber: '0123456789' });
    expect(ec.status).toBe(201);
    const contactId = ec.body.data.contact.id; created.contactIds.add(contactId);
    await request(app).patch(`/api/v1/emergency-contacts/${contactId}`).set('Authorization', `Bearer ${cgToken}`).send({ contactName: 'EC2' });
    await request(app).delete(`/api/v1/emergency-contacts/${contactId}`).set('Authorization', `Bearer ${cgToken}`);
    created.contactIds.delete(contactId);

    const logs = await trackLogsForUser(cu.id);
    const types = logs.map(l => l.event_type);
    expect(types).toEqual(expect.arrayContaining(['USER_LOGIN','PREFERENCES_UPDATED','ROUTINE_COMPLETION_RECORDED','MEDICINE_LOG_CREATED','SOS_CREATED','SOS_ACKNOWLEDGED','EMERGENCY_CONTACT_CREATED','EMERGENCY_CONTACT_UPDATED','EMERGENCY_CONTACT_DELETED']));

    // verify actor/care-user identity and no secrets
    for (const l of logs) {
      const meta = typeof l.metadata_json === 'string' ? l.metadata_json : JSON.stringify(l.metadata_json || {});
      expect(meta).not.toMatch(/password|pin|token|secret/i);
      expect(l.summary).not.toMatch(/password|pin|token|secret/i);
    }
    const sosLog = logs.find(l => l.event_type === 'SOS_CREATED');
    expect(Number(sosLog.actor_user_id)).toBe(cu.id);
    expect(Number(sosLog.care_user_id)).toBe(cu.id);

    // caregiver history access (linked) and self access
    const hist = await request(app).get(`/api/v1/care-users/${cu.id}/activity`).set('Authorization', `Bearer ${cgToken}`);
    expect(hist.status).toBe(200);
    expect(hist.body.data.activities.length).toBeGreaterThan(0);
    const me = await request(app).get('/api/v1/activity/me').set('Authorization', `Bearer ${cgToken}`);
    expect(me.status).toBe(200);

    // caregiver login log should exist (perform login to generate event)
    const cgLogin = await request(app).post('/api/v1/auth/caregiver/login').send({ email: cg.body.data.user.email, password: 'StrongPass123!' });
    expect(cgLogin.status).toBe(200);
    const [cgLogs] = await pool.execute('SELECT id, event_type FROM activity_logs WHERE actor_user_id = ? AND event_type = ?', [cgId, 'CAREGIVER_LOGIN']);
    cgLogs.forEach(r => created.activityIds.add(r.id));
    expect(cgLogs.length).toBeGreaterThan(0);
  });

  test('Reject unauthorized history access and no arbitrary modification/deletion APIs', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const cu1 = await createCareUser(cg1.body.data.token, 'CU1');
    const cu2 = await createCareUser(cg2.body.data.token, 'CU2');
    await loginCareUser(cg1.body.data.token, cu1.id); // create some activity
    await trackLogsForUser(cu1.id);

    const cross = await request(app).get(`/api/v1/care-users/${cu1.id}/activity`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect(cross.status).toBe(403);
    const unauth = await request(app).get(`/api/v1/care-users/${cu1.id}/activity`);
    expect(unauth.status).toBe(401);

    // no modification/deletion endpoints exposed
    const del = await request(app).delete('/api/v1/activity/1').set('Authorization', `Bearer ${cg1.body.data.token}`);
    expect([404,405]).toContain(del.status);
    const patch = await request(app).patch('/api/v1/activity/1').set('Authorization', `Bearer ${cg1.body.data.token}`).send({ summary: 'x' });
    expect([404,405]).toContain(patch.status);
  });
});
