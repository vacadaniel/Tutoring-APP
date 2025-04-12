// scripts/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Review = require('../models/Review');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://JohnDanielDylan:YOUR_ACTUAL_PASSWORD@tutor.acwtgsp.mongodb.net/?retryWrites=true&w=majority&appName=Tutor";

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully for seeding'))
  .catch(err => console.error('MongoDB connection error:', err));

// Function to seed database
const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Appointment.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Review.deleteMany({});

    console.log('Cleared existing data');

    // Create users (students and tutors)
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create Students
    const student1 = await User.create({
      name: 'Alex Johnson',
      email: 'alex@example.com',
      password: hashedPassword,
      role: 'student',
      school: 'State University'
    });

    const student2 = await User.create({
      name: 'Jamie Smith',
      email: 'jamie@example.com',
      password: hashedPassword,
      role: 'student',
      school: 'Tech College'
    });

    const student3 = await User.create({
      name: 'Casey Rodriguez',
      email: 'casey@example.com',
      password: hashedPassword,
      role: 'student',
      school: 'State University'
    });

    console.log('Created student accounts');

    // Create Tutors
    const tutor1 = await User.create({
      name: 'Dr. Morgan Taylor',
      email: 'morgan@example.com',
      password: hashedPassword,
      role: 'tutor',
      school: 'State University'
    });

    const tutor2 = await User.create({
      name: 'Prof. Riley Garcia',
      email: 'riley@example.com',
      password: hashedPassword,
      role: 'tutor',
      school: 'Tech College'
    });

    const tutor3 = await User.create({
      name: 'Jordan Lee, PhD',
      email: 'jordan@example.com',
      password: hashedPassword,
      role: 'tutor',
      school: 'State University'
    });

    console.log('Created tutor accounts');

    // Create appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Current appointment
    const appointment1 = await Appointment.create({
      student: student1._id,
      tutor: tutor1._id,
      subject: 'Mathematics',
      startTime: tomorrow,
      status: 'confirmed'
    });

    // Future appointment
    const appointment2 = await Appointment.create({
      student: student2._id,
      tutor: tutor3._id,
      subject: 'Physics',
      startTime: nextWeek,
      status: 'pending'
    });

    // Past appointment
    const appointment3 = await Appointment.create({
      student: student1._id,
      tutor: tutor2._id,
      subject: 'Chemistry',
      startTime: lastWeek,
      status: 'completed'
    });

    console.log('Created appointments');

    // Create reviews for completed appointments
    const review1 = await Review.create({
      appointment: appointment3._id,
      rating: 5,
      comment: 'Excellent tutor, very helpful and knowledgeable!'
    });

    console.log('Created reviews');

    // Create conversations
    const conversation1 = await Conversation.create({
      participants: [student1._id, tutor1._id]
    });

    const conversation2 = await Conversation.create({
      participants: [student2._id, tutor3._id]
    });

    console.log('Created conversations');

    // Create messages
    await Message.create({
      conversation: conversation1._id,
      sender: student1._id,
      messageText: 'Hello, I need help with calculus.'
    });

    await Message.create({
      conversation: conversation1._id,
      sender: tutor1._id,
      messageText: 'Hi Alex, I would be happy to help you with calculus. When would you like to schedule a session?'
    });

    await Message.create({
      conversation: conversation2._id,
      sender: student2._id,
      messageText: 'I am struggling with quantum mechanics concepts.'
    });

    await Message.create({
      conversation: conversation2._id,
      sender: tutor3._id,
      messageText: 'Those can be tricky! Let me know which specific topics you need help with and we can set up a session.'
    });

    console.log('Created messages');
    console.log('Database seeded successfully!');
    console.log('You can log in with any email (e.g., alex@example.com or morgan@example.com) and password: password123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedDatabase();
