const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = 8080;

let db;

async function initDB() {
  db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // change if needed
    database: 'DogWalkService'
  });
   await db.query(`
    INSERT IGNORE INTO Users (username, email, password_hash, role) VALUES
    ('alice123', 'alice@example.com', 'hashed123', 'owner'),
    ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
    ('carol123', 'carol@example.com', 'hashed789', 'owner'),
    ('davidwalker', 'david@example.com', 'hashed000', 'walker'),
    ('emilyowner', 'emily@example.com', 'hashed999', 'owner');

    INSERT IGNORE INTO Dogs (name, size, owner_id)
    VALUES
    ('Max', 'medium', (SELECT user_id FROM Users WHERE username = 'alice123')),
    ('Bella', 'small', (SELECT user_id FROM Users WHERE username = 'carol123')),
    ('Rocky', 'large', (SELECT user_id FROM Users WHERE username = 'emilyowner')),
    ('Luna', 'medium', (SELECT user_id FROM Users WHERE username = 'alice123')),
    ('Charlie', 'small', (SELECT user_id FROM Users WHERE username = 'carol123'));

    INSERT IGNORE INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
    VALUES
    ((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
    ((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
    ((SELECT dog_id FROM Dogs WHERE name = 'Rocky'), '2025-06-11 10:00:00', 60, 'Hilltop Park', 'open'),
    ((SELECT dog_id FROM Dogs WHERE name = 'Luna'), '2025-06-12 14:00:00', 30, 'Riverside Walk', 'open'),
    ((SELECT dog_id FROM Dogs WHERE name = 'Charlie'), '2025-06-13 16:30:00', 40, 'City Gardens', 'cancelled');
  `);
}

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