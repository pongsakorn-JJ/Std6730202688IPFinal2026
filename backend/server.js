require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = 'mock-jwt-token';

app.use(cors());
app.use(express.json());

// ---------- Data store (MySQL if DB_NAME is set, otherwise in-memory) ----------
const store = process.env.DB_NAME ? require('./store/mysql') : require('./store/memory');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Auth middleware ----------
function requireAuth(req, res, next) {
  if ((req.headers.authorization || '') === `Bearer ${TOKEN}`) return next();
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

// ---------- Validation ----------
function parseEmployeeBody(body) {
  const { name, position, salary } = body || {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanPosition = typeof position === 'string' ? position.trim() : '';
  const salaryEmpty = salary === undefined || salary === null || String(salary).trim() === '';
  if (!cleanName || !cleanPosition || salaryEmpty) {
    return { error: 'name, position and salary are required' };
  }
  const salaryNum = Number(salary);
  if (!Number.isFinite(salaryNum) || salaryNum < 0) {
    return { error: 'salary must be a valid non-negative number' };
  }
  return { value: { name: cleanName, position: cleanPosition, salary: salaryNum } };
}

// ---------- K-Means (1D) ----------
function kmeans1D(values, k = 3, maxIter = 100) {
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  const kk = Math.min(k, distinct.length); // fewer distinct salaries than k -> fewer clusters
  if (kk === 0) return [];

  // Deterministic init: evenly spaced distinct values
  let centroids = Array.from({ length: kk }, (_, i) =>
    distinct[Math.round((i * (distinct.length - 1)) / Math.max(kk - 1, 1))]
  );
  let assignment = new Array(values.length).fill(-1);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    values.forEach((v, idx) => {
      let best = 0;
      for (let c = 1; c < kk; c++) {
        if (Math.abs(v - centroids[c]) < Math.abs(v - centroids[best])) best = c;
      }
      if (assignment[idx] !== best) {
        assignment[idx] = best;
        changed = true;
      }
    });

    const sums = new Array(kk).fill(0);
    const counts = new Array(kk).fill(0);
    values.forEach((v, idx) => {
      sums[assignment[idx]] += v;
      counts[assignment[idx]] += 1;
    });
    // empty cluster keeps its previous centroid (no divide by zero)
    centroids = centroids.map((c, i) => (counts[i] > 0 ? sums[i] / counts[i] : c));

    if (!changed) break;
  }

  const counts = new Array(kk).fill(0);
  assignment.forEach((a) => counts[a]++);

  return centroids
    .map((c, i) => ({ centroid: Math.round(c * 100) / 100, count: counts[i] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => a.centroid - b.centroid)
    .map((c, i) => ({ group: `Tier ${i + 1}`, centroid: c.centroid, count: c.count }));
}

// ---------- Routes ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: TOKEN });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// must be declared BEFORE /:id routes
app.get('/api/employees/salary-clusters', requireAuth, wrap(async (req, res) => {
  const employees = await store.list();
  const salaries = employees.map((e) => e.salary).filter((x) => Number.isFinite(x));
  res.status(200).json({ success: true, clusters: kmeans1D(salaries, 3) });
}));

app.get('/api/employees', requireAuth, wrap(async (req, res) => {
  res.status(200).json(await store.list());
}));

app.post('/api/employees', requireAuth, wrap(async (req, res) => {
  const parsed = parseEmployeeBody(req.body);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  res.status(201).json(await store.create(parsed.value));
}));

app.put('/api/employees/:id', requireAuth, wrap(async (req, res) => {
  const parsed = parseEmployeeBody(req.body);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  const employee = await store.update(req.params.id, parsed.value);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.status(200).json(employee);
}));

app.put('/api/employees/:id/status', requireAuth, wrap(async (req, res) => {
  const employee = await store.toggle(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.status(200).json(employee);
}));

app.delete('/api/employees/:id', requireAuth, wrap(async (req, res) => {
  const removed = await store.remove(req.params.id);
  if (!removed) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.status(200).json({ success: true });
}));

// ---------- Error handling ----------
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

store
  .init()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`Backend running on http://0.0.0.0:${PORT} (data store: ${store.name})`)
    );
  })
  .catch((err) => {
    console.error('Failed to initialise data store:', err.message);
    process.exit(1);
  });
