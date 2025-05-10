const express = require('express');

module.exports = (pool, bcrypt, jwt, JWT_SECRET, authenticateToken) => {
  const router = express.Router();

  // Register a new user
  router.post('/register', async (req, res) => {
    try {
      const { name, email, password, role, school, bio, hourly_rate, subjects } = req.body;
      
      // Log what we received
      console.log('Registration request received:');
      console.log('- Role:', role);
      console.log('- Bio:', bio);
      console.log('- Hourly rate:', hourly_rate);
      console.log('- Subjects:', subjects);
      
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
      
      // Prepare the query based on role
      let query, values;
      
      if (role === 'tutor') {
        // For tutors, include the additional fields
        query = `
          INSERT INTO users 
            (name, email, password, role, school, bio, hourly_rate, subjects)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Ensure subjects is properly formatted as JSON
        const subjectsJson = Array.isArray(subjects) ? JSON.stringify(subjects) : null;
        
        values = [
          name, 
          email, 
          hashedPassword, 
          role, 
          school,
          bio || null,
          hourly_rate || null,
          subjectsJson
        ];
      } else {
        // For students, use simpler query
        query = `
          INSERT INTO users 
            (name, email, password, role, school)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        values = [name, email, hashedPassword, role, school];
      }
      
      // Log the query we're about to execute
      console.log('Executing insert query:', query);
      console.log('With values:', values);
      
      // Insert new user
      const [result] = await pool.query(query, values);
      
      // Get the inserted user (include all relevant fields)
      const [userRows] = await pool.query(
        'SELECT id, name, email, role, school, bio, hourly_rate, subjects FROM users WHERE id = ?',
        [result.insertId]
      );
      
      const user = userRows[0];
      
      // Log what was retrieved
      console.log('User inserted with data:', user);
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          role: user.role, 
          name: user.name, 
          email: user.email 
        },
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
          school: user.school,
          bio: user.bio,
          hourly_rate: user.hourly_rate,
          subjects: user.subjects
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
        'SELECT id, name, email, role, school, bio, hourly_rate, subjects FROM users WHERE id = ?',
        [userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = rows[0];
      
      // Parse subjects if they're stored as JSON
      if (user.subjects) {
        try {
          if (typeof user.subjects === 'string') {
            user.subjects = JSON.parse(user.subjects);
          }
          // If it's already an object, MySQL has parsed it for us
        } catch (e) {
          console.error('Error parsing subjects:', e);
          user.subjects = [];
        }
      } else {
        user.subjects = [];
      }
      
      res.json(user);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Server error fetching profile' });
    }
  });
  
  // Update user profile
  router.put('/profile', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, email, school, bio, hourly_rate, subjects, password } = req.body;
      
      // Start building the query and values array
      let queryParts = [];
      let values = [];
      
      // Add fields that should be updated
      if (name) {
        queryParts.push('name = ?');
        values.push(name);
      }
      
      if (email) {
        queryParts.push('email = ?');
        values.push(email);
      }
      
      if (school) {
        queryParts.push('school = ?');
        values.push(school);
      }
      
      if (bio !== undefined) {
        queryParts.push('bio = ?');
        values.push(bio);
      }
      
      if (hourly_rate !== undefined) {
        queryParts.push('hourly_rate = ?');
        values.push(hourly_rate);
      }
      
      if (subjects !== undefined) {
        queryParts.push('subjects = ?');
        values.push(JSON.stringify(subjects));
      }
      
      // Handle password update separately
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        queryParts.push('password = ?');
        values.push(hashedPassword);
      }
      
      // If no fields to update, return early
      if (queryParts.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Complete the query
      const query = `UPDATE users SET ${queryParts.join(', ')} WHERE id = ?`;
      values.push(userId);
      
      // Execute the update
      const [result] = await pool.query(query, values);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get updated user
      const [rows] = await pool.query(
        'SELECT id, name, email, role, school, bio, hourly_rate, subjects FROM users WHERE id = ?',
        [userId]
      );
      
      const updatedUser = rows[0];
      
      // Parse subjects if needed
      if (updatedUser.subjects) {
        try {
          if (typeof updatedUser.subjects === 'string') {
            updatedUser.subjects = JSON.parse(updatedUser.subjects);
          }
        } catch (e) {
          console.error('Error parsing subjects:', e);
          updatedUser.subjects = [];
        }
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Server error updating profile' });
    }
  });
  
  // Get all tutors with enhanced filtering by school, subject, and rating
  router.get('/tutors', async (req, res) => {
    try {
      const { school, subject, rating } = req.query;
      
      // Base query to get tutors with their average rating
      let query = `
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.school, 
          u.subjects,
          u.hourly_rate,
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(DISTINCT r.id) as reviewCount,
          COUNT(DISTINCT a.id) as sessionCount
        FROM 
          users u
        LEFT JOIN 
          appointments a ON u.id = a.tutor_id AND a.status = 'completed'
        LEFT JOIN 
          reviews r ON a.id = r.appointment_id
        WHERE 
          u.role = ?
      `;
      
      let values = ['tutor'];
      let groupBy = ' GROUP BY u.id';
      let having = '';
      
      // Add school filter if provided
      if (school) {
        query += ' AND u.school = ?';
        values.push(school);
      }
      
      // Add subject filter if provided
      if (subject && subject.trim() !== '') {
        query += ' AND JSON_CONTAINS(u.subjects, ?) OR JSON_SEARCH(u.subjects, "one", ?) IS NOT NULL';
        values.push(JSON.stringify(subject.trim()));
        values.push(`%${subject.trim()}%`);
      }
      
      // Complete the query
      query += groupBy;
      
      // Add rating filter if provided
      if (rating && !isNaN(parseFloat(rating))) {
        having = ` HAVING avgRating >= ${parseFloat(rating)}`;
        query += having;
      }
      
      // Execute the query
      const [rows] = await pool.query(query, values);
      
      // Process results to ensure proper format
      const tutors = rows.map(tutor => {
        // Parse subjects if they're stored as JSON
        let subjects = [];
        if (tutor.subjects) {
          try {
            if (typeof tutor.subjects === 'string') {
              subjects = JSON.parse(tutor.subjects);
            } else {
              subjects = tutor.subjects;
            }
          } catch (e) {
            console.error('Error parsing subjects:', e);
          }
        }
        
        return {
          id: tutor.id,
          name: tutor.name,
          email: tutor.email,
          school: tutor.school,
          subjects: subjects,
          hourly_rate: tutor.hourly_rate || 30, // Default hourly rate if not set
          avgRating: parseFloat(tutor.avgRating) || 0,
          reviewCount: parseInt(tutor.reviewCount) || 0,
          sessionCount: parseInt(tutor.sessionCount) || 0
        };
      });
      
      res.json(tutors);
    } catch (error) {
      console.error('Get tutors error:', error);
      res.status(500).json({ error: 'Server error fetching tutors' });
    }
  });
  
  // Get available schools for dropdown
  router.get('/schools', async (req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT DISTINCT school FROM users ORDER BY school'
      );
      
      const schools = rows.map(row => row.school);
      res.json(schools);
    } catch (error) {
      console.error('Get schools error:', error);
      res.status(500).json({ error: 'Server error fetching schools' });
    }
  });
  
  // Get available subjects for dropdown
  router.get('/subjects', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT subjects FROM users WHERE subjects IS NOT NULL AND JSON_LENGTH(subjects) > 0`
      );
      
      // Extract and flatten all subjects from all tutors
      const allSubjects = new Set();
      rows.forEach(row => {
        let subjects = [];
        try {
          if (typeof row.subjects === 'string') {
            subjects = JSON.parse(row.subjects);
          } else {
            subjects = row.subjects;
          }
          
          if (Array.isArray(subjects)) {
            subjects.forEach(subject => allSubjects.add(subject));
          }
        } catch (e) {
          console.error('Error parsing subjects:', e);
        }
      });
      
      res.json(Array.from(allSubjects).sort());
    } catch (error) {
      console.error('Get subjects error:', error);
      res.status(500).json({ error: 'Server error fetching subjects' });
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
      
      // Calculate average rating
      let avgRating = 0;
      if (reviewsRows.length > 0) {
        const sum = reviewsRows.reduce((total, review) => total + review.rating, 0);
        avgRating = sum / reviewsRows.length;
      }
      
      // Final response with all data
      const response = {
        ...tutor,
        total_sessions: totalSessions,
        avg_rating: avgRating.toFixed(1),
        reviews: reviewsRows
      };
      
      res.json(response);
    } catch (error) {
      console.error('Get tutor profile error:', error);
      res.status(500).json({ error: 'Server error fetching tutor profile' });
    }
  });
  
  return router;
};