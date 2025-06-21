const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

let db;

async function initDB() {
  // Step 1: Connect without selecting a database
  const setup = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // update if needed
    multipleStatements: true
  });

  // Step 2: Load and run the dogwalks.sql file (schema + test data)
  const fullSQL = fs.readFileSync(path.join(__dirname, 'dogwalks.sql'), 'utf8');
  await setup.query(fullSQL);
  await setup.end();

  // Step 3: Connect to DogWalkService DB for app queries
  db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService'
  });
}

app.get('/', (req, res) => {
  res.send('API is working!');
});
// /api/dogs - list dogs with size and owner's username
app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve dogs', details: err.message });
  }
});


// /api/walkrequests/open - list open walk requests with dog and owner info
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        wr.request_id,
        d.name AS dog_name,
        wr.requested_time,
        wr.duration_minutes,
        wr.location,
        u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve open walk requests', details: err.message });
  }
});

// /api/walkers/summary - show rating/summary for each walker
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.username AS walker_username,
        COUNT(r.rating_id) AS total_ratings,
        ROUND(AVG(r.rating), 1) AS average_rating,
        COUNT(DISTINCT CASE WHEN wr.status = 'completed' THEN wr.request_id ELSE NULL END) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
      LEFT JOIN WalkApplications wa ON u.user_id = wa.walker_id AND wa.status = 'accepted'
      LEFT JOIN WalkRequests wr ON wr.request_id = wa.request_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve walker summary', details: err.message });
  }
});

// Start server
app.listen(port, async () => {
  try {
    await initDB();
    console.log(`✅ Server running at http://localhost:${port}`);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
});
