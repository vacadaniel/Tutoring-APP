const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// MySQL connection for initial setup
const createConnection = async () => {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',           // Replace with your MySQL username
    password: 'Nelson26!',   // Replace with your MySQL password
  });
};

// SQL queries for database initialization
const createDatabaseQuery = 'CREATE DATABASE IF NOT EXISTS tutorconnect';

const createUsersTableQuery = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    school VARCHAR(255) NOT NULL,
    bio TEXT,
    hourly_rate INT,
    subjects JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

const createConversationsTableQuery = `
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participants JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

const createMessagesTableQuery = `
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT,
    message_text TEXT NOT NULL,
    sender_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
)`;

const createAppointmentsTableQuery = `
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    tutor_id INT,
    subject VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration INT DEFAULT 60,
    location_type VARCHAR(50) DEFAULT 'virtual',
    location VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE
)`;

const createReviewsTableQuery = `
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT UNIQUE,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CHECK (rating >= 1 AND rating <= 5)
)`;

// Sample data for initial users
const demoUsers = [
  {
    name: 'Alex Johnson',
    email: 'alex@example.com',
    password: 'password123',
    role: 'student',
    school: 'State University'
  },
  {
    name: 'Dr. Morgan Taylor',
    email: 'morgan@example.com',
    password: 'password123',
    role: 'tutor',
    school: 'State University',
    bio: 'I\'m a Mathematics professor with 10 years of experience. I specialize in calculus, linear algebra, and statistics. My teaching philosophy focuses on building intuition rather than memorization.',
    hourly_rate: 50,
    subjects: JSON.stringify(['Mathematics', 'Calculus', 'Linear Algebra', 'Statistics'])
  },
  {
    name: 'Jamie Smith',
    email: 'jamie@example.com',
    password: 'password123',
    role: 'student',
    school: 'Tech College'
  },
  {
    name: 'Prof. Riley Garcia',
    email: 'riley@example.com',
    password: 'password123',
    role: 'tutor',
    school: 'Tech College',
    bio: 'Chemistry specialist with expertise in organic chemistry and biochemistry. I\'ve been tutoring for 8 years and have helped hundreds of students improve their grades and understanding of complex chemical concepts.',
    hourly_rate: 45,
    subjects: JSON.stringify(['Chemistry', 'Organic Chemistry', 'Biochemistry', 'General Science'])
  },
  {
    name: 'Jordan Lee, PhD',
    email: 'jordan@example.com',
    password: 'password123',
    role: 'tutor',
    school: 'State University',
    bio: 'Physics educator passionate about making complex concepts accessible to everyone. I focus on real-world applications and problem-solving strategies that help students excel in their coursework and beyond.',
    hourly_rate: 55,
    subjects: JSON.stringify(['Physics', 'Quantum Mechanics', 'Thermodynamics', 'Electromagnetism'])
  }
];

// Function to create database and tables
async function initializeDatabase() {
  let connection;
  let tutorConnectConnection;
  
  try {
    // Create database
    connection = await createConnection();
    
    try {
      console.log('Creating tutorconnect database...');
      await connection.query(createDatabaseQuery);
      console.log('Database created successfully!');
    } catch (err) {
      console.log('Database already exists or error creating database:', err.message);
    }
    
    // Close initial connection
    await connection.end();
    
    // Connect to the new database
    tutorConnectConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',           // Replace with your MySQL username
      password: 'Nelson26!',   // Replace with your MySQL password
      database: 'tutorconnect'
    });
    
    // Create tables
    console.log('Creating tables...');
    await tutorConnectConnection.query(createUsersTableQuery);
    await tutorConnectConnection.query(createConversationsTableQuery);
    await tutorConnectConnection.query(createMessagesTableQuery);
    await tutorConnectConnection.query(createAppointmentsTableQuery);
    await tutorConnectConnection.query(createReviewsTableQuery);
    console.log('Tables created successfully!');
    
    // Insert demo users
    console.log('Inserting demo users...');
    for (const user of demoUsers) {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      // Check if user already exists
      const [rows] = await tutorConnectConnection.query(
        'SELECT * FROM users WHERE email = ?', 
        [user.email]
      );
      
      if (rows.length === 0) {
        const insertQuery = `
          INSERT INTO users (name, email, password, role, school, bio, hourly_rate, subjects)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
          user.name, 
          user.email, 
          hashedPassword, 
          user.role, 
          user.school,
          user.bio || null,
          user.hourly_rate || null,
          user.subjects || null
        ];
        
        const [result] = await tutorConnectConnection.query(insertQuery, values);
        console.log(`User ${user.name} inserted successfully with ID ${result.insertId}!`);
      } else {
        console.log(`User ${user.name} already exists, skipping...`);
      }
    }
    
    console.log('Database initialization complete!');
    
    // Close connection
    await tutorConnectConnection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    if (connection) await connection.end();
    if (tutorConnectConnection) await tutorConnectConnection.end();
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();