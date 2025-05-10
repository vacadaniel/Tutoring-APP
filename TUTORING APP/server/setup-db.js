const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// MySQL connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Nelson26!', // Replace with your MySQL password
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Main setup function
async function setupDatabase() {
    let rootConnection;
    let dbConnection;
    
    try {
      console.log('=== TutorConnect Database Setup ===');
      console.log('Connecting to MySQL server...');
      
      // Connect to MySQL server (without database specified)
      rootConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
      });
      
      // Step 1: Create database if it doesn't exist
      console.log('\n🔹 Step 1: Creating database...');
      await rootConnection.query('CREATE DATABASE IF NOT EXISTS tutorconnect');
      console.log('✅ Database "tutorconnect" created or already exists');
      
      // Close root connection
      await rootConnection.end();
      
      // Connect to the tutorconnect database
      dbConnection = await mysql.createConnection({
        ...dbConfig,
        database: 'tutorconnect'
      });
      
      // Step 2: Create tables if they don't exist
      console.log('\n🔹 Step 2: Creating tables...');
      await createTables(dbConnection);
      console.log('✅ Tables created successfully');
      
      // Step 3: Insert demo users if they don't exist
      console.log('\n🔹 Step 3: Creating demo users...');
      await createDemoUsers(dbConnection);
      console.log('✅ Demo users created successfully');
      
      // Step 4: Create sample appointments
      console.log('\n🔹 Step 4: Creating sample appointments...');
      await createSampleAppointments(dbConnection);
      console.log('✅ Sample appointments created successfully');
      
      // Step 5: Consolidate conversations (new step)
      await consolidateConversations(dbConnection);
      
      console.log('\n✅ Database setup completed successfully!');
      console.log('You can now run the server with "npm run dev"');
      
    } catch (error) {
      console.error('\n❌ Error setting up database:', error);
      process.exit(1);
    } finally {
      // Close connections
      if (rootConnection) await rootConnection.end();
      if (dbConnection) await dbConnection.end();
    }
  }

// Create database tables
async function createTables(connection) {
  // Users table
  await connection.query(`
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
    )
  `);
  console.log('  - Users table created');
  
  // Conversations table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      participants JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('  - Conversations table created');
  
  // Messages table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT,
      message_text TEXT NOT NULL,
      sender_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('  - Messages table created');
  
  // Appointments table
  await connection.query(`
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
    )
  `);
  console.log('  - Appointments table created');
  
  // Reviews table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT UNIQUE,
      rating INT NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      CHECK (rating >= 1 AND rating <= 5)
    )
  `);
  console.log('  - Reviews table created');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS availability (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tutor_id INT NOT NULL,
      day_of_week INT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY tutor_time_slot (tutor_id, day_of_week, start_time)
    )
  `);
  console.log('  - Availability table created');

}

// Create demo users
async function createDemoUsers(connection) {
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
  
  // Insert demo users
  for (const user of demoUsers) {
    // Check if user already exists
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE email = ?', 
      [user.email]
    );
    
    if (rows.length === 0) {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      // Insert user
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
      
      const [result] = await connection.query(insertQuery, values);
      console.log(`  - User ${user.name} inserted with ID ${result.insertId}`);
    } else {
      console.log(`  - User ${user.name} already exists, updating profile information`);
      
      // Update existing user's profile information if they're a tutor
      if (user.role === 'tutor') {
        const updateQuery = `
          UPDATE users 
          SET bio = ?, hourly_rate = ?, subjects = ?
          WHERE email = ?
        `;
        
        await connection.query(updateQuery, [
          user.bio, 
          user.hourly_rate, 
          user.subjects,
          user.email
        ]);
        
        console.log(`  - Updated tutor profile for ${user.name}`);
      }
    }
  }
}

async function consolidateConversations(connection) {
    console.log('\n🔹 Step 5: Consolidating conversations...');
    
    try {
      // Get all conversations
      const [conversationsRows] = await connection.query('SELECT * FROM conversations');
      console.log(`  - Found ${conversationsRows.length} total conversations`);
      
      // If there are no conversations, skip consolidation
      if (conversationsRows.length === 0) {
        console.log('  - No conversations to consolidate');
        return;
      }
      
      // Build a map of participant pairs to conversation IDs
      const participantPairMap = new Map();
      
      for (const conv of conversationsRows) {
        const participants = conv.participants;
        
        // Skip conversations with invalid participants
        if (!Array.isArray(participants) || participants.length !== 2) {
          console.log(`  - Skipping conversation ${conv.id} with invalid participants`);
          continue;
        }
        
        // Sort participant IDs to ensure consistent key formatting
        const sortedParticipants = [...participants].sort((a, b) => a - b);
        const pairKey = `${sortedParticipants[0]}-${sortedParticipants[1]}`;
        
        if (!participantPairMap.has(pairKey)) {
          participantPairMap.set(pairKey, []);
        }
        
        participantPairMap.get(pairKey).push(conv.id);
      }
      
      // Process each pair with multiple conversations
      let consolidatedCount = 0;
      
      for (const [pairKey, convIds] of participantPairMap.entries()) {
        if (convIds.length <= 1) {
          continue; // Skip pairs with only one conversation
        }
        
        console.log(`  - Consolidating ${convIds.length} conversations for pair ${pairKey}`);
        
        // Keep the oldest conversation
        const primaryConvId = convIds[0];
        const duplicateConvIds = convIds.slice(1);
        
        // Update messages from duplicate conversations to point to the primary conversation
        for (const duplicateId of duplicateConvIds) {
          // Check if the duplicate conversation has any messages
          const [messageCheck] = await connection.query(
            'SELECT COUNT(*) as messageCount FROM messages WHERE conversation_id = ?',
            [duplicateId]
          );
          
          if (messageCheck[0].messageCount > 0) {
            await connection.query(
              'UPDATE messages SET conversation_id = ? WHERE conversation_id = ?',
              [primaryConvId, duplicateId]
            );
            
            console.log(`    - Moved ${messageCheck[0].messageCount} messages from conversation ${duplicateId} to ${primaryConvId}`);
          }
          
          // Delete the duplicate conversation
          await connection.query('DELETE FROM conversations WHERE id = ?', [duplicateId]);
          console.log(`    - Deleted duplicate conversation ${duplicateId}`);
        }
        
        consolidatedCount++;
      }
      
      if (consolidatedCount > 0) {
        console.log(`✅ Consolidated ${consolidatedCount} conversation sets`);
      } else {
        console.log('✅ No duplicate conversations found, everything is already consolidated');
      }
      
    } catch (error) {
      console.error('❌ Error consolidating conversations:', error);
    }
  }

// Create sample appointments
async function createSampleAppointments(connection) {
  // Check if there are already appointments in the database
  const [existingAppointments] = await connection.query('SELECT COUNT(*) as count FROM appointments');
  
  if (existingAppointments[0].count > 0) {
    console.log('  - Sample appointments already exist, skipping creation');
    return;
  }
  
  // Get user IDs
  const [studentResult] = await connection.query(
    'SELECT id FROM users WHERE email = ?', 
    ['alex@example.com']
  );
  
  const [tutorResult] = await connection.query(
    'SELECT id FROM users WHERE email = ?', 
    ['morgan@example.com']
  );
  
  if (studentResult.length === 0 || tutorResult.length === 0) {
    console.log('  - Could not find required users for appointments');
    return;
  }
  
  const studentId = studentResult[0].id;
  const tutorId = tutorResult[0].id;
  
  // Add confirmed (upcoming) appointments
  const upcomingAppointments = [
    {
      subject: 'Calculus I',
      start_time: '2025-05-15 14:00:00',
      end_time: '2025-05-15 15:00:00',
      duration: 60,
      location_type: 'virtual',
      location: 'Zoom',
      notes: 'Need help with derivatives and chain rule',
      status: 'confirmed'
    },
    {
      subject: 'Linear Algebra',
      start_time: '2025-05-18 10:00:00',
      end_time: '2025-05-18 11:30:00',
      duration: 90,
      location_type: 'in-person',
      location: 'University Library',
      notes: 'Help with matrix operations and eigen values',
      status: 'confirmed'
    },
    {
      subject: 'Statistics',
      start_time: '2025-05-22 15:30:00',
      end_time: '2025-05-22 17:00:00',
      duration: 90,
      location_type: 'virtual',
      location: 'Google Meet',
      notes: 'Need to review hypothesis testing for final exam',
      status: 'confirmed'
    }
  ];
  
  // Add completed (past) appointments
  const pastAppointments = [
    {
      subject: 'Calculus I',
      start_time: '2025-04-10 13:00:00',
      end_time: '2025-04-10 14:00:00',
      duration: 60,
      location_type: 'virtual',
      location: 'Zoom',
      notes: 'Introduction to limits and continuity',
      status: 'completed'
    },
    {
      subject: 'Linear Algebra',
      start_time: '2025-04-05 11:00:00',
      end_time: '2025-04-05 12:30:00',
      duration: 90,
      location_type: 'in-person',
      location: 'University Library',
      notes: 'Worked on systems of linear equations',
      status: 'completed'
    },
    {
      subject: 'Statistics',
      start_time: '2025-04-15 14:00:00',
      end_time: '2025-04-15 15:30:00',
      duration: 90,
      location_type: 'virtual',
      location: 'Google Meet',
      notes: 'Reviewed probability distributions',
      status: 'completed'
    }
  ];
  
  // Add pending appointments
  const pendingAppointments = [
    {
      subject: 'Calculus II',
      start_time: '2025-05-28 16:00:00',
      end_time: '2025-05-28 17:00:00',
      duration: 60,
      location_type: 'virtual',
      location: 'Zoom',
      notes: 'Need help with integration techniques',
      status: 'pending'
    },
    {
      subject: 'Final Exam Review',
      start_time: '2025-05-30 10:00:00',
      end_time: '2025-05-30 12:00:00',
      duration: 120,
      location_type: 'in-person',
      location: 'Student Center',
      notes: 'Comprehensive review for math final',
      status: 'pending'
    }
  ];
  
  // Insert all appointments
  const allAppointments = [...upcomingAppointments, ...pastAppointments, ...pendingAppointments];
  
  for (const appointment of allAppointments) {
    const insertQuery = `
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.query(insertQuery, [
      studentId,
      tutorId,
      appointment.subject,
      appointment.start_time,
      appointment.end_time,
      appointment.duration,
      appointment.location_type,
      appointment.location,
      appointment.notes,
      appointment.status
    ]);
    
    console.log(`  - Added ${appointment.status} ${appointment.subject} appointment (ID: ${result.insertId})`);
  }
}

// Run the setup
setupDatabase();