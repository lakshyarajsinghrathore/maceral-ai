import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Attach JWT token automatically if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper for static file & generated report downloads in local or cloud environments
export const getFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Document Intelligence API
export const uploadDocument = async (formData) => {
  const response = await api.post('/api/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const fetchDocuments = async (mineId = null) => {
  const params = mineId ? { mine_id: mineId } : {};
  const response = await api.get('/api/documents/', { params });
  return response.data;
};

export const fetchDocumentDetails = async (documentId) => {
  const response = await api.get(`/api/documents/${documentId}`);
  return response.data;
};

export const deleteDocument = async (documentId) => {
  const response = await api.delete(`/api/documents/${documentId}`);
  return response.data;
};

// CoalGPT Q&A API
export const askCoalGPT = async (question, mineId = null, docCategory = null, chatHistory = []) => {
  const response = await api.post('/api/qa/ask', {
    question,
    mine_id: mineId,
    doc_category: docCategory,
    include_all_mines: !mineId,
    chat_history: chatHistory,
  });
  return response.data;
};

export const fetchQAHistory = async () => {
  const response = await api.get('/api/qa/history');
  return response.data;
};

// Ministry Reports API
export const generateMinistryReport = async (reportData) => {
  const response = await api.post('/api/reports/generate', reportData);
  return response.data;
};

export const fetchReports = async () => {
  const response = await api.get('/api/reports/');
  return response.data;
};

// Compliance & Mine Governance API
export const fetchMines = async () => {
  const response = await api.get('/api/compliance/mines');
  return response.data;
};

export const fetchComplianceScores = async () => {
  const response = await api.get('/api/compliance/scores');
  return response.data;
};

export const fetchTelemetry = async () => {
  const response = await api.get('/api/compliance/telemetry');
  return response.data;
};

export const fetchAlerts = async (status = null) => {
  const params = status ? { status } : {};
  const response = await api.get('/api/compliance/alerts', { params });
  return response.data;
};

export const handleAlertAction = async (alertId, action, notes = '', escalatedTo = '') => {
  const response = await api.post(`/api/compliance/alerts/${alertId}/action`, {
    action,
    notes,
    escalated_to: escalatedTo,
  });
  return response.data;
};

export const checkHealth = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

// Auth API
export const registerUser = async (userData) => {
  const response = await api.post('/api/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

export default api;
