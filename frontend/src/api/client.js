const API_BASE = '/api';

async function request(path, options = {}, userRole = 'HR Recruiter') {
  const headers = {
    'X-User-Role': userRole,
    ...(options.headers || {}),
  };
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `API Error (${res.status})`);
  }
  return data;
}

export const api = {
  // System & Demo Seeder
  getHealth: () => request('/health'),
  resetAndSeedDemo: (reseed = true) => request(`/demo/reset?reseed=${reseed}`, { method: 'POST' }),

  // SaaS Staff Authentication
  getDemoAccounts: () => request('/auth/demo-accounts'),
  login: (email, password) => {
    const form = new FormData();
    form.append('email', email);
    form.append('password', password);
    return request('/auth/login', { method: 'POST', body: form });
  },

  // Public Website & Candidate Portal
  listPublicJobs: () => request('/public/jobs'),
  applyToJob: (reqId, { name, email, phone, timezone, resumeFile }) => {
    const form = new FormData();
    form.append('name', name);
    form.append('email', email);
    form.append('phone', phone);
    form.append('timezone', timezone);
    form.append('resume', resumeFile);
    return request(`/public/jobs/${reqId}/apply`, { method: 'POST', body: form }, 'Candidate');
  },
  getCandidatePortal: (email) =>
    request(`/public/candidate-portal?email=${encodeURIComponent(email)}`, {}, 'Candidate'),
  getScreeningBrief: (candidateId) =>
    request(`/public/candidates/${candidateId}/screening-brief`, {}, 'Candidate'),
  submitCandidateSelfScreening: (candidateId, payload) =>
    request(`/public/candidates/${candidateId}/self-screening`, { method: 'POST', body: JSON.stringify(payload) }, 'Candidate'),

  // Recruiter & Admin Portal
  listRequisitions: () => request('/requisitions'),
  listAllCandidates: (reqId = null) =>
    request(reqId ? `/candidates?requisition_id=${reqId}` : '/candidates'),
  createRequisition: (payload, role) =>
    request('/requisitions', { method: 'POST', body: JSON.stringify(payload) }, role),
  updateRequisition: (reqId, payload, role) =>
    request(`/requisitions/${reqId}`, { method: 'PUT', body: JSON.stringify(payload) }, role),
  deleteRequisition: (reqId, role) =>
    request(`/requisitions/${reqId}`, { method: 'DELETE' }, role),
  getRequisitionDetail: (reqId) => request(`/requisitions/${reqId}`),
  getInterviewRoomDetails: (candidateId) =>
    request(`/interviews/${candidateId}/room-details`),
  uploadResumes: (reqId, files, actor, role) => {
    const form = new FormData();
    for (const f of files) {
      form.append('files', f);
    }
    form.append('actor', actor);
    return request(`/requisitions/${reqId}/resumes`, { method: 'POST', body: form }, role);
  },
  shortlistDecision: (candidateId, payload, role) =>
    request(`/candidates/${candidateId}/shortlist-decision`, { method: 'POST', body: JSON.stringify(payload) }, role),
  sendScreeningInviteEmail: (candidateId, role) =>
    request(`/candidates/${candidateId}/screening/send-invite-email`, { method: 'POST' }, role),
  getScreeningBrief: (candidateId) =>
    request(`/public/candidates/${candidateId}/screening-brief`),
  evaluateScreeningResponse: (payload) =>
    request('/screening/evaluate-response', { method: 'POST', body: JSON.stringify(payload) }),
  getSmtpStatus: () =>
    request('/settings/smtp-status'),
  testSmtp: (toEmail = 'test@example.com') =>
    request(`/settings/smtp-test?to_email=${encodeURIComponent(toEmail)}`, { method: 'POST' }),
  runScreeningCall: (candidateId, payload, role) =>
    request(`/candidates/${candidateId}/screening/run`, { method: 'POST', body: JSON.stringify(payload) }, role),
  reviewScreening: (candidateId, payload, role) =>
    request(`/candidates/${candidateId}/screening/review`, { method: 'POST', body: JSON.stringify(payload) }, role),
  listInterviewers: () => request('/scheduling/interviewers'),
  proposeSlots: (candidateId, payload, role) =>
    request(`/candidates/${candidateId}/scheduling/propose-slots`, { method: 'POST', body: JSON.stringify(payload) }, role),
  draftInvitation: (candidateId, payload, role) =>
    request(`/candidates/${candidateId}/scheduling/draft-invitation`, { method: 'POST', body: JSON.stringify(payload) }, role),
  sendInvitation: (candidateId, payload, role) =>
    request(`/candidates/${candidateId}/scheduling/send-invitation`, { method: 'POST', body: JSON.stringify(payload) }, role),
  manualResolve: (candidateId, targetStatus, reason, actor, role) => {
    const form = new FormData();
    form.append('target_status', targetStatus);
    form.append('reason', reason);
    form.append('actor', actor);
    return request(`/candidates/${candidateId}/manual-resolve`, { method: 'POST', body: form }, role);
  },
  deleteCandidate: (candidateId, role) =>
    request(`/candidates/${candidateId}`, { method: 'DELETE' }, role),
  getAuditLogs: (reqId = null) =>
    request(reqId ? `/audit-logs?requisition_id=${reqId}` : '/audit-logs'),
};
