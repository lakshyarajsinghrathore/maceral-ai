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

// Reject HTML responses (when SPA catch-all rewrites /api/* to index.html)
api.interceptors.response.use(
  (response) => {
    if (
      typeof response.data === 'string' &&
      (response.data.trim().toLowerCase().startsWith('<!doctype') ||
        response.data.trim().toLowerCase().startsWith('<html'))
    ) {
      return Promise.reject(new Error('Received HTML response instead of JSON from API'));
    }
    return response;
  },
  (error) => Promise.reject(error)
);

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
export const askCoalGPT = async (question, mineId = null, docCategory = null, chatHistory = [], language = 'English') => {
  const response = await api.post('/api/qa/ask', {
    question,
    mine_id: mineId,
    doc_category: docCategory,
    include_all_mines: !mineId,
    chat_history: chatHistory,
    language
  });
  return response.data;
};

export const fetchQAHistory = async () => {
  const response = await api.get('/api/qa/history');
  return response.data;
};

export const streamSpeechAudio = async (text, language = 'English') => {
  // Fast Path: Direct call to same-origin /api/speak (sub-200ms edge audio)
  try {
    const edgeResponse = await axios.post(
      '/api/speak',
      { text, language },
      { responseType: 'blob', timeout: 5000 }
    );
    if (edgeResponse.data && edgeResponse.data.type && !edgeResponse.data.type.includes('html')) {
      return edgeResponse.data;
    }
  } catch (err) {
    console.warn('Fast edge TTS unavailable, falling back to backend router...', err);
  }

  // Fallback: Primary backend /api/qa/speak
  const backendResponse = await api.post(
    '/api/qa/speak',
    { text, language },
    { responseType: 'blob', timeout: 8000 }
  );
  if (backendResponse.data && backendResponse.data.type && backendResponse.data.type.includes('html')) {
    throw new Error('Received HTML instead of audio from primary backend');
  }
  return backendResponse.data;
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

// Contractors & Labor Grievance API
export const fetchContractorsSummary = async () => {
  const response = await api.get('/api/contractors/summary');
  return response.data;
};

export const fetchContractors = async (mineId = null, status = null) => {
  const params = {};
  if (mineId && mineId !== 'all') params.mine_id = mineId;
  if (status && status !== 'all') params.status = status;
  const response = await api.get('/api/contractors/', { params });
  return response.data;
};

export const createContractor = async (contractorData) => {
  const response = await api.post('/api/contractors/', contractorData);
  return response.data;
};

export const fetchGrievances = async (mineId = null, contractorId = null, status = null, priority = null) => {
  const params = {};
  if (mineId && mineId !== 'all') params.mine_id = mineId;
  if (contractorId && contractorId !== 'all') params.contractor_id = contractorId;
  if (status && status !== 'all') params.status = status;
  if (priority && priority !== 'all') params.priority = priority;
  const response = await api.get('/api/contractors/grievances/list', { params });
  return response.data;
};

export const createGrievance = async (grievanceData) => {
  const response = await api.post('/api/contractors/grievances', grievanceData);
  return response.data;
};

export const updateGrievanceStatus = async (grievanceId, updateData) => {
  const response = await api.patch(`/api/contractors/grievances/${grievanceId}/status`, updateData);
  return response.data;
};

export const fetchGrievanceAuditTrail = async (grievanceId) => {
  const response = await api.get(`/api/contractors/grievances/${grievanceId}/audit-trail`);
  return response.data;
};

export const exportContractorsCSV = () => {
  const url = `${API_BASE_URL}/api/contractors/export`;
  window.open(url, '_blank');
};

export default api;

