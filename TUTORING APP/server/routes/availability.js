// routes/availability.js

const express = require('express');

module.exports = (pool) => {
  const router = express.Router();
  
  // Create the availability table if it doesn't exist
  const initializeAvailabilityTable = async () => {
    try {
      await pool.query(`
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
      
      console.log('Availability table initialized');
    } catch (error) {
      console.error('Error initializing availability table:', error);
    }
  };
  
  // Initialize the table when this module is loaded
  initializeAvailabilityTable();
  
  // Get a tutor's availability
  router.get('/tutor/:id', async (req, res) => {
    try {
      const tutorId = req.params.id;
      
      const [rows] = await pool.query(
        'SELECT * FROM availability WHERE tutor_id = ? ORDER BY day_of_week, start_time',
        [tutorId]
      );
      
      res.json(rows);
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: 'Server error fetching availability' });
    }
  });
  
  // Set a tutor's availability (only available to the tutor)
  router.post('/', async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Only tutors can set availability
      if (userRole !== 'tutor') {
        return res.status(403).json({ error: 'Only tutors can set availability' });
      }
      
      const { day_of_week, start_time, end_time } = req.body;
      
      // Validate inputs
      if (day_of_week === undefined || !start_time || !end_time) {
        return res.status(400).json({ 
          error: 'Day of week, start time, and end time are required'
        });
      }
      
      if (day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({ error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' });
      }
      
      // Insert the availability
      const [result] = await pool.query(
        `INSERT INTO availability 
          (tutor_id, day_of_week, start_time, end_time) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
          start_time = VALUES(start_time), 
          end_time = VALUES(end_time)`,
        [userId, day_of_week, start_time, end_time]
      );
      
      res.status(201).json({ 
        id: result.insertId || result.insertId, 
        message: 'Availability set successfully'
      });
    } catch (error) {
      console.error('Set availability error:', error);
      res.status(500).json({ error: 'Server error setting availability' });
    }
  });
  
  // Delete an availability slot (only available to the tutor)
  router.delete('/:id', async (req, res) => {
    try {
      const userId = req.user.id;
      const availabilityId = req.params.id;
      
      // Check if the availability belongs to this tutor
      const [checkRows] = await pool.query(
        'SELECT * FROM availability WHERE id = ? AND tutor_id = ?',
        [availabilityId, userId]
      );
      
      if (checkRows.length === 0) {
        return res.status(404).json({ 
          error: 'Availability slot not found or not authorized'
        });
      }
      
      // Delete the availability
      await pool.query(
        'DELETE FROM availability WHERE id = ?',
        [availabilityId]
      );
      
      res.json({ message: 'Availability slot deleted successfully' });
    } catch (error) {
      console.error('Delete availability error:', error);
      res.status(500).json({ error: 'Server error deleting availability' });
    }
  });
  
  // Get available time slots for a specific day
  router.get('/slots/:tutorId/:date', async (req, res) => {
    try {
      const tutorId = req.params.tutorId;
      const dateStr = req.params.date; // Format: YYYY-MM-DD
      
      // Validate the date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      
      // Get day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeek = date.getDay();
      
      // Get tutor's availability for this day
      const [availabilityRows] = await pool.query(
        'SELECT * FROM availability WHERE tutor_id = ? AND day_of_week = ? ORDER BY start_time',
        [tutorId, dayOfWeek]
      );
      
      // Get existing appointments for this tutor on this day
      const [appointmentRows] = await pool.query(
        `SELECT * FROM appointments 
         WHERE tutor_id = ? 
           AND DATE(start_time) = ? 
           AND status != 'canceled'
         ORDER BY start_time`,
        [tutorId, dateStr]
      );
      
      // Process available slots considering existing appointments
      const availableSlots = [];
      const bookedSlots = appointmentRows.map(appt => ({
        start: new Date(appt.start_time),
        end: new Date(appt.end_time)
      }));
      
      // For each availability window, create hourly slots
      availabilityRows.forEach(avail => {
        // Parse the availability times
        const [startHour, startMinute] = avail.start_time.split(':').map(Number);
        const [endHour, endMinute] = avail.end_time.split(':').map(Number);
        
        // Create slots at hourly intervals
        const slotDate = new Date(dateStr);
        slotDate.setHours(startHour, startMinute, 0, 0);
        
        const endDateTime = new Date(dateStr);
        endDateTime.setHours(endHour, endMinute, 0, 0);
        
        // Generate hourly slots
        while (slotDate < endDateTime) {
          const slotEndTime = new Date(slotDate);
          slotEndTime.setHours(slotEndTime.getHours() + 1);
          
          // Check if this slot conflicts with any existing appointment
          const isBooked = bookedSlots.some(booked => {
            return (slotDate < booked.end && slotEndTime > booked.start);
          });
          
          if (!isBooked) {
            availableSlots.push({
              start: slotDate.toISOString(),
              end: slotEndTime.toISOString()
            });
          }
          
          // Move to the next hour
          slotDate.setHours(slotDate.getHours() + 1);
        }
      });
      
      res.json(availableSlots);
    } catch (error) {
      console.error('Get available slots error:', error);
      res.status(500).json({ error: 'Server error fetching available slots' });
    }
  });
  
  return router;
};