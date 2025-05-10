// Script to update tutor information
const mysql = require('mysql2/promise');

// MySQL connection configuration - update with your credentials
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Nelson26!', // Replace with your MySQL password
  database: 'tutorconnect'
};

async function updateTutors() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database. Updating tutor information...');
    
    // Update Morgan's profile
    await connection.query(`
      UPDATE users 
      SET 
        bio = "I'm a Mathematics professor with 10 years of experience. I specialize in calculus, linear algebra, and statistics. My teaching philosophy focuses on building intuition rather than memorization.",
        hourly_rate = 50,
        subjects = '["Mathematics","Calculus","Linear Algebra","Statistics"]'
      WHERE email = 'morgan@example.com'
    `);
    
    // Update Riley's profile
    await connection.query(`
      UPDATE users 
      SET 
        bio = "Physics tutor with a specialty in quantum mechanics and thermodynamics. I've been teaching for 5 years and love to help students understand complex concepts through practical examples.",
        hourly_rate = 45,
        subjects = '["Physics","Quantum Mechanics","Thermodynamics"]'
      WHERE email = 'riley@example.com'
    `);
    
    // Update Jordan's profile
    await connection.query(`
      UPDATE users 
      SET 
        bio = "Computer Science specialist with expertise in algorithms, data structures, and web development. I make complex programming concepts accessible to students of all levels.",
        hourly_rate = 55,
        subjects = '["Computer Science","Algorithms","Web Development","Python"]'
      WHERE email = 'jordan@example.com'
    `);
    
    console.log('Tutor information updated successfully!');
    
  } catch (error) {
    console.error('Error updating tutors:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

updateTutors();
