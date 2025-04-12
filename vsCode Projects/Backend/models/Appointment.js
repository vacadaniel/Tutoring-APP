// models/Appointment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AppointmentSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tutor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'canceled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);