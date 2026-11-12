process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const created = { userIds: new Set(), routineIds: new Set() };

function unique(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

async function cleanup() {
  const userIds = Array.from(created.userIds);
  const routineIds = Array.from(created.routineIds);
  if (routineIds.length) {
    const ph = routineIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM routine_completions WHERE routine_id IN (${ph})`, routineIds);
    await pool.execute(`DELETE FROM routine_steps WHERE routine_id IN (${ph})`, routineIds);
    await pool.execute(`DELETE FROM routines WHERE id IN (${ph})`, routineIds);
  }
  if (userIds.length) {
    const ph = userIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM routine_completions WHERE care_user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM routines WHERE care_user_id IN (${ph}) OR created_by_caregiver_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM user_preferences WHERE user_id IN (${ph})`, userIds);
    await pool.execute(`DELETE FROM caregiver_links WHERE caregiver_id IN (${ph}) OR care_user_id IN (${ph})`, [...userIds, ...userIds]);
    await pool.execute(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }
  created.userIds.clear();
  created.routineIds.clear();
}

async function registerCaregiver() {
  const email = `${unique('cg')}@lifebuddy-test.local`;
  const res = await request(app).post('/api/v1/auth/caregiver/register').send({ email, password: 'StrongPass123!', fullName: 'Routine Caregiver' });
  if (res.body?.data?.user?.id) created.userIds.add(res.body.data.user.id);
  return res;
}

async function createCareUser(token, name = 'Routine Care User') {
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

describe('Stage 2: Routines, Steps, Completions', () => {
  test('Create/list/get/update/delete routine with ordered steps and MySQL persistence', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    expect(cu.res.status).toBe(201);

    const create = await request(app)
      .post(`/api/v1/care-users/${cu.id}/routines`)
      .set('Authorization', `Bearer ${token}`)
      .send({ titleEn: 'Morning', titleBn: 'সকাল', descriptionEn: 'Morning routine', isActive: true, steps: [{ instructionEn: 'Brush teeth' }, { instructionEn: 'Wash face', instructionBn: 'মুখ ধোয়া' }] });
    expect(create.status).toBe(201);
    const routineId = create.body.data.routine.id;
    expect(routineId).toBeTruthy();
    created.routineIds.add(routineId);
    expect(create.body.data.steps).toHaveLength(2);
    expect(create.body.data.steps[0].stepOrder).toBe(1);
    expect(create.body.data.steps[1].stepOrder).toBe(2);

    const [rRows] = await pool.execute('SELECT * FROM routines WHERE id = ?', [routineId]);
    expect(rRows.length).toBe(1);
    expect(rRows[0].care_user_id).toBe(cu.id);
    expect(rRows[0].title_en).toBe('Morning');
    const [sRows] = await pool.execute('SELECT * FROM routine_steps WHERE routine_id = ? ORDER BY step_order ASC', [routineId]);
    expect(sRows).toHaveLength(2);
    expect(sRows[0].instruction_en).toBe('Brush teeth');

    const list = await request(app).get(`/api/v1/care-users/${cu.id}/routines`).set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.routines.some(r => r.id === routineId && r.stepCount === 2)).toBe(true);

    const get = await request(app).get(`/api/v1/routines/${routineId}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.data.routine.id).toBe(routineId);
    expect(get.body.data.steps).toHaveLength(2);

    const upd = await request(app).patch(`/api/v1/routines/${routineId}`).set('Authorization', `Bearer ${token}`).send({ titleEn: 'Morning Updated', isActive: false });
    expect(upd.status).toBe(200);
    expect(upd.body.data.routine.titleEn).toBe('Morning Updated');
    expect(upd.body.data.routine.isActive).toBe(false);

    const del = await request(app).delete(`/api/v1/routines/${routineId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const [after] = await pool.execute('SELECT id FROM routines WHERE id = ?', [routineId]);
    expect(after.length).toBe(0);
    created.routineIds.delete(routineId);
  });

  test('Add/update/delete/reorder steps with transactions and ordering consistency', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const create = await request(app).post(`/api/v1/care-users/${cu.id}/routines`).set('Authorization', `Bearer ${token}`).send({ titleEn: 'Evening', steps: [{ instructionEn: 'Step 1' }, { instructionEn: 'Step 2' }] });
    const routineId = create.body.data.routine.id; created.routineIds.add(routineId);
    let step1 = create.body.data.steps[0].id;
    let step2 = create.body.data.steps[1].id;

    const add = await request(app).post(`/api/v1/routines/${routineId}/steps`).set('Authorization', `Bearer ${token}`).send({ instructionEn: 'Step 3' });
    expect(add.status).toBe(201);
    expect(add.body.data.step.stepOrder).toBe(3);
    const step3 = add.body.data.step.id;

    const updStep = await request(app).patch(`/api/v1/routines/${routineId}/steps/${step2}`).set('Authorization', `Bearer ${token}`).send({ instructionEn: 'Step 2 updated', imageKey: 'img_brush' });
    expect(updStep.status).toBe(200);
    expect(updStep.body.data.step.instructionEn).toBe('Step 2 updated');
    expect(updStep.body.data.step.imageKey).toBe('img_brush');

    const reorder = await request(app).patch(`/api/v1/routines/${routineId}/steps/reorder`).set('Authorization', `Bearer ${token}`).send({ orderedStepIds: [step3, step1, step2] });
    expect(reorder.status).toBe(200);
    const orders = reorder.body.data.steps.map(s => ({ id: s.id, order: s.stepOrder }));
    expect(orders).toEqual([{ id: step3, order: 1 }, { id: step1, order: 2 }, { id: step2, order: 3 }]);
    const [dbSteps] = await pool.execute('SELECT id, step_order FROM routine_steps WHERE routine_id = ? ORDER BY step_order ASC', [routineId]);
    expect(dbSteps.map(s => [s.id, s.step_order])).toEqual([[step3, 1], [step1, 2], [step2, 3]]);

    const delStep = await request(app).delete(`/api/v1/routines/${routineId}/steps/${step1}`).set('Authorization', `Bearer ${token}`);
    expect(delStep.status).toBe(200);
    const [afterDel] = await pool.execute('SELECT id, step_order FROM routine_steps WHERE routine_id = ? ORDER BY step_order ASC', [routineId]);
    expect(afterDel.map(s => [s.id, s.step_order])).toEqual([[step3, 1], [step2, 2]]);

    const badReorder = await request(app).patch(`/api/v1/routines/${routineId}/steps/reorder`).set('Authorization', `Bearer ${token}`).send({ orderedStepIds: [step3] });
    expect(badReorder.status).toBe(400);
  });

  test('Record completions, retrieve history, progress; care-user view allowed but no definition modify', async () => {
    const cg = await registerCaregiver();
    const token = cg.body.data.token;
    const cu = await createCareUser(token);
    const create = await request(app).post(`/api/v1/care-users/${cu.id}/routines`).set('Authorization', `Bearer ${token}`).send({ titleEn: 'Daily', steps: [{ instructionEn: 'A' }, { instructionEn: 'B' }] });
    const routineId = create.body.data.routine.id; created.routineIds.add(routineId);
    const [s1, s2] = create.body.data.steps;
    const today = new Date().toISOString().slice(0, 10);

    const comp1 = await request(app).post(`/api/v1/routines/${routineId}/completions`).set('Authorization', `Bearer ${token}`).send({ routineStepId: s1.id, completionStatus: 'completed', completedAt: `${today}T08:00:00.000Z` });
    expect(comp1.status).toBe(201);
    const comp2 = await request(app).post(`/api/v1/routines/${routineId}/completions`).set('Authorization', `Bearer ${token}`).send({ routineStepId: s2.id, completionStatus: 'skipped', completedAt: `${today}T08:05:00.000Z` });
    expect(comp2.status).toBe(201);

    const [dbComp] = await pool.execute('SELECT * FROM routine_completions WHERE routine_id = ?', [routineId]);
    expect(dbComp.length).toBe(2);

    const hist = await request(app).get(`/api/v1/routines/${routineId}/completions`).set('Authorization', `Bearer ${token}`).query({ date: today });
    expect(hist.status).toBe(200);
    expect(hist.body.data.completions.length).toBe(2);

    const progress = await request(app).get(`/api/v1/care-users/${cu.id}/routine-progress`).set('Authorization', `Bearer ${token}`).query({ date: today });
    expect(progress.status).toBe(200);
    const rp = progress.body.data.progress.find(p => p.routineId === routineId);
    expect(rp).toBeTruthy();
    expect(rp.totalSteps).toBe(2);
    expect(rp.completedSteps).toBe(1);
    expect(rp.skippedSteps).toBe(1);
    expect(rp.completionRecords).toBe(2);
    expect(rp.progressPercent).toBe(50);

    // Care-user can view own routines/completions but cannot modify definitions
    const userToken = await loginCareUser(token, cu.id);
    expect(userToken).toBeTruthy();
    const view = await request(app).get(`/api/v1/care-users/${cu.id}/routines`).set('Authorization', `Bearer ${userToken}`);
    expect(view.status).toBe(200);
    const userComp = await request(app).post(`/api/v1/routines/${routineId}/completions`).set('Authorization', `Bearer ${userToken}`).send({ routineStepId: s1.id, completionStatus: 'completed', completedAt: `${today}T09:00:00.000Z` });
    expect([200, 201]).toContain(userComp.status);
    const mod = await request(app).patch(`/api/v1/routines/${routineId}`).set('Authorization', `Bearer ${userToken}`).send({ titleEn: 'Hack' });
    expect(mod.status).toBe(403);
  });

  test('Reject invalid IDs and cross-user/cross-caregiver access', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const cu1 = await createCareUser(cg1.body.data.token, 'CU1');
    const cu2 = await createCareUser(cg2.body.data.token, 'CU2');
    const create = await request(app).post(`/api/v1/care-users/${cu1.id}/routines`).set('Authorization', `Bearer ${cg1.body.data.token}`).send({ titleEn: 'R1', steps: [{ instructionEn: 'S1' }] });
    const routineId = create.body.data.routine.id; created.routineIds.add(routineId);
    const stepId = create.body.data.steps[0].id;

    const crossGet = await request(app).get(`/api/v1/routines/${routineId}`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect(crossGet.status).toBe(403);
    const crossList = await request(app).get(`/api/v1/care-users/${cu1.id}/routines`).set('Authorization', `Bearer ${cg2.body.data.token}`);
    expect(crossList.status).toBe(403);
    const userTokenCu2 = await loginCareUser(cg2.body.data.token, cu2.id);
    const crossUser = await request(app).get(`/api/v1/routines/${routineId}`).set('Authorization', `Bearer ${userTokenCu2}`);
    expect(crossUser.status).toBe(403);

    const badRoutine = await request(app).get('/api/v1/routines/999999999').set('Authorization', `Bearer ${cg1.body.data.token}`);
    expect([403,404]).toContain(badRoutine.status); // not linked/found -> 404 by access lookup
    const badStep = await request(app).patch(`/api/v1/routines/${routineId}/steps/999999999`).set('Authorization', `Bearer ${cg1.body.data.token}`).send({ instructionEn: 'x' });
    expect(badStep.status).toBe(404);

    const badCompletion = await request(app).post(`/api/v1/routines/${routineId}/completions`).set('Authorization', `Bearer ${cg1.body.data.token}`).send({ routineStepId: 999999999 });
    expect([400,404]).toContain(badCompletion.status);
  });
});
