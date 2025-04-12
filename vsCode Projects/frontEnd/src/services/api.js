// src/services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  register: async (userData) => {
    const response = await api.post('/users/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/users/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  },
  
  getProfile: async () => {
    return await api.get('/users/profile');
  }
};

// Tutor services
export const tutorService = {
  findTutors: async (filters) => {
    return await api.get('/users/tutors', { params: filters });
  },
  
  getTutorProfile: async (id) => {
    return await api.get(`/users/tutors/${id}`);
  }
};

// Appointment services
export const appointmentService = {
  createAppointment: async (appointmentData) => {
    return await api.post('/appointments', appointmentData);
  },
  
  getMyAppointments: async () => {
    return await api.get('/appointments/my');
  },
  
  addReview: async (appointmentId, reviewData) => {
    return await api.post(`/appointments/${appointmentId}/review`, reviewData);
  },
  
  updateStatus: async (appointmentId, status) => {
    return await api.patch(`/appointments/${appointmentId}/status`, { status });
  }
};

// Messaging services
export const messageService = {
  createConversation: async (recipientId) => {
    return await api.post('/messages/conversations', { recipient_id: recipientId });
  },
  
  getConversations: async () => {
    return await api.get('/messages/conversations');
  },
  
  getMessages: async (conversationId) => {
    return await api.get(`/messages/conversations/${conversationId}/messages`);
  },
  
  sendMessage: async (conversationId, messageText) => {
    return await api.post('/messages/messages', {
      conversation_id: conversationId,
      message_text: messageText
    });
  }
};

export default {
  authService,
  tutorService,
  appointmentService,
  messageService
};