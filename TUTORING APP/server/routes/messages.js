const express = require('express');

module.exports = (pool) => {
  const router = express.Router();
  
  // Create a new conversation
  router.post('/conversations', async (req, res) => {
    try {
      const { participant_id } = req.body;
      const user_id = req.user.id;
      
      console.log('Creating conversation between:', user_id, 'and', participant_id);
      
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
      
      // Check if conversation already exists using simpler query
      const [checkRows] = await pool.query(
        `SELECT * FROM conversations 
         WHERE participants LIKE ? AND participants LIKE ?`,
        [`%${user_id}%`, `%${participant_id}%`]
      );
      
      if (checkRows.length > 0) {
        console.log('Conversation already exists:', checkRows[0]);
        return res.json(checkRows[0]);
      }
      
      // Create new conversation - This is already stored as JSON in MySQL
      const participants = [parseInt(user_id), parseInt(participant_id)];
      console.log('Creating new conversation with participants:', participants);
      
      const [result] = await pool.query(
        'INSERT INTO conversations (participants) VALUES (?)',
        [JSON.stringify(participants)]
      );
      
      // Get the created conversation
      const [conversationRows] = await pool.query(
        'SELECT * FROM conversations WHERE id = ?',
        [result.insertId]
      );
      
      console.log('Created conversation:', conversationRows[0]);
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
      console.log('Fetching conversations for user ID:', userId, 'Type:', typeof userId);
      
      // Find conversations using simpler LIKE query
      const [conversationsRows] = await pool.query(
        `SELECT id, participants 
         FROM conversations 
         WHERE participants LIKE ?`,
        [`%${userId}%`]
      );
      
      console.log('Found conversations:', conversationsRows);
      
      // Format the results and get the last message for each conversation
      const conversations = [];
      
      for (const conv of conversationsRows) {
        // MySQL is automatically deserializing the JSON - we don't need to parse it
        const participants = conv.participants;
        console.log('Participants for conversation', conv.id, ':', participants);
        
        // Find the other participant (not the current user)
        const userIdNum = parseInt(userId);
        let otherParticipantId;
        
        if (Array.isArray(participants)) {
          // Loop through each participant and log it for debugging
          participants.forEach(id => {
            console.log('Checking participant ID:', id, 'Type:', typeof id, 'User ID:', userId, 'User ID as number:', userIdNum);
            console.log('Comparison result:', id !== userIdNum, id !== userId.toString());
          });
          
          // The participant IDs might be strings or numbers, so handle both cases
          otherParticipantId = participants.find(id => 
            parseInt(id) !== userIdNum && id !== userId.toString()
          );
        } else {
          console.log('Participants is not an array:', participants);
          continue;
        }
        
        console.log('Found other participant ID:', otherParticipantId);
        
        if (!otherParticipantId) {
          console.log('Could not find other participant in conversation:', conv);
          continue;
        }
        
        // Get other participant's info
        console.log('Querying user info for participant ID:', otherParticipantId);
        const [userRows] = await pool.query(
          'SELECT id, name, email FROM users WHERE id = ?',
          [otherParticipantId]
        );
        
        console.log('User query results:', userRows);
        
        if (userRows.length === 0) {
          console.log('No user found for ID:', otherParticipantId);
          continue;
        }
        
        const otherParticipant = userRows[0];
        console.log('Found other participant:', otherParticipant);
        
        // Get the last message
        console.log('Querying last message for conversation:', conv.id);
        const [messageRows] = await pool.query(
          `SELECT id, message_text, sender_id, created_at
           FROM messages
           WHERE conversation_id = ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [conv.id]
        );
        
        console.log('Message query results:', messageRows);
        
        const lastMessage = messageRows.length > 0 ? messageRows[0] : null;
        
        const conversationData = {
          id: conv.id,
          participant: otherParticipant,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            text: lastMessage.message_text,
            sent_by_me: parseInt(lastMessage.sender_id) === parseInt(userId),
            created_at: lastMessage.created_at
          } : null
        };
        
        console.log('Adding conversation to results:', conversationData);
        conversations.push(conversationData);
      }
      
      console.log('Returning conversations:', conversations);
      res.json(conversations);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Server error fetching conversations' });
    }
  });
  
  // Send a message
  // Send a message
router.post('/conversations/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;
    const { message_text } = req.body;
    
    console.log(`User ${userId} sending message to conversation ${conversationId}: ${message_text}`);
    
    if (!message_text) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    
    // Check if the conversation exists and the user is a participant
    const [checkRows] = await pool.query(
      `SELECT * FROM conversations
       WHERE id = ? AND participants LIKE ?`,
      [conversationId, `%${userId}%`]
    );
    
    console.log('Check conversation result:', checkRows);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found or not authorized' });
    }
    
    // Create the message
    const now = new Date();
    console.log(`Inserting message from user ${userId} in conversation ${conversationId} at ${now}`);
    
    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, message_text, sender_id, created_at) VALUES (?, ?, ?, ?)',
      [conversationId, message_text, userId, now]
    );
    
    console.log('Message insert result:', result);
    
    // Get the created message
    const [messageRows] = await pool.query(
      'SELECT * FROM messages WHERE id = ?',
      [result.insertId]
    );
    
    console.log('Created message:', messageRows[0]);
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
         WHERE id = ? AND participants LIKE ?`,
        [conversationId, `%${userId}%`]
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
        sent_by_me: parseInt(msg.sender_id) === parseInt(userId),
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