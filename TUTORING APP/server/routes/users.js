const express = require('express');

module.exports = (pool, bcrypt, jwt, JWT_SECRET, authenticateToken) => {
  const router = express.Router();

  // Register a new user
  router.post('/register', async (req, res) => {
    try {
      const { name, email, password, role, school } = req.body;
      
      // Validate inputs
      if (!name || !email || !password || !role || !school) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      if (role !== 'student' && role !== 'tutor') {
        return res.status(400).json({ error: 'Role must be either student or tutor' });
      }
      
      // Check if user already exists
      const [checkResult] = await pool.query(
        'SELECT * FROM users WHERE email = ?', 
        [email]
      );
      
      if (checkResult.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Insert new user
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role, school) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, role, school]
      );
      
      // Get the inserted user
      const [userRows] = await pool.query(
        'SELECT id, name, email, role, school FROM users WHERE id = ?',
        [result.insertId]
      );
      
      const user = userRows[0];
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(201).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          school: user.school
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error during registration' });
    }
  });
  
  // Login user
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate inputs
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Check if user exists
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      const user = rows[0];
      
      // Compare passwords
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          school: user.school
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  });
  
  // Get user profile
  router.get('/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      
      const [rows] = await pool.query(
        'SELECT id, name, email, role, school FROM users WHERE id = ?',
        [userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(rows[0]);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Server error fetching profile' });
    }
  });
  
  // Update user profile
  router.put('/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, email, school, password } = req.body;
      
      let query, values;
      
      // If password is being updated
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        query = 'UPDATE users SET name = ?, email = ?, school = ?, password = ? WHERE id = ?';
        values = [name, email, school, hashedPassword, userId];
      } else {
        query = 'UPDATE users SET name = ?, email = ?, school = ? WHERE id = ?';
        values = [name, email, school, userId];
      }
      
      const [result] = await pool.query(query, values);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get updated user
      const [rows] = await pool.query(
        'SELECT id, name, email, role, school FROM users WHERE id = ?',
        [userId]
      );
      
      res.json(rows[0]);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Server error updating profile' });
    }
  });
  
  // Get all tutors with optional filtering
  router.get('/tutors', async (req, res) => {
    try {
      const { school, subject, rating } = req.query;
      
      let query = 'SELECT u.id, u.name, u.email, u.school FROM users u WHERE u.role = ?';
      let values = ['tutor'];
      
      if (school) {
        query += ' AND u.school = ?';
        values.push(school);
      }
      
      // NOTE: This is a simplified implementation. In a real application, you would need
      // additional tables for subjects and more complex queries for filtering by subject and rating
      
      const [rows] = await pool.query(query, values);
      
      res.json(rows);
    } catch (error) {
      console.error('Get tutors error:', error);
      res.status(500).json({ error: 'Server error fetching tutors' });
    }
  });
  
  // Get tutor profile by ID with reviews
  router.get('/tutors/:id', async (req, res) => {
    try {
      const tutorId = req.params.id;
      
      // Get tutor info
      const [tutorRows] = await pool.query(
        'SELECT id, name, email, school, bio, hourly_rate, subjects FROM users WHERE id = ? AND role = ?',
        [tutorId, 'tutor']
      );
      
      if (tutorRows.length === 0) {
        return res.status(404).json({ error: 'Tutor not found' });
      }
      
      const tutor = tutorRows[0];
      console.log("Tutor from database:", tutor); // Debug log
      
      // Parse subjects if stored as JSON string
      if (tutor.subjects && typeof tutor.subjects === 'string') {
        try {
          tutor.subjects = JSON.parse(tutor.subjects);
        } catch (e) {
          // If it's not valid JSON, convert to array
          tutor.subjects = tutor.subjects.split(',').map(s => s.trim());
        }
      } else if (tutor.subjects && typeof tutor.subjects === 'object') {
        // MySQL returns JSON as object already, so we're good
        console.log("Subjects already parsed:", tutor.subjects);
      } else {
        // Default empty array if no subjects
        tutor.subjects = [];
      }
      
      // Make sure hourly_rate has a default value if null
      if (tutor.hourly_rate === null) {
        tutor.hourly_rate = 30; // Default hourly rate
      }
      
      // Get tutor's reviews
      const [reviewsRows] = await pool.query(
        `SELECT 
          r.id, r.rating, r.comment, r.created_at,
          a.subject,
          s.id as student_id, s.name as student_name
         FROM reviews r
         JOIN appointments a ON r.appointment_id = a.id
         JOIN users s ON a.student_id = s.id
         WHERE a.tutor_id = ?
         ORDER BY r.created_at DESC`,
        [tutorId]
      );
      
      // Get completed sessions count
      const [sessionRows] = await pool.query(
        `SELECT COUNT(*) as total_sessions 
         FROM appointments 
         WHERE tutor_id = ? AND status = 'completed'`,
        [tutorId]
      );
      
      const totalSessions = sessionRows[0]?.total_sessions || 0;
      
      // Final response with all data
      const response = {
        ...tutor,
        total_sessions: totalSessions,
        reviews: reviewsRows
      };
      
      console.log("Final response:", response); // Debug log
      
      res.json(response);
    } catch (error) {
      console.error('Get tutor profile error:', error);
      res.status(500).json({ error: 'Server error fetching tutor profile' });
    }
  });
  
  return router;
};
