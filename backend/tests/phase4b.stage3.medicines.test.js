process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), medicineIds: new Set() };
function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const userIds = Array.from(created.userIds);
  const medIds = Array.from(created.medicineIds);
  if (medIds.length) {
    const ph = medIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM medicine_logs WHERE medicine_id IN (${ph})`, medIds);
    await pool.execute(`DELETE FROM medicine_reminders WHERE medicine_id IN (${ph})`, medIds);
    await pool.execute(`DELETE FROM medicines WHERE id IN (${ph})`, medIds);
  }
  if (userIds.length) {
    const ph = userIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM medicine_logs WHERE care_user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM medicines WHERE care_user_id IN (${ph}) OR created_by_caregiver_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM routine_completions WHERE care_user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM routines WHERE care_user_id IN (${ph}) OR created_by_caregiver_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  created.userIds.clear();
  created.medicineIds.clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'Med Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}
async function createCareUser(token, name = 'Med Care User') {
  const res = await request(app).post('/api/v1/care-users').set('Authorization', `Bearer ${token}`).send({ fullName: name, preferredLanguage: 'en' });
  const id = res.body?.data?.careUser?.id;
  if (id) created.userIds.add(id);
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

describe('Stage 3: Medicines, Reminders, Logs', () => {
  test('Create/list/get/update/deactivate medicine with MySQL persistence', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);

    const create = await request(app)
      .post(`/api/v1/care-users/${cu.id}/medicines`)
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineName: 'Vitamin D', prescribedInstructions: 'Take with water', notes: 'Morning', startDate: '2026-01-01', isActive: true });
    expect(create.status).toBe(201);
    const medId = create.body.data.medicine.id;
    expect(medId).toBeTruthy();
    created.medicineIds.add(medId);

    const [rows] = await pool.execute('SELECT * FROM medicines WHERE id = ?', [medId]);
    expect(rows.length).toBe(1);
    expect(rows[0].care_user_id).toBe(cu.id);
    expect(rows[0].medicine_name).toBe('Vitamin D');
    expect(rows[0].prescribed_instructions).toBe('Take with water');
    expect(!!rows[0].is_active).toBe(true);

    const list = await request(app).get(`/api/v1/care-users/${cu.id}/medicines`).set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.medicines.some(m => m.id === medId)).toBe(true);

    const get = await request(app).get(`/api/v1/medicines/${medId}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.data.medicine.id).toBe(medId);

    const upd = await request(app).patch(`/api/v1/medicines/${medId}`).set('Authorization', `Bearer ${token}`).send({ medicineName: 'Vitamin D3', notes: 'After breakfast', isActive: true });
    expect(upd.status).toBe(200);
    expect(upd.body.data.medicine.medicineName).toBe('Vitamin D3');

    const deact = await request(app).delete(`/api/v1/medicines/${medId}`).set('Authorization', `Bearer ${token}`);
    expect(deact.status).toBe(200);
    const [after] = await pool.execute('SELECT is_active FROM medicines WHERE id = ?', [medId]);
    expect(!!after[0].is_active).toBe(false);
  });

  test('Create/update/delete reminders and retrieve reminder info', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const med = await request(app).post(`/api/v1/care-users/${cu.id}/medicines`).set('Authorization', `Bearer ${token}`).send({ medicineName: 'Med A' });
    const medId = med.body.data.medicine.id; created.medicineIds.add(medId);

    const createRem = await request(app).post(`/api/v1/medicines/${medId}/reminders`).set('Authorization', `Bearer ${token}`).send({ reminderTime: '08:30', frequency: 'daily', reminderLabel: 'Morning', isActive: true });
    expect(createRem.status).toBe(201);
    const remId = createRem.body.data.reminder.id;
    expect(createRem.body.data.reminder.reminderTime).toMatch(/^08:30/);

    const [dbRem] = await pool.execute('SELECT * FROM medicine_reminders WHERE id = ?', [remId]);
    expect(dbRem.length).toBe(1);
    expect(dbRem[0].medicine_id).toBe(medId);
    expect(dbRem[0].frequency).toBe('daily');

    const listRem = await request(app).get(`/api/v1/medicines/${medId}/reminders`).set('Authorization', `Bearer ${token}`);
    expect(listRem.status).toBe(200);
    expect(listRem.body.data.reminders.some(r => r.id === remId)).toBe(true);

    const updRem = await request(app).patch(`/api/v1/medicines/${medId}/reminders/${remId}`).set('Authorization', `Bearer ${token}`).send({ reminderTime: '09:00', frequency: 'weekly', daysOfWeek: 'MON,WED', isActive: true });
    expect(updRem.status).toBe(200);
    expect(updRem.body.data.reminder.frequency).toBe('weekly');
    expect(updRem.body.data.reminder.daysOfWeek).toBe('MON,WED');

    const delRem = await request(app).delete(`/api/v1/medicines/${medId}/reminders/${remId}`).set('Authorization', `Bearer ${token}`);
    expect(delRem.status).toBe(200);
    const [after] = await pool.execute('SELECT id FROM medicine_reminders WHERE id = ?', [remId]);
    expect(after.length).toBe(0);
  });

  test('Record taken/skipped logs and retrieve medicine/history; care-user can view own', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const med = await request(app).post(`/api/v1/care-users/${cu.id}/medicines`).set('Authorization', `Bearer ${token}`).send({ medicineName: 'Med B' });
    const medId = med.body.data.medicine.id; created.medicineIds.add(medId);
    const rem = await request(app).post(`/api/v1/medicines/${medId}/reminders`).set('Authorization', `Bearer ${token}`).send({ reminderTime: '07:00' });
    const remId = rem.body.data.reminder.id;

    const taken = await request(app).post(`/api/v1/medicines/${medId}/logs`).set('Authorization', `Bearer ${token}`).send({ status: 'taken', scheduledFor: '2026-11-10T07:00:00.000Z', reminderId: remId, notes: 'ok' });
    expect(taken.status).toBe(201);
    expect(taken.body.data.log.status).toBe('taken');
    const skipped = await request(app).post(`/api/v1/medicines/${medId}/logs`).set('Authorization', `Bearer ${token}`).send({ status: 'skipped', scheduledFor: '2026-11-11T07:00:00.000Z', reminderId: remId });
    expect(skipped.status).toBe(201);
    expect(skipped.body.data.log.status).toBe('skipped');

    const [dbLogs] = await pool.execute('SELECT status, medicine_id, care_user_id FROM medicine_logs WHERE medicine_id = ? ORDER BY scheduled_for ASC', [medId]);
    expect(dbLogs.length).toBe(2);
    expect(dbLogs.map(l => l.status)).toEqual(['taken', 'skipped']);
    expect(dbLogs.every(l => l.care_user_id === cu.id)).toBe(true);

    const logs = await request(app).get(`/api/v1/medicines/${medId}/logs`).set('Authorization', `Bearer ${token}`);
    expect(logs.status).toBe(200);
    expect(logs.body.data.logs.length).toBe(2);

    const history = await request(app).get(`/api/v1/care-users/${cu.id}/medicine-history`).set('Authorization', `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.history.length).toBeGreaterThanOrEqual(2);

    // care-user can view own reminders/history
    const userToken = await loginCareUser(token, cu.id);
    const remView = await request(app).get(`/api/v1/medicines/${medId}/reminders`).set('Authorization', `Bearer ${userToken}`);
    expect(remView.status).toBe(200);
    const histView = await request(app).get(`/api/v1/care-users/${cu.id}/medicine-history`).set('Authorization', `Bearer ${userToken}`);
    expect(histView.status).toBe(200);
  });

  test('Reject invalid status/values, unauthorized modification, and cross-user access', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const cu1 = await createCareUser(cg1.body.data.token, 'CU1');
    const cu2 = await createCareUser(cg2.body.data.token, 'CU2');
    const med = await request(app).post(`/api/v1/care-users/${cu1.id}/medicines`).set('Authorization', `Bearer ${cg1.body.data.token}`).send({ medicineName: 'Med X' });
    const medId = med.body.data.medicine.id; created.medicineIds.add(medId);
    const rem = await request(app).post(`/api/v1/medicines/${medId}/reminders`).set('Authorization', `Bearer ${cg1.body.data.token}`).send({ reminderTime: '10:00' });
    const remId = rem.body.data.reminder.id;

    const badStatus = await request(app).post(`/api/v1/medicines/${medId}/logs`).set('Authorization', `Bearer ${cg1.body.data.token}`).send({ status: 'maybe', scheduledFor: '2026-11-10T10:00:00.000Z' });
    expect(badStatus.status).toBe(400);

    const badTime = await request(app).post(`/api/v1/medicines/${medId}/reminders`).set('Authorization', `Bearer ${cg1.body.data.token}`).send({ reminderTime: '25:99' });
    expect(badTime.status).toBe(400);

    const crossGet = await request(app).get(`/api/v1/medicines/${medId}`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect(crossGet.status).toBe(403);
    const crossUpd = await request(app).patch(`/api/v1/medicines/${medId}`).set('Authorization', `Bearer ${cg2.body.data.token}`).send({ medicineName: 'Hack' });
    expect(crossUpd.status).toBe(403);
    const crossRem = await request(app).patch(`/api/v1/medicines/${medId}/reminders/${remId}`).set('Authorization', `Bearer ${cg2.body.data.token}`).send({ reminderLabel: 'x' });
    expect(crossRem.status).toBe(403);

    const userTokenCu2 = await loginCareUser(cg2.body.data.token, cu2.id);
    const crossUser = await request(app).get(`/api/v1/medicines/${medId}`).set('Authorization', `Bearer ${userTokenCu2}`);
    expect(crossUser.status).toBe(403);
  });

  test('DEF-6F-001: partial PATCH omitting stored dates (mysql2 DATE handling) and date validation behavior', async () => {
    function normDbDate(v) {
      if (v === null || v === undefined) return null;
      if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      if (typeof v === 'string') return v.slice(0, 10);
      return String(v).slice(0, 10);
    }

    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token, 'DEF6F User');

    const create = await request(app)
      .post(`/api/v1/care-users/${cu.id}/medicines`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        medicineName: 'Date Med',
        prescribedInstructions: 'Keep',
        notes: 'Original',
        startDate: '2026-01-10',
        endDate: '2026-01-20',
        isActive: true,
      });
    expect(create.status).toBe(201);
    const medId = create.body.data.medicine.id;
    created.medicineIds.add(medId);

    const before = await request(app).get(`/api/v1/medicines/${medId}`).set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);

    // 1) Partial PATCH omitting both dates (non-date fields only) should succeed and retain dates
    const patchNoDates = await request(app)
      .patch(`/api/v1/medicines/${medId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ medicineName: 'Date Med Updated', notes: 'Changed', isActive: true });
    expect(patchNoDates.status).toBe(200);
    expect(patchNoDates.body.data.medicine.medicineName).toBe('Date Med Updated');
    expect(patchNoDates.body.data.medicine.notes).toBe('Changed');
    expect(patchNoDates.body.data.medicine.prescribedInstructions).toBe('Keep');
    expect(normDbDate(patchNoDates.body.data.medicine.startDate)).toBe('2026-01-10');
    expect(normDbDate(patchNoDates.body.data.medicine.endDate)).toBe('2026-01-20');

    const [dbNoDates] = await pool.execute('SELECT medicine_name, prescribed_instructions, notes, start_date, end_date, is_active, care_user_id, created_by_caregiver_id FROM medicines WHERE id = ?', [medId]);
    expect(dbNoDates.length).toBe(1);
    expect(dbNoDates[0].medicine_name).toBe('Date Med Updated');
    expect(dbNoDates[0].prescribed_instructions).toBe('Keep');
    expect(dbNoDates[0].notes).toBe('Changed');
    expect(!!dbNoDates[0].is_active).toBe(true);
    expect(normDbDate(dbNoDates[0].start_date)).toBe('2026-01-10');
    expect(normDbDate(dbNoDates[0].end_date)).toBe('2026-01-20');
    expect(dbNoDates[0].care_user_id).toBe(cu.id);
    expect(dbNoDates[0].created_by_caregiver_id).toBe(cg.body.data.user.id);

    // 2) Partial PATCH omitting startDate (keep existing startDate)
    const patchKeepStart = await request(app)
      .patch(`/api/v1/medicines/${medId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ endDate: '2026-01-25', notes: 'End moved' });
    expect(patchKeepStart.status).toBe(200);
    expect(normDbDate(patchKeepStart.body.data.medicine.startDate)).toBe('2026-01-10');
    expect(normDbDate(patchKeepStart.body.data.medicine.endDate)).toBe('2026-01-25');
    expect(patchKeepStart.body.data.medicine.notes).toBe('End moved');

    // 3) Partial PATCH omitting endDate (keep existing endDate)
    const patchKeepEnd = await request(app)
      .patch(`/api/v1/medicines/${medId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-01-05', medicineName: 'Date Med Final' });
    expect(patchKeepEnd.status).toBe(200);
    expect(normDbDate(patchKeepEnd.body.data.medicine.startDate)).toBe('2026-01-05');
    expect(normDbDate(patchKeepEnd.body.data.medicine.endDate)).toBe('2026-01-25');
    expect(patchKeepEnd.body.data.medicine.medicineName).toBe('Date Med Final');

    // 4) Explicit valid dates
    const patchExplicit = await request(app)
      .patch(`/api/v1/medicines/${medId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-02-01', endDate: '2026-02-10' });
    expect(patchExplicit.status).toBe(200);
    expect(normDbDate(patchExplicit.body.data.medicine.startDate)).toBe('2026-02-01');
    expect(normDbDate(patchExplicit.body.data.medicine.endDate)).toBe('2026-02-10');

    // 5) Invalid range rejected
    const invalidRange = await request(app)
      .patch(`/api/v1/medicines/${medId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-03-10', endDate: '2026-03-01' });
    expect(invalidRange.status).toBe(400);
    expect(invalidRange.body.message || invalidRange.body.error || '').toMatch(/endDate must be on or after startDate/i);

    // 6) Supported null/optional date behavior (clear endDate, then clear startDate)
    const clearEnd = await request(app)
      .patch(`/api/v1/medicines/${medId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ endDate: null, notes: 'No end date' });
    expect(clearEnd.status).toBe(200);
    expect(clearEnd.body.data.medicine.endDate === null || clearEnd.body.data.medicine.endDate === undefined).toBe(true);
    expect(normDbDate(clearEnd.body.data.medicine.startDate)).toBe('2026-02-01');

    const clearStart = await request(app)
      .patch(`/api/v1/medicines/${medId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: null });
    expect(clearStart.status).toBe(200);
    expect(clearStart.body.data.medicine.startDate === null || clearStart.body.data.medicine.startDate === undefined).toBe(true);
    expect(clearStart.body.data.medicine.endDate === null || clearStart.body.data.medicine.endDate === undefined).toBe(true);

    const [dbFinal] = await pool.execute('SELECT start_date, end_date, medicine_name, prescribed_instructions, care_user_id FROM medicines WHERE id = ?', [medId]);
    expect(dbFinal.length).toBe(1);
    expect(dbFinal[0].start_date).toBeNull();
    expect(dbFinal[0].end_date).toBeNull();
    expect(dbFinal[0].medicine_name).toBe('Date Med Final');
    expect(dbFinal[0].prescribed_instructions).toBe('Keep');
    expect(dbFinal[0].care_user_id).toBe(cu.id);
  });
});
