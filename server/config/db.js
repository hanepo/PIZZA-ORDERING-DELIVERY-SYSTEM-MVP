const mysql = require('mysql2');
require('dotenv').config();

// Railway provides MYSQL_URL, support both formats
const poolConfig = process.env.MYSQL_URL
  ? { uri: process.env.MYSQL_URL, waitForConnections: true, connectionLimit: 10, queueLimit: 0 }
  : {
      host:              process.env.DB_HOST     || 'localhost',
      user:              process.env.DB_USER     || 'root',
      password:          process.env.DB_PASSWORD || '',
      database:          process.env.DB_NAME     || 'pizza_delivery',
      waitForConnections: true,
      connectionLimit:   10,
      queueLimit:        0
    };

const pool = mysql.createPool(poolConfig);

const db = pool.promise();

// Test connection on startup
pool.getConnection((err, conn) => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
  } else {
    console.log('✅ MySQL connected to database:', process.env.DB_NAME);
    conn.release();
  }
});

module.exports = db;
