/** Fetch wrapper for the dashboard API. */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// Experiments
export const fetchExperiments = () => request('/experiments');
export const fetchExperiment = (id) => request(`/experiments/${id}`);

// Programs
export const fetchPrograms = (expId, params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  return request(`/experiments/${expId}/programs?${qs}`);
};
export const fetchProgram = (expId, progId) =>
  request(`/experiments/${expId}/programs/${progId}`);

// Search
export const searchPrograms = (expId, query, max = 50) =>
  request(`/experiments/${expId}/search?q=${encodeURIComponent(query)}&max_results=${max}`);

// Conversations
export const fetchConversations = (expId, params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  return request(`/experiments/${expId}/conversations?${qs}`);
};

// Metrics
export const fetchMetrics = (expId) => request(`/experiments/${expId}/metrics`);

// Islands
export const fetchIslands = (expId) => request(`/experiments/${expId}/islands`);

// Lineage
export const fetchLineage = (expId, programId) => {
  const qs = programId ? `?program_id=${programId}` : '';
  return request(`/experiments/${expId}/lineage${qs}`);
};

// Meta scratchpad (ShinkaEvolve)
export const fetchMetaFiles = (expId) => request(`/experiments/${expId}/meta-files`);
export const fetchMetaContent = (expId, gen) =>
  request(`/experiments/${expId}/meta-content/${gen}`);

// Analytics
export const fetchAnalytics = (expId) => request(`/experiments/${expId}/analytics`);

// Best Path
export const fetchBestPath = (expId) => request(`/experiments/${expId}/best-path`);

// Embeddings (similarity matrix)
export const fetchEmbeddings = (expId, max = 200) =>
  request(`/experiments/${expId}/embeddings?max_programs=${max}`);

// Frameworks
export const fetchFrameworks = () => request('/frameworks');

// Health
export const fetchHealth = () => request('/health');
