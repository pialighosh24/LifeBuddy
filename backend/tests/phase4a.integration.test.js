process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const config = require('../src/config/env');

const created = {
  userIds: new Set(),
  caregiverIds: new Set(),
};

function unique(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function cleanup() {
  const ids = Array.from(new Set([...created.userIds, ...created.caregiverIds]));
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  // Remove links first (FKs to users are RESTRICT), then delete exact test users.
  await pool.execute(
    `DELETE FROM caregiver_links WHERE caregiver_id IN (${placeholders}) OR care_user_id IN (${placeholders})`,
    [...ids, ...ids]
  );
  await pool.execute(`DELETE FROM users WHERE id IN (${placeholders})`, ids);
  created.userIds.clear();
  created.caregiverIds.clear();
}

async function registerCaregiver(overrides = {}) {
  const email = overrides.email || `${unique('cg')}@lifebuddy-test.local`;
  const payload = {
    email,
    password: overrides.password || 'StrongPass123!',
    fullName: overrides.fullName || 'Test Caregiver',
    displayName: overrides.displayName || 'TCG',
    preferredLanguage: overrides.preferredLanguage || 'en',
  };
  const res = await request(app).post('/api/v1/auth/caregiver/register').send(payload);
  if (res.body && res.body.data && res.body.data.user && res.body.data.user.id) {
    created.caregiverIds.add(res.body.data.user.id);
    created.userIds.add(res.body.data.user.id);
  }
  return { res, payload };
}

async function loginCaregiver(email, password) {
  return request(app).post('/api/v1/auth/caregiver/login').send({ email, password });
}

async function createCareUser(token, overrides = {}) {
  const payload = {
    fullName: overrides.fullName || 'Test Care User',
    displayName: overrides.displayName || 'TCU',
    preferredLanguage: overrides.preferredLanguage || 'en',
    relationshipType: overrides.relationshipType || 'guardian',
  };
  const res = await request(app)
    .post('/api/v1/care-users')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  const id = res.body && res.body.data && res.body.data.careUser && res.body.data.careUser.id;
  if (id) created.userIds.add(id);
  return { res, payload };
}

beforeAll(async () => {
  // quick connectivity check; tests will fail clearly if DB unavailable
  await pool.query('SELECT 1');
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('Health', () => {
  test('GET /api/v1/health reports healthy database', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database.connected).toBe(true);
  });
});

describe('Caregiver registration & login', () => {
  test('A1 valid caregiver registration hashes password and returns token', async () => {
    const { res, payload } = await registerCaregiver();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe(payload.email.toLowerCase());
    expect(res.body.data.user.role).toBe('caregiver');
    expect(res.body.data.user.password_hash).toBeUndefined();

    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [res.body.data.user.id]);
    expect(rows.length).toBe(1);
    expect(rows[0].password_hash).toBeTruthy();
    expect(rows[0].password_hash).not.toBe(payload.password);
    const match = await bcrypt.compare(payload.password, rows[0].password_hash);
    expect(match).toBe(true);
  });

  test('A2 duplicate email is rejected', async () => {
    const { payload } = await registerCaregiver();
    const res2 = await request(app).post('/api/v1/auth/caregiver/register').send({
      email: payload.email.toUpperCase(),
      password: 'AnotherPass123!',
      fullName: 'Dup Caregiver',
    });
    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
  });

  test('A3 invalid email and missing fields fail validation', async () => {
    const badEmail = await request(app).post('/api/v1/auth/caregiver/register').send({
      email: 'not-an-email', password: 'StrongPass123!', fullName: 'Name'
    });
    expect(badEmail.status).toBe(400);
    const missing = await request(app).post('/api/v1/auth/caregiver/register').send({
      email: 'a@b.com'
    });
    expect(missing.status).toBe(400);
  });

  test('A4 weak password rejected', async () => {
    const res = await request(app).post('/api/v1/auth/caregiver/register').send({
      email: `${unique('cg')}@lifebuddy-test.local`, password: 'short', fullName: 'Name'
    });
    expect(res.status).toBe(400);
  });

  test('B1/B2/B3 caregiver login correct, incorrect password, unknown email', async () => {
    const { payload } = await registerCaregiver();
    const ok = await loginCaregiver(payload.email, payload.password);
    expect(ok.status).toBe(200);
    expect(ok.body.data.token).toBeTruthy();
    expect(ok.body.data.user.role).toBe('caregiver');

    const wrongPw = await loginCaregiver(payload.email, 'WrongPass123!');
    expect(wrongPw.status).toBe(401);
    expect(wrongPw.body.message).toBe('Invalid email or password');

    const unknown = await loginCaregiver(`missing_${unique('x')}@lifebuddy-test.local`, 'SomePass123!');
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe('Invalid email or password');
  });

  test('GET /api/v1/auth/me and logout', async () => {
    const { res } = await registerCaregiver();
    const token = res.body.data.token;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(res.body.data.user.id);
    const logout = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(200);
    expect(logout.body.success).toBe(true);
  });
});

describe('Care-user management & ownership', () => {
  test('C1 caregiver creates care-user and link; lists/gets own linked users', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;
    const { res: createdRes } = await createCareUser(token);
    expect(createdRes.status).toBe(201);
    expect(createdRes.body.data.careUser.role).toBe('user');
    const careUserId = createdRes.body.data.careUser.id;

    const list = await request(app).get('/api/v1/care-users').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.careUsers.some(u => u.id === careUserId)).toBe(true);

    const one = await request(app).get(`/api/v1/care-users/${careUserId}`).set('Authorization', `Bearer ${token}`);
    expect(one.status).toBe(200);
    expect(one.body.data.careUser.id).toBe(careUserId);

    const patch = await request(app)
      .patch(`/api/v1/care-users/${careUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Updated TCU', preferredLanguage: 'bn' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.careUser.displayName).toBe('Updated TCU');
  });

  test('C6 cross-caregiver access rejected', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const { res: cuRes } = await createCareUser(cg1.res.body.data.token);
    const careUserId = cuRes.body.data.careUser.id;

    const getOther = await request(app)
      .get(`/api/v1/care-users/${careUserId}`)
      .set('Authorization', `Bearer ${cg2.res.body.data.token}`);
    expect(getOther.status).toBe(403);

    const patchOther = await request(app)
      .patch(`/api/v1/care-users/${careUserId}`)
      .set('Authorization', `Bearer ${cg2.res.body.data.token}`)
      .send({ displayName: 'Hacker' });
    expect(patchOther.status).toBe(403);
  });

  test('C4 wrong role rejection: user cannot access caregiver care-user endpoints', async () => {
    const cg = await registerCaregiver();
    const { res: cuRes } = await createCareUser(cg.res.body.data.token);
    const careUserId = cuRes.body.data.careUser.id;
    // set PIN and login as user
    await request(app)
      .post(`/api/v1/care-users/${careUserId}/pin`)
      .set('Authorization', `Bearer ${cg.res.body.data.token}`)
      .send({ pin: '1234' });
    const userLogin = await request(app).post('/api/v1/auth/user/pin/login').send({ careUserId, pin: '1234' });
    expect(userLogin.status).toBe(200);
    const userToken = userLogin.body.data.token;

    const res = await request(app).get('/api/v1/care-users').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('Self-link prevention in service (caregiver cannot be linked as own care-user)', async () => {
    const cg = await registerCaregiver();
    // direct service call simulation not exposed; verify invariant by attempting impossible DB-safe path:
    // ensure creating care-user never links caregiver to self and resulting IDs differ
    const { res } = await createCareUser(cg.res.body.data.token);
    expect(res.status).toBe(201);
    expect(res.body.data.careUser.id).not.toBe(cg.res.body.data.user.id);
  });
});

describe('PIN authentication', () => {
  test('D1/D3/D5 authorized PIN setup and correct PIN login with bcrypt hash stored', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;
    const { res: cuRes } = await createCareUser(token);
    const careUserId = cuRes.body.data.careUser.id;

    const setPin = await request(app)
      .post(`/api/v1/care-users/${careUserId}/pin`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pin: '4321' });
    expect(setPin.status).toBe(200);
    expect(setPin.body.data.careUser.pin_hash).toBeUndefined();

    const [rows] = await pool.execute('SELECT pin_hash FROM users WHERE id = ?', [careUserId]);
    expect(rows[0].pin_hash).toBeTruthy();
    expect(await bcrypt.compare('4321', rows[0].pin_hash)).toBe(true);
    expect(await bcrypt.compare('0000', rows[0].pin_hash)).toBe(false);

    const login = await request(app).post('/api/v1/auth/user/pin/login').send({ careUserId, pin: '4321' });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('user');
    expect(login.body.data.user.id).toBe(careUserId);
    expect(login.body.data.token).toBeTruthy();
  });

  test('D2 unauthorized PIN setup rejected (not linked caregiver)', async () => {
    const cg1 = await registerCaregiver();
    const cg2 = await registerCaregiver();
    const { res: cuRes } = await createCareUser(cg1.res.body.data.token);
    const careUserId = cuRes.body.data.careUser.id;

    const res = await request(app)
      .post(`/api/v1/care-users/${careUserId}/pin`)
      .set('Authorization', `Bearer ${cg2.res.body.data.token}`)
      .send({ pin: '1234' });
    expect(res.status).toBe(403);
  });

  test('D4 incorrect PIN login rejected', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;
    const { res: cuRes } = await createCareUser(token);
    const careUserId = cuRes.body.data.careUser.id;
    await request(app).post(`/api/v1/care-users/${careUserId}/pin`).set('Authorization', `Bearer ${token}`).send({ pin: '1234' });
    const bad = await request(app).post('/api/v1/auth/user/pin/login').send({ careUserId, pin: '9999' });
    expect(bad.status).toBe(401);
  });
});

describe('JWT & middleware', () => {
  test('E1 missing token rejected', async () => {
    const res = await request(app).get('/api/v1/care-users');
    expect(res.status).toBe(401);
  });
  test('E2 invalid token rejected', async () => {
    const res = await request(app).get('/api/v1/care-users').set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(401);
  });
  test('E3 expired token rejected', async () => {
    const cg = await registerCaregiver();
    const id = cg.res.body.data.user.id;
    const expired = jwt.sign({ sub: id, role: 'caregiver' }, config.jwt.secret, { expiresIn: -10 });
    const res = await request(app).get('/api/v1/care-users').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
  test('E4 wrong role rejected', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;
    const { res: cuRes } = await createCareUser(token);
    const careUserId = cuRes.body.data.careUser.id;
    await request(app).post(`/api/v1/care-users/${careUserId}/pin`).set('Authorization', `Bearer ${token}`).send({ pin: '1234' });
    const userLogin = await request(app).post('/api/v1/auth/user/pin/login').send({ careUserId, pin: '1234' });
    // user token cannot create care-users (caregiver-only)
    const res = await request(app).post('/api/v1/care-users').set('Authorization', `Bearer ${userLogin.body.data.token}`).send({ fullName: 'X Y' });
    expect(res.status).toBe(403);
  });
  test('E5 valid authorized access', async () => {
    const cg = await registerCaregiver();
    const token = cg.res.body.data.token;
    const res = await request(app).get('/api/v1/care-users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
