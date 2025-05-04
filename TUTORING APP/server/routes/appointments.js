const express = require('express');

module.exports = (pool) => {
  const router = express.Router();
  
  // Create a new appointment
  router.post('/', async (req, res) => {
    try {
      const { 
        tutor_id, 
        subject, 
        start_time, 
        duration = 60, 
        location_type = 'virtual', 
        location = null,
        notes = null, 
        status = 'pending' 
      } = req.body;
      
      const student_id = req.user.id;
      
      // Validate inputs
      if (!tutor_id || !subject || !start_time) {
        return res.status(400).json({ error: 'Tutor ID, subject, and start time are required' });
      }
      
      // Check if tutor exists and is actually a tutor
      const [tutorRows] = await pool.query(
        'SELECT * FROM users WHERE id = ? AND role = ?',
        [tutor_id, 'tutor']
      );
      
      if (tutorRows.length === 0) {
        return res.status(404).json({ error: 'Tutor not found' });
      }
      
      // Calculate end time
      const startDate = new Date(start_time);
      const endDate = new Date(startDate.getTime() + duration * 60000); // duration in minutes
      const end_time = endDate.toISOString().slice(0, 19).replace('T', ' ');
      
      // Create the appointment
      const [result] = await pool.query(
        `INSERT INTO appointments 
           (student_id, tutor_id, subject, start_time, end_time, duration, location_type, location, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student_id, 
          tutor_id, 
          subject, 
          start_time, 
          end_time,
          duration, 
          location_type, 
          location, 
          notes, 
          status
        ]
      );
      
      // Get the inserted appointment
      const [appointmentRows] = await pool.query(
        'SELECT * FROM appointments WHERE id = ?',
        [result.insertId]
      );
      
      // Send notification to tutor (in a real app, you might use email, push notifications, etc.)
      // This is just a placeholder
      console.log(`New appointment request from student ${student_id} to tutor ${tutor_id}`);
      
      res.status(201).json(appointmentRows[0]);
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({ error: 'Server error creating appointment' });
    }
  });
  
  // Get all appointments for the current user (both student and tutor)
  router.get('/', async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { status } = req.query;
      
      let query = `
        SELECT 
          a.id, a.subject, a.start_time, a.end_time, a.duration, 
          a.location_type, a.location, a.notes, a.status,
          s.id as student_id, s.name as student_name,
          t.id as tutor_id, t.name as tutor_name
        FROM appointments a
        JOIN users s ON a.student_id = s.id
        JOIN users t ON a.tutor_id = t.id
        WHERE 
      `;
      
      const values = [];
      
      if (userRole === 'student') {
        query += `a.student_id = ?`;
        values.push(userId);
      } else if (userRole === 'tutor') {
        query += `a.tutor_id = ?`;
        values.push(userId);
      }
      
      if (status) {
        query += ` AND a.status = ?`;
        values.push(status);
      }
      
      query += ' ORDER BY a.start_time';
      
      const [rows] = await pool.query(query, values);
      
      res.json(rows);
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ error: 'Server error fetching appointments' });
    }
  });
  
  // Get a specific appointment
  router.get('/:id', async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const userId = req.user.id;
      
      const [rows] = await pool.query(
        `SELECT 
          a.id, a.subject, a.start_time, a.end_time, a.duration, 
          a.location_type, a.location, a.notes, a.status,
          s.id as student_id, s.name as student_name,
          t.id as tutor_id, t.name as tutor_name
        FROM appointments a
        JOIN users s ON a.student_id = s.id
        JOIN users t ON a.tutor_id = t.id
        WHERE a.id = ? AND (a.student_id = ? OR a.tutor_id = ?)`,
        [appointmentId, userId, userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Appointment not found or not authorized' });
      }
      
      res.json(rows[0]);
    } catch (error) {
      console.error('Get appointment error:', error);
      res.status(500).json({ error: 'Server error fetching appointment' });
    }
  });
  
  // Update appointment status (confirm, cancel, complete)
  router.put('/:id/status', async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      if (!['pending', 'confirmed', 'canceled', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      
      // Check if the appointment exists and the user has permission
      let query = `
        SELECT * FROM appointments 
        WHERE id = ? AND 
      `;
      
      const values = [appointmentId, userId];
      
      if (userRole === 'student') {
        query += 'student_id = ?';
      } else {
        query += 'tutor_id = ?';
      }
      
      const [checkResult] = await pool.query(query, values);
      
      if (checkResult.length === 0) {
        return res.status(404).json({ error: 'Appointment not found or not authorized' });
      }
      
      // Validate status changes based on role
      const currentStatus = checkResult[0].status;
      
      // Students can only cancel appointments
      if (userRole === 'student' && status !== 'canceled') {
        return res.status(403).json({ error: 'Students can only cancel appointments' });
      }
      
      // Tutors can confirm, cancel, or complete appointments
      if (userRole === 'tutor') {
        if (currentStatus === 'canceled' && status !== 'canceled') {
          return res.status(400).json({ error: 'Cannot change status of a canceled appointment' });
        }
        
        if (currentStatus === 'completed' && status !== 'completed') {
          return res.status(400).json({ error: 'Cannot change status of a completed appointment' });
        }
      }
      
      // Update the status
      const [updateResult] = await pool.query(
        'UPDATE appointments SET status = ? WHERE id = ?',
        [status, appointmentId]
      );
      
      // Get the updated appointment
      const [appointmentRows] = await pool.query(
        'SELECT * FROM appointments WHERE id = ?',
        [appointmentId]
      );
      
      res.json(appointmentRows[0]);
    } catch (error) {
      console.error('Update appointment status error:', error);
      res.status(500).json({ error: 'Server error updating appointment status' });
    }
  });
  
  // Update appointment details (subject, time, notes)
  router.put('/:id', async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const userId = req.user.id;
      const { subject, start_time, duration, notes } = req.body;
      
      // Check if the appointment exists and the user has permission
      const [checkResult] = await pool.query(
        `SELECT * FROM appointments 
         WHERE id = ? AND (student_id = ? OR tutor_id = ?)`,
        [appointmentId, userId, userId]
      );
      
      if (checkResult.length === 0) {
        return res.status(404).json({ error: 'Appointment not found or not authorized' });
      }
      
      const appointment = checkResult[0];
      
      // Cannot update canceled or completed appointments
      if (['canceled', 'completed'].includes(appointment.status)) {
        return res.status(400).json({ 
          error: `Cannot update a ${appointment.status} appointment` 
        });
      }
      
      // Prepare update data
      const updates = {};
      if (subject) updates.subject = subject;
      if (start_time) updates.start_time = start_time;
      if (duration) updates.duration = duration;
      if (notes !== undefined) updates.notes = notes;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Recalculate end_time if start_time or duration has changed
      if (start_time || duration) {
        const startDate = new Date(start_time || appointment.start_time);
        const durationMin = duration || appointment.duration;
        const endDate = new Date(startDate.getTime() + durationMin * 60000);
        updates.end_time = endDate.toISOString().slice(0, 19).replace('T', ' ');
      }
      
      // Build dynamic query
      let query = 'UPDATE appointments SET ';
      const updateFields = [];
      const values = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        updateFields.push(`${key} = ?`);
        values.push(value);
      });
      
      query += updateFields.join(', ');
      query += ' WHERE id = ?';
      values.push(appointmentId);
      
      // Update the appointment
      await pool.query(query, values);
      
      // Get updated appointment
      const [updatedRows] = await pool.query(
        'SELECT * FROM appointments WHERE id = ?',
        [appointmentId]
      );
      
      res.json(updatedRows[0]);
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ error: 'Server error updating appointment' });
    }
  });
  
  return router;
};