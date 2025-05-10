const express = require('express');

module.exports = (pool) => {
  const router = express.Router();
  
  // Submit a review for a completed appointment
  router.post('/', async (req, res) => {
    try {
      const userId = req.user.id;
      const { appointment_id, rating, comment } = req.body;
      
      // Validate inputs
      if (!appointment_id || !rating) {
        return res.status(400).json({ error: 'Appointment ID and rating are required' });
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      
      // Check if the appointment exists, is completed, and belongs to the current user
      const [appointmentRows] = await pool.query(
        `SELECT * FROM appointments
         WHERE id = ? AND student_id = ? AND status = 'completed'`,
        [appointment_id, userId]
      );
      
      if (appointmentRows.length === 0) {
        return res.status(404).json({ 
          error: 'Appointment not found, not completed, or not authorized' 
        });
      }
      
      // Check if the appointment already has a review
      const [checkRows] = await pool.query(
        'SELECT * FROM reviews WHERE appointment_id = ?',
        [appointment_id]
      );
      
      if (checkRows.length > 0) {
        return res.status(400).json({ error: 'This appointment already has a review' });
      }
      
      // Create the review
      const [result] = await pool.query(
        'INSERT INTO reviews (appointment_id, rating, comment) VALUES (?, ?, ?)',
        [appointment_id, rating, comment || null]
      );
      
      // Get the created review
      const [reviewRows] = await pool.query(
        'SELECT * FROM reviews WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json(reviewRows[0]);
    } catch (error) {
      console.error('Create review error:', error);
      res.status(500).json({ error: 'Server error creating review' });
    }
  });
  
  // Get reviews for a tutor
  router.get('/tutor/:id', async (req, res) => {
    try {
      const tutorId = req.params.id;
      
      // Check if tutor exists
      const [tutorRows] = await pool.query(
        'SELECT * FROM users WHERE id = ? AND role = ?',
        [tutorId, 'tutor']
      );
      
      if (tutorRows.length === 0) {
        return res.status(404).json({ error: 'Tutor not found' });
      }
      
      // Get the reviews
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
      
      // Calculate average rating
      let avgRating = 0;
      if (reviewsRows.length > 0) {
        const sum = reviewsRows.reduce((total, review) => total + review.rating, 0);
        avgRating = sum / reviewsRows.length;
      }
      
      res.json({
        tutor_id: tutorId,
        avg_rating: avgRating,
        total_reviews: reviewsRows.length,
        reviews: reviewsRows
      });
    } catch (error) {
      console.error('Get tutor reviews error:', error);
      res.status(500).json({ error: 'Server error fetching tutor reviews' });
    }
  });
  
  // Get review for a specific appointment
  router.get('/appointment/:id', async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const userId = req.user.id;
      
      // Check if the appointment exists and belongs to the current user
      const [appointmentRows] = await pool.query(
        `SELECT * FROM appointments
         WHERE id = ? AND (student_id = ? OR tutor_id = ?)`,
        [appointmentId, userId, userId]
      );
      
      if (appointmentRows.length === 0) {
        return res.status(404).json({ error: 'Appointment not found or not authorized' });
      }
      
      // Get the review
      const [reviewRows] = await pool.query(
        `SELECT r.*, a.student_id, a.tutor_id
         FROM reviews r
         JOIN appointments a ON r.appointment_id = a.id
         WHERE r.appointment_id = ?`,
        [appointmentId]
      );
      
      if (reviewRows.length === 0) {
        return res.status(404).json({ error: 'Review not found for this appointment' });
      }
      
      res.json(reviewRows[0]);
    } catch (error) {
      console.error('Get appointment review error:', error);
      res.status(500).json({ error: 'Server error fetching appointment review' });
    }
  });
  
  router.get('/student', async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Get reviews for appointments where this student is involved
      const [reviewRows] = await pool.query(
        `SELECT r.*, a.student_id, a.tutor_id
         FROM reviews r
         JOIN appointments a ON r.appointment_id = a.id
         WHERE a.student_id = ?`,
        [userId]
      );
      
      res.json(reviewRows);
    } catch (error) {
      console.error('Get student reviews error:', error);
      res.status(500).json({ error: 'Server error fetching student reviews' });
    }
  });

  // Update a review (only allowed for the student who created it)
  router.put('/:id', async (req, res) => {
    try {
      const reviewId = req.params.id;
      const userId = req.user.id;
      const { rating, comment } = req.body;
      
      if (!rating) {
        return res.status(400).json({ error: 'Rating is required' });
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      
      // Check if the review exists and belongs to the current user
      const [checkRows] = await pool.query(
        `SELECT r.*, a.student_id
         FROM reviews r
         JOIN appointments a ON r.appointment_id = a.id
         WHERE r.id = ?`,
        [reviewId]
      );
      
      if (checkRows.length === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }
      
      if (checkRows[0].student_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this review' });
      }
      
      // Update the review
      await pool.query(
        'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
        [rating, comment || null, reviewId]
      );
      
      // Get the updated review
      const [reviewRows] = await pool.query(
        'SELECT * FROM reviews WHERE id = ?',
        [reviewId]
      );
      
      res.json(reviewRows[0]);
    } catch (error) {
      console.error('Update review error:', error);
      res.status(500).json({ error: 'Server error updating review' });
    }
  });
  
  return router;
};
