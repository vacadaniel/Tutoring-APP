// routes/messages.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

// Import models
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create or get conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { recipient_id } = req.body;
    const user_id = req.user.id;
    
    // Validate recipient ID
    if (!mongoose.Types.ObjectId.isValid(recipient_id)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }
    
    // Check if users exist
    const recipient = await User.findById(recipient_id);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [user_id, recipient_id] }
    });
    
    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [user_id, recipient_id]
      });
      
      await conversation.save();
    }
    
    // Populate participant details
    await conversation.populate('participants', 'name email');
    
    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Get all conversations where the user is a participant
    const conversations = await Conversation.find({
      participants: user_id
    }).populate('participants', 'name email');
    
    // For each conversation, get the latest message
    const conversationsWithLastMessage = [];
    
    for (const conv of conversations) {
      const lastMessage = await Message.findOne({ conversation: conv._id })
        .sort({ createdAt: -1 })
        .limit(1);
      
      conversationsWithLastMessage.push({
        _id: conv._id,
        participants: conv.participants.filter(p => p._id.toString() !== user_id),
        lastMessage: lastMessage ? lastMessage.messageText : null,
        updatedAt: lastMessage ? lastMessage.createdAt : conv.createdAt
      });
    }
    
    // Sort by latest message
    conversationsWithLastMessage.sort((a, b) => b.updatedAt - a.updatedAt);
    
    res.json(conversationsWithLastMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send message
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { conversation_id, message_text } = req.body;
    const user_id = req.user.id;
    
    // Check if conversation exists and user is part of it
    const conversation = await Conversation.findOne({
      _id: conversation_id,
      participants: user_id
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or not authorized' });
    }
    
    // Create new message
    const newMessage = new Message({
      conversation: conversation_id,
      sender: user_id,
      messageText: message_text
    });
    
    await newMessage.save();
    
    // Populate sender info
    await newMessage.populate('sender', 'name');
    
    res.status(201).json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversation_id = req.params.id;
    const user_id = req.user.id;
    
    // Check if conversation exists and user is part of it
    const conversation = await Conversation.findOne({
      _id: conversation_id,
      participants: user_id
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or not authorized' });
    }
    
    // Get messages with sender info
    const messages = await Message.find({ conversation: conversation_id })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;