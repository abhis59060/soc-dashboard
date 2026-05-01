import axios from 'axios';

// Create an Axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Health check endpoint
 */
export const checkHealth = async () => {
  const response = await api.get('/');
  return response.data;
};

/**
 * Log ingestion (used for manual entry or testing)
 */
export const ingestLog = async (logData) => {
  const response = await api.post('/api/logs/ingest', logData);
  return response.data;
};

/**
 * Retrieve logs with filtering
 */
export const getLogs = async (params = {}) => {
  const response = await api.get('/api/logs', { params });
  return response.data;
};

/**
 * Get dashboard statistics
 */
export const getStats = async (params = {}) => {
  const response = await api.get('/api/stats', { params });
  return response.data;
};

/**
 * Delete a specific log entry
 */
export const deleteLog = async (logId) => {
  const response = await api.delete(`/api/logs/${logId}`);
  return response.data;
};

/**
 * Get high-severity alerts
 */
export const getAlerts = async (params = {}) => {
  const response = await api.get('/api/alerts', { params });
  return response.data;
};

/**
 * Get the last 5 high-severity logs and node status changes
 */
export const getRecentAlerts = async () => {
  const response = await api.get('/api/alerts/recent');
  return response.data;
};

/**
 * Get count of unread security alerts
 */
export const getUnreadAlertCount = async () => {
  const response = await api.get('/api/alerts/unread-count');
  return response.data;
};

/**
 * Dismiss a specific alert
 */
export const dismissAlert = async (alertId) => {
  const response = await api.delete(`/api/alerts/${alertId}`);
  return response.data;
};

/**
 * Get timeline data for charts
 */
export const getTimeline = async (params = {}) => {
  const response = await api.get('/api/logs/timeline', { params });
  return response.data;
};

/**
 * Clear old logs
 */
export const clearLogs = async (params = {}) => {
  const response = await api.delete('/api/logs/clear', { params });
  return response.data;
};

/**
 * Purge all logs from the database
 */
export const purgeLogs = async () => {
  const response = await api.delete('/api/logs/purge');
  return response.data;
};

/**
 * Purge all system data (logs, alerts, stats)
 */
export const purgeData = async () => {
  const response = await api.delete('/api/system/purge');
  return response.data;
};

/**
 * Get all tracked agents and their status
 */
export const getAgents = async () => {
  const response = await api.get('/api/agents');
  return response.data;
};

/**
 * Get real-time node stats (seen ever)
 */
export const getNodes = async () => {
  const response = await api.get('/api/nodes/stats');
  return response.data;
};

/**
 * Get global network health status
 */
export const getNetworkHealth = async () => {
  const response = await api.get('/api/health/network');
  return response.data;
};

/**
 * Get real-time system performance stats
 */
export const getSystemStats = async (host = null) => {
  const params = host ? { host } : {};
  const response = await api.get('/api/system/stats', { params });
  return response.data;
};

/**
 * Get all custom alert rules
 */
export const getRules = async () => {
  const response = await api.get('/api/rules');
  return response.data;
};

/**
 * Add or update an alert rule
 */
export const addRule = async (ruleData) => {
  const response = await api.post('/api/rules', ruleData);
  return response.data;
};

/**
 * Delete an alert rule by event_id
 */
export const deleteRule = async (eventId) => {
  const response = await api.delete(`/api/rules/${eventId}`);
  return response.data;
};

export default api;
