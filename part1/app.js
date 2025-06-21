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
