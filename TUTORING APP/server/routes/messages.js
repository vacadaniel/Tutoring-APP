const express = require('express');

module.exports = (pool) => {
  const router = express.Router();
  
  // Create a new conversation
  router.post('/conversations', async (req, res) => {
    try {
      const { participant_id } = req.body;
      const user_id = req.user.id;
      
      if (!participant_id) {
        return res.status(400).json({ error: 'Participant ID is required' });
      }
      
      // Check if the participant exists
      const [userRows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [participant_id]
      );
      
      if (userRows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if conversation already exists
      // Using JSON_CONTAINS to check if both participants are in the JSON array
      const [checkRows] = await pool.query(
        `SELECT * FROM conversations 
         WHERE JSON_CONTAINS(participants, ?) AND JSON_CONTAINS(participants, ?)`,
        [JSON.stringify(user_id), JSON.stringify(participant_id)]
      );
      
      if (checkRows.length > 0) {
        return res.json(checkRows[0]);
      }
      
      // Create new conversation
      const participants = JSON.stringify([user_id, parseInt(participant_id)]);
      const [result] = await pool.query(
        'INSERT INTO conversations (participants) VALUES (?)',
        [participants]
      );
      
      // Get the created conversation
      const [conversationRows] = await pool.query(
        'SELECT * FROM conversations WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json(conversationRows[0]);
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Server error creating conversation' });
    }
  });
  
  // Get all conversations for the current user
  router.get('/conversations', async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Find conversations where the user is a participant
      const [conversationsRows] = await pool.query(
        `SELECT id, participants 
         FROM conversations 
         WHERE JSON_CONTAINS(participants, ?)`,
        [JSON.stringify(userId)]
      );
      
      // Format the results and get the last message for each conversation
      const conversations = [];
      
      for (const conv of conversationsRows) {
        // Parse the participants JSON
        const participants = JSON.parse(conv.participants);
        // Get other participant's ID (the one that's not the current user)
        const otherParticipantId = participants.find(id => id !== userId);
        
        // Get other participant's info
        const [userRows] = await pool.query(
          'SELECT id, name, email FROM users WHERE id = ?',
          [otherParticipantId]
        );
        
        if (userRows.length === 0) continue;
        
        const otherParticipant = userRows[0];
        
        // Get the last message
        const [messageRows] = await pool.query(
          `SELECT id, message_text, sender_id, created_at
           FROM messages
           WHERE conversation_id = ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [conv.id]
        );
        
        const lastMessage = messageRows.length > 0 ? messageRows[0] : null;
        
        conversations.push({
          id: conv.id,
          participant: otherParticipant,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            text: lastMessage.message_text,
            sent_by_me: lastMessage.sender_id === userId,
            created_at: lastMessage.created_at
          } : null
        });
      }
      
      res.json(conversations);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Server error fetching conversations' });
    }
  });
  
  // Send a message
  router.post('/conversations/:id', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      const { message_text } = req.body;
      
      if (!message_text) {
        return res.status(400).json({ error: 'Message text is required' });
      }
      
      // Check if the conversation exists and the user is a participant
      const [checkRows] = await pool.query(
        `SELECT * FROM conversations
         WHERE id = ? AND JSON_CONTAINS(participants, ?)`,
        [conversationId, JSON.stringify(userId)]
      );
      
      if (checkRows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found or not authorized' });
      }
      
      // Create the message
      const now = new Date();
      const [result] = await pool.query(
        'INSERT INTO messages (conversation_id, message_text, sender_id, created_at) VALUES (?, ?, ?, ?)',
        [conversationId, message_text, userId, now]
      );
      
      // Get the created message
      const [messageRows] = await pool.query(
        'SELECT * FROM messages WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json(messageRows[0]);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Server error sending message' });
    }
  });
  
  // Get all messages in a conversation
  router.get('/conversations/:id', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      
      // Check if the conversation exists and the user is a participant
      const [checkRows] = await pool.query(
        `SELECT * FROM conversations
         WHERE id = ? AND JSON_CONTAINS(participants, ?)`,
        [conversationId, JSON.stringify(userId)]
      );
      
      if (checkRows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found or not authorized' });
      }
      
      // Get the messages
      const [messageRows] = await pool.query(
        `SELECT 
          m.id, m.message_text, m.created_at,
          u.id as sender_id, u.name as sender_name
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at ASC`,
        [conversationId]
      );
      
      // Format the messages
      const messages = messageRows.map(msg => ({
        id: msg.id,
        text: msg.message_text,
        sender: {
          id: msg.sender_id,
          name: msg.sender_name
        },
        sent_by_me: msg.sender_id === userId,
        created_at: msg.created_at
      }));
      
      res.json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Server error fetching messages' });
    }
  });
  
  return router;
};
