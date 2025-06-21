const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

// POST login (enhanced version)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(`
      SELECT user_id, username, role FROM Users
      WHERE email = ? AND password_hash = ?
    `, [email, password]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];


    req.session.user = {
      id: user.user_id,
      username: user.username,
      role: user.role
    };

    if (user.role === 'owner') {
      res.json({ message: 'Login successful', redirect: '/owner-dashboard' });
    } else if (user.role === 'walker') {
      res.json({ message: 'Login successful', redirect: '/walker-dashboard' });
    } else {
      res.status(403).json({ error: 'Unknown role' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});
const path = require('path');

// Owner Dashboard
router.get('/owner-dashboard', (req, res) => {
  if (req.session.user?.role !== 'owner') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../public/owner-dashboard.html'));
});

// Walker Dashboard
router.get('/walker-dashboard', (req, res) => {
  if (req.session.user?.role !== 'walker') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../public/walker-dashboard.html'));
});

//the bottom of userRoutes.js
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid'); // default session cookie name
    res.json({ message: 'Logged out' });
  });
});
// GET dogs owned by the logged-in user
router.get('/', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.status(401).json({ error: 'Not authorized' });
  }

  const ownerId = req.session.user.id;

  try {
    const [rows] = await db.query(
      'SELECT dog_id, name FROM Dogs WHERE owner_id = ?',
      [ownerId]
    );
    res.json(rows); // Returns an array of dogs: [{ dog_id: 1, name: 'Max' }, ...]
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve dogs' });
  }
});