import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    error.debugInfo = {
      status: error.response?.status || 'N/A',
      message: error.response?.data?.detail || error.message,
      url: error.config?.url || '',
      data: error.response?.data || {},
    };
    return Promise.reject(error);
  }
);

const formPost = (url, fields) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value);
    }
  });

  return apiClient.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const apiService = {
  get baseUrl() {
    return API_BASE_URL;
  },

  createGuest: (fullName = 'Guest Grower', locationText = 'Tanjung Malim') =>
    apiClient.post('/api/auth/guest', {
      full_name: fullName,
      location_text: locationText,
    }),

  getUser: (userId) => apiClient.get(`/api/auth/users/${userId}`),

  analyzePlant: (userId, imageFile, notes = '') =>
    formPost('/api/agents/plant-health', {
      user_id: userId,
      file: imageFile,
      notes,
    }),

  createFarmingPlan: (userId, plantName, budgetRm = '') =>
    formPost('/api/agents/smart-farming', {
      user_id: userId,
      plant_name: plantName,
      budget_rm: budgetRm,
    }),

  matchHarvest: (userId, title, quantity, location = '') =>
    formPost('/api/agents/community-exchange', {
      user_id: userId,
      title,
      quantity,
      location,
    }),

  askDecisionSupport: (userId, payload) =>
    formPost('/api/agents/decision-support', {
      user_id: userId,
      budget_rm: payload.budgetRm,
      timeline_weeks: payload.timelineWeeks,
      space: payload.space,
      goal: payload.goal,
      chat_message: payload.chatMessage,
    }),

  listPlants: (userId) => apiClient.get('/api/plants', { params: { user_id: userId } }),

  createPlant: (payload) => apiClient.post('/api/plants', payload),

  waterPlant: (plantId, userId, amount = '500ml') =>
    apiClient.post(`/api/plants/${plantId}/water`, {
      user_id: userId,
      amount,
    }),

  getMemory: (userId) => apiClient.get(`/api/agents/memory/${userId}`),

  getGuardrails: () => apiClient.get('/api/agents/guardrails'),

  getHealth: () => apiClient.get('/health'),
};

export default apiClient;
