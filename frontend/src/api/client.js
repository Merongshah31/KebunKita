import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Debug log for all requests
apiClient.interceptors.request.use((config) => {
  console.log('[API Request]', config.method.toUpperCase(), config.url, config.data);
  return config;
});

// Debug log and error handling for responses
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.status, response.config.url, response.data);
    return response;
  },
  (error) => {
    const errorObj = {
      status: error.response?.status || 'N/A',
      statusText: error.response?.statusText || '',
      message: error.message,
      url: error.config?.url || '',
      data: error.response?.data || {},
      timestamp: new Date().toISOString(),
    };
    console.error('[API Error]', errorObj);
    // Attach full error info for UI to display
    error.debugInfo = errorObj;
    return Promise.reject(error);
  }
);

// API methods
export const apiService = {
  // Plant Health Agent
  analyzePlant: (userId, imageName, imageFile, notes = '') => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('image_name', imageName);
    formData.append('image', imageFile);
    if (notes) formData.append('notes', notes);
    
    return apiClient.post('/api/agents/plant-health', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Smart Farming Agent
  createFarmingPlan: (userId, cropType, areaSize, soilType = '', waterSource = '') => {
    return apiClient.post('/api/agents/smart-farming', {
      user_id: userId,
      crop_type: cropType,
      area_size: areaSize,
      soil_type: soilType,
      water_source: waterSource,
    });
  },

  // Community Exchange Agent
  matchHarvest: (userId, cropName, quantity, location = '') => {
    return apiClient.post('/api/agents/community-exchange', {
      user_id: userId,
      crop_name: cropName,
      quantity,
      location,
    });
  },

  // Decision Support (Chat) Agent
  askDecisionSupport: (userId, question, context = '') => {
    return apiClient.post('/api/agents/decision-support', {
      user_id: userId,
      question,
      context,
    });
  },

  // Memory lookup
  getMemory: (userId) => {
    return apiClient.get(`/api/agents/memory/${userId}`);
  },

  // Guardrails debug endpoint
  getGuardrails: () => {
    return apiClient.get('/api/agents/guardrails');
  },

  // Health check
  getHealth: () => {
    return apiClient.get('/health');
  },
};

export default apiClient;
