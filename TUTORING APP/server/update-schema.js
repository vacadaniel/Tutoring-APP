// Script to update the database schema and add missing columns
const mysql = require('mysql2/promise');

// MySQL connection configuration - update with your credentials
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Nelson26!', // Replace with your MySQL password
  database: 'tutorconnect'
};

async function updateSchema() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected. Checking schema...');
    
    // Check if bio column exists in users table
    const [bioColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bio'
    `, [dbConfig.database]);
    
    if (bioColumns.length === 0) {
      console.log('Adding bio column to users table...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN bio TEXT NULL
      `);
      console.log('Bio column added successfully');
    } else {
      console.log('Bio column already exists');
    }
    
    // Check if hourly_rate column exists
    const [rateColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'hourly_rate'
    `, [dbConfig.database]);
    
    if (rateColumns.length === 0) {
      console.log('Adding hourly_rate column to users table...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN hourly_rate INT NULL
      `);
      console.log('hourly_rate column added successfully');
    } else {
      console.log('hourly_rate column already exists');
    }
    
    // Check if subjects column exists
    const [subjectsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'subjects'
    `, [dbConfig.database]);
    
    if (subjectsColumns.length === 0) {
      console.log('Adding subjects column to users table...');
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN subjects JSON NULL
      `);
      console.log('subjects column added successfully');
    } else {
      console.log('subjects column already exists');
    }
    
    console.log('Schema update complete! You can now run update-tutors.js');
    
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

updateSchema();
