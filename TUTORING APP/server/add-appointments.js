const mysql = require('mysql2/promise');

// MySQL connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Nelson26!', // Use your actual password
  database: 'tutorconnect'
};

async function addAppointments() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database. Adding appointments...');
    
    // Add confirmed (upcoming) appointments
    await connection.query(`
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES 
        (1, 2, 'Calculus I', '2025-05-15 14:00:00', '2025-05-15 15:00:00', 60, 'virtual', 'Zoom', 'Need help with derivatives and chain rule', 'confirmed')
    `);
    console.log('Added upcoming Calculus appointment');
    
    await connection.query(`
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES 
        (1, 2, 'Linear Algebra', '2025-05-18 10:00:00', '2025-05-18 11:30:00', 90, 'in-person', 'University Library', 'Help with matrix operations and eigen values', 'confirmed')
    `);
    console.log('Added upcoming Linear Algebra appointment');
    
    await connection.query(`
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES 
        (1, 2, 'Statistics', '2025-05-22 15:30:00', '2025-05-22 17:00:00', 90, 'virtual', 'Google Meet', 'Need to review hypothesis testing for final exam', 'confirmed')
    `);
    console.log('Added upcoming Statistics appointment');
    
    // Add completed (past) appointments
    await connection.query(`
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES 
        (1, 2, 'Calculus I', '2025-04-10 13:00:00', '2025-04-10 14:00:00', 60, 'virtual', 'Zoom', 'Introduction to limits and continuity', 'completed')
    `);
    console.log('Added past Calculus appointment');
    
    await connection.query(`
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES 
        (1, 2, 'Linear Algebra', '2025-04-05 11:00:00', '2025-04-05 12:30:00', 90, 'in-person', 'University Library', 'Worked on systems of linear equations', 'completed')
    `);
    console.log('Added past Linear Algebra appointment');
    
    await connection.query(`
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES 
        (1, 2, 'Statistics', '2025-04-15 14:00:00', '2025-04-15 15:30:00', 90, 'virtual', 'Google Meet', 'Reviewed probability distributions', 'completed')
    `);
    console.log('Added past Statistics appointment');
    
    // Add pending appointments
    await connection.query(`
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES 
        (1, 2, 'Calculus II', '2025-05-28 16:00:00', '2025-05-28 17:00:00', 60, 'virtual', 'Zoom', 'Need help with integration techniques', 'pending')
    `);
    console.log('Added pending Calculus II appointment');
    
    await connection.query(`
      INSERT INTO appointments 
        (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
      VALUES 
        (1, 2, 'Final Exam Review', '2025-05-30 10:00:00', '2025-05-30 12:00:00', 120, 'in-person', 'Student Center', 'Comprehensive review for math final', 'pending')
    `);
    console.log('Added pending Final Exam Review appointment');
    
    console.log('All appointments added successfully!');
    
  } catch (error) {
    console.error('Error adding appointments:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the function
addAppointments();