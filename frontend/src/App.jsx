import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Upload,
  Plus,
  RotateCcw,
  Users,
  AlertTriangle,
  Sparkles,
  Activity,
  LayoutDashboard,
  Globe,
  Calendar,
  LogOut,
  PhoneCall,
  ArrowRight,
  Search,
  Database,
  Trash2,
  ShieldCheck,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { api } from './api/client';
import StatusBadge from './components/StatusBadge';
import CreateRequisitionModal from './components/CreateRequisitionModal';
import EditRequisitionModal from './components/EditRequisitionModal';
import VirtualInterviewRoom from './components/VirtualInterviewRoom';
import CandidateDetailPanel from './components/CandidateDetailPanel';
import CandidateScreeningPage from './components/CandidateScreeningPage';
import PublicCareersSite from './components/PublicCareersSite';
import StaffLoginPage from './components/StaffLoginPage';

export default function App() {
  const getInitialViewFromPath = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/screening-call')) return 'screening_call';
    if (path.startsWith('/interview-room')) return 'interview_room';
    if (path.startsWith('/login')) return 'login';
    if (path.startsWith('/admin')) return 'admin';
    return 'public';
  };

  const [viewMode, setViewModeState] = useState(getInitialViewFromPath);
  const [adminSection, setAdminSection] = useState('dashboard'); // 'dashboard' | 'jobs' | 'candidates' | 'screenings' | 'interviews' | 'audit'
  const [loggedInUser, setLoggedInUser] = useState(null);

  const navigateTo = useCallback((mode) => {
    const targetPath =
      mode === 'login'
        ? '/login'
        : mode === 'admin'
        ? '/admin'
        : mode === 'interview_room'
        ? '/interview-room'
        : mode === 'screening_call'
        ? '/screening-call'
        : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setViewModeState(mode);
  }, []);

  const [health, setHealth] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  // 'ALL' shows candidates across ALL posted jobs so any site applicant is immediately visible!
  const [selectedReqId, setSelectedReqId] = useState('ALL');
  const [allCandidates, setAllCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [interviewers, setInterviewers] = useState([]);
  const [globalAuditLogs, setGlobalAuditLogs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState(null);

  const [userRole, setUserRole] = useState('HR Recruiter');
  const [actorName, setActorName] = useState('Ayesha Khan (HR Recruiter)');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchCandidate, setSearchCandidate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState(null);

  const handleUpdateRequisition = async (reqId, payload) => {
    try {
      await api.updateRequisition(reqId, payload, userRole);
      setBanner({ type: 'success', text: `Job Requisition #${reqId} updated successfully!` });
      await loadWorkspace();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
      throw err;
    }
  };

  const loadWorkspace = useCallback(async (overrideReqId = null) => {
    try {
      const [hlth, reqList, intList, candList] = await Promise.all([
        api.getHealth(),
        api.listRequisitions(),
        api.listInterviewers(),
        api.listAllCandidates(),
      ]);
      setHealth(hlth);
      setRequisitions(reqList);
      setInterviewers(intList);
      setAllCandidates(candList);

      if (overrideReqId !== null) {
        setSelectedReqId(overrideReqId);
      }

      setSelectedCandidateId((prev) => {
        if (prev && candList.some((c) => c.candidate_id === prev)) {
          return prev;
        }
        return candList[0]?.candidate_id || null;
      });
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
    const onPopState = () => {
      setViewModeState(getInitialViewFromPath());
      loadWorkspace();
    };
    const onFocus = () => {
      loadWorkspace();
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadWorkspace]);

  const handleLoginSuccess = async (user) => {
    setLoggedInUser(user);
    setUserRole(user.role);
    setActorName(user.name);
    await loadWorkspace();
    navigateTo('admin');
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    navigateTo('public');
  };

  const handleCreateRequisition = async (payload) => {
    const created = await api.createRequisition({ ...payload, created_by: actorName }, userRole);
    setBanner({
      type: 'success',
      text: `Job "${created.title}" published! It is now live on the Public Careers Site and ready for applicants.`,
    });
    await loadWorkspace();
    setAdminSection('jobs');
  };

  const handleDeleteRequisition = async (reqId, title) => {
    if (!window.confirm(`Delete job opening "${title}" and its associated records?`)) return;
    try {
      await api.deleteRequisition(reqId, userRole);
      setBanner({ type: 'success', text: `Deleted job opening "${title}".` });
      if (Number(selectedReqId) === Number(reqId)) {
        setSelectedReqId('ALL');
      }
      await loadWorkspace('ALL');
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleResetDemo = async (reseed = true) => {
    setBanner({
      type: 'info',
      text: reseed ? 'Reloading sample jobs and candidates...' : 'Clearing all demo data...',
    });
    await api.resetAndSeedDemo(reseed);
    setBanner({
      type: 'success',
      text: reseed ? 'Sample dataset restored!' : 'Workspace cleared — ready for your own jobs and applicants!',
    });
    setSelectedReqId('ALL');
    await loadWorkspace('ALL');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const targetJobId =
      selectedReqId !== 'ALL' ? Number(selectedReqId) : requisitions[0]?.requisition_id;
    if (!targetJobId) {
      setBanner({ type: 'error', text: 'Please create a Job Opening first before uploading resumes.' });
      return;
    }
    setUploading(true);
    setBanner(null);
    try {
      const res = await api.uploadResumes(targetJobId, files, actorName, userRole);
      setBanner({
        type: 'success',
        text: `Processed and scored ${res.processed_count} resume(s) with Agent 1!`,
      });
      await loadWorkspace();
      if (res.candidates?.[0]?.candidate_id) {
        setSelectedCandidateId(res.candidates[0].candidate_id);
      }
      setAdminSection('candidates');
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 1. PUBLIC CAREERS SITE
  if (viewMode === 'public') {
    return (
      <PublicCareersSite
        loggedInUser={loggedInUser}
        onNavigateLogin={() => navigateTo('login')}
        onNavigateAdmin={async () => {
          await loadWorkspace();
          navigateTo('admin');
        }}
      />
    );
  }

  // 2. STAFF LOGIN PAGE
  if (viewMode === 'login') {
    return (
      <StaffLoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToPublic={() => navigateTo('public')}
      />
    );
  }

  // 3. VIRTUAL INTERVIEW ROOM VIEW
  if (viewMode === 'interview_room') {
    return (
      <VirtualInterviewRoom
        onBackToDashboard={() => navigateTo('admin')}
      />
    );
  }

  // 4. CANDIDATE AI VOICE SCREENING ROOM VIEW
  if (viewMode === 'screening_call') {
    return (
      <CandidateScreeningPage
        onBackToHome={() => navigateTo('public')}
      />
    );
  }

  // 3. HR SAAS ADMIN PORTAL
  const candidatesForSelectedJob =
    selectedReqId === 'ALL'
      ? allCandidates
      : allCandidates.filter((c) => Number(c.requisition_id) === Number(selectedReqId));

  const filteredCandidates = candidatesForSelectedJob.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.current_status === statusFilter;
    const matchesSearch =
      !searchCandidate ||
      c.name.toLowerCase().includes(searchCandidate.toLowerCase()) ||
      c.email.toLowerCase().includes(searchCandidate.toLowerCase()) ||
      (c.job_title || '').toLowerCase().includes(searchCandidate.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedCandidate =
    candidatesForSelectedJob.find((c) => c.candidate_id === selectedCandidateId) ||
    filteredCandidates[0] ||
    candidatesForSelectedJob[0] ||
    null;

  const selectedCandidateRequisition =
    requisitions.find((r) => Number(r.requisition_id) === Number(selectedCandidate?.requisition_id)) ||
    requisitions[0] ||
    null;

  // KPI Metrics across current view
  const totalApplicants = candidatesForSelectedJob.length;
  const kpiShortlisted = candidatesForSelectedJob.filter((c) =>
    ['Approved for Screening', 'Screening Scheduled / Pending', 'Screening Completed — HR Review'].includes(
      c.current_status
    )
  ).length;
  const kpiInterviews = candidatesForSelectedJob.filter((c) =>
    ['Approved for Interview', 'Interview Proposed', 'Interview Scheduled'].includes(c.current_status)
  ).length;
  const kpiNeedsReview = candidatesForSelectedJob.filter((c) => c.current_status === 'Needs Manual Review').length;

  const sidebarItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Openings', icon: Briefcase, badge: requisitions.length },
    { id: 'candidates', label: 'Candidates & Scores', icon: Users, badge: totalApplicants },
    { id: 'screenings', label: 'Screening Calls', icon: PhoneCall, badge: kpiShortlisted || null },
    { id: 'interviews', label: 'Interviews', icon: Calendar, badge: kpiInterviews || null },
    { id: 'audit', label: 'Audit Trail', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Left SaaS Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden lg:flex">
        <div className="p-4 space-y-5">
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-extrabold text-slate-900 tracking-tight leading-none">TalentSense</div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">AI HR Admin Suite</div>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = adminSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={async () => {
                    setAdminSection(item.id);
                    await loadWorkspace();
                    if (item.id === 'audit') {
                      const logs = await api.getAuditLogs();
                      setGlobalAuditLogs(logs);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 ${
                        active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Database & Quick Links */}
          <div className="pt-3 border-t border-slate-100 space-y-1">
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2 truncate">
                <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold truncate">
                  {health?.database_engine?.includes('PostgreSQL') && !health?.database_engine?.includes('Fallback')
                    ? 'PostgreSQL'
                    : 'SQLite (Local DB)'}
                </span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected & Active" />
            </div>

            <button
              onClick={() => navigateTo('public')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 text-xs font-semibold text-blue-600 transition cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Globe className="w-3.5 h-3.5" />
                Public Careers Site
              </span>
              <span className="text-slate-400 text-xs">↗</span>
            </button>

            <button
              onClick={() => handleResetDemo(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-xs font-medium text-slate-600 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reload Demo Dataset
            </button>

            <button
              onClick={() => handleResetDemo(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-xs font-medium text-slate-500 hover:text-rose-600 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Demo Data
            </button>
          </div>
        </div>

        {/* Staff User Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs">
              {actorName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate leading-tight" title={actorName}>
                {actorName.split('(')[0].trim()}
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate">{userRole}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Right Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Admin Header Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3 min-h-[64px] flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-bold text-slate-900 whitespace-nowrap">
              {adminSection === 'dashboard' && 'Recruitment Overview'}
              {adminSection === 'jobs' && 'Job Openings & Rubrics'}
              {adminSection === 'candidates' && 'Candidates & Agent 1 Scores'}
              {adminSection === 'screenings' && 'Agent 2 Phone Screenings'}
              {adminSection === 'interviews' && 'Agent 3 Interview Scheduling'}
              {adminSection === 'audit' && 'Compliance & Audit Trail'}
            </h1>

            {/* Filter by Job Requisition (Defaults to ALL so every public applicant is visible!) */}
            {['dashboard', 'candidates', 'screenings', 'interviews'].includes(adminSection) && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-slate-300 font-light">|</span>
                <select
                  value={selectedReqId}
                  onChange={(e) => {
                    const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                    setSelectedReqId(val);
                  }}
                  className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:outline-none focus:border-blue-600 max-w-[260px] truncate cursor-pointer transition shadow-2xs"
                >
                  <option value="ALL">All Jobs ({allCandidates.length} applicants)</option>
                  {requisitions.map((r) => (
                    <option key={r.requisition_id} value={r.requisition_id}>
                      #{r.requisition_id}: {r.title} ({r.candidate_count || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <select
                value={userRole}
                onChange={(e) => {
                  const r = e.target.value;
                  setUserRole(r);
                  setActorName(`${r} (${loggedInUser?.name?.split(' ')[0] || 'Staff'})`);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="HR Recruiter">Role: HR Recruiter</option>
                <option value="Hiring Manager">Role: Hiring Manager</option>
                <option value="Administrator">Role: Administrator</option>
                <option value="Candidate (Restricted)">Test Unauthorized Role</option>
              </select>
            </div>

            <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{uploading ? 'Scoring...' : 'Upload Resumes'}</span>
              <span className="sm:hidden">{uploading ? '...' : 'Upload'}</span>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Post New Job</span>
              <span className="sm:hidden">New Job</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="p-6 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          {banner && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                banner.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <span>{banner.text}</span>
              <button onClick={() => setBanner(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
          )}

          {/* ================= PAGE 1: OVERVIEW DASHBOARD ================= */}
          {adminSection === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setAdminSection('candidates')}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-400 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Total Applicants</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mt-3">{totalApplicants}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">Agent 1 Scores & Gate #1 →</div>
                </div>

                <div
                  onClick={() => setAdminSection('screenings')}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-400 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Shortlisted / Screening</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mt-3">{kpiShortlisted}</div>
                  <div className="text-xs text-indigo-600 font-medium mt-1">Agent 2 Calls & Gate #2 →</div>
                </div>

                <div
                  onClick={() => setAdminSection('interviews')}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-400 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Interview Stage</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mt-3">{kpiInterviews}</div>
                  <div className="text-xs text-emerald-600 font-medium mt-1">Agent 3 Slots & Gate #3 →</div>
                </div>

                <div
                  onClick={() => {
                    setStatusFilter('Needs Manual Review');
                    setAdminSection('candidates');
                  }}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-amber-400 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Needs Manual Review</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mt-3">{kpiNeedsReview}</div>
                  <div className="text-xs text-amber-700 font-medium mt-1">Unreadable files / exceptions →</div>
                </div>
              </div>

              {/* Unified Applicants Table (Shows Public Website Applicants & Uploads across all jobs!) */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Candidate Applications ({candidatesForSelectedJob.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Showing real-time applications from the Public Careers Website and recruiter uploads.
                    </p>
                  </div>
                  <button
                    onClick={() => setAdminSection('candidates')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    Open Full Candidate Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {candidatesForSelectedJob.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="text-sm font-semibold text-slate-700">No candidate applications yet.</div>
                    <p className="text-xs text-slate-500">
                      Apply to a job from the Public Careers Website or click "Upload Resumes" above.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-5">Candidate</th>
                          <th className="py-3 px-4">Applied Role</th>
                          <th className="py-3 px-4">Agent 1 Score</th>
                          <th className="py-3 px-4">Current Status</th>
                          <th className="py-3 px-4">Time Zone</th>
                          <th className="py-3 px-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {candidatesForSelectedJob.map((cand) => (
                          <tr
                            key={cand.candidate_id}
                            onClick={() => {
                              setSelectedCandidateId(cand.candidate_id);
                              setAdminSection('candidates');
                            }}
                            className="hover:bg-slate-50/90 transition cursor-pointer"
                          >
                            <td className="py-3.5 px-5">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {cand.name}
                                {cand.evaluation?.parsing_warnings?.length > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                                    ⚠️ Prompt Injection Flag
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                {cand.email} · <span className="text-slate-400">{cand.resume_filename}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs font-semibold text-slate-800">{cand.job_title}</span>
                              <div className="text-[11px] text-slate-400">{cand.department}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              {cand.evaluation ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{cand.evaluation.total_score}/100</span>
                                  <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        cand.evaluation.total_score >= 75
                                          ? 'bg-emerald-500'
                                          : cand.evaluation.total_score >= 50
                                          ? 'bg-blue-500'
                                          : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${cand.evaluation.total_score}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-amber-700 font-semibold">Unreadable File</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={cand.current_status} />
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-600">{cand.timezone}</td>
                            <td className="py-3.5 px-5 text-right">
                              <button className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white text-xs font-semibold transition cursor-pointer">
                                Open Workflow →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= PAGE 2: JOB OPENINGS ================= */}
          {adminSection === 'jobs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Active Job Requisitions ({requisitions.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Every job posted here is immediately live on the Public Candidate Careers Website.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create New Job Requisition
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {requisitions.map((r) => (
                  <div
                    key={r.requisition_id}
                    className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-6 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-blue-600">
                          #{r.requisition_id} · {r.department}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {r.status}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRequisition(r);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="Edit Job Requisition & Rubric"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRequisition(r.requisition_id, r.title);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete Job Requisition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3
                        onClick={() => setEditingRequisition(r)}
                        className="text-lg font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer transition flex items-center justify-between"
                      >
                        <span>{r.title}</span>
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{r.job_description}</p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(r.required_skills || []).map((sk) => (
                          <span
                            key={sk}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>

                      {/* Assigned Team Lead Badge */}
                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">
                          <strong>Assigned Lead:</strong> {r.assigned_interviewer_name || 'Sarah Jenkins (Lead ML Engineer)'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 pt-0.5">
                        Rubric Weights: Skills {r.rubric?.required_skills}% · Exp {r.rubric?.relevant_experience}% ·
                        Projects {r.rubric?.role_related_projects}%
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">{r.candidate_count || 0} Applicants</span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingRequisition(r)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                        >
                          Edit Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReqId(r.requisition_id);
                            setAdminSection('candidates');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Applicants →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= PAGE 3, 4, 5: CANDIDATES / SCREENINGS / INTERVIEWS ================= */}
          {['candidates', 'screenings', 'interviews'].includes(adminSection) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Candidate Queue */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="space-y-2.5 pb-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchCandidate}
                      onChange={(e) => setSearchCandidate(e.target.value)}
                      placeholder="Search candidate name, email..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-blue-600 transition"
                  >
                    <option value="ALL">All Statuses ({candidatesForSelectedJob.length})</option>
                    {(health?.lifecycle_statuses || []).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                  {filteredCandidates.map((cand) => {
                    const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;
                    return (
                      <div
                        key={cand.candidate_id}
                        onClick={() => setSelectedCandidateId(cand.candidate_id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-600/10'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{cand.name}</div>
                            <div className="text-[11px] font-medium text-blue-600 truncate max-w-[190px]">
                              {cand.job_title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[190px]">{cand.email}</div>
                          </div>
                          {cand.evaluation ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shrink-0">
                              {cand.evaluation.total_score}/100
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold shrink-0">
                              Unreadable
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <StatusBadge status={cand.current_status} />
                          <span className="text-[10px] text-slate-400">{cand.timezone}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Candidate 3-Agent Detail Workspace */}
              <div className="lg:col-span-8">
                <CandidateDetailPanel
                  candidate={selectedCandidate}
                  requisition={selectedCandidateRequisition}
                  interviewers={interviewers}
                  userRole={userRole}
                  actorName={actorName}
                  defaultTab={
                    adminSection === 'screenings'
                      ? 'screening'
                      : adminSection === 'interviews'
                      ? 'interview'
                      : null
                  }
                  onShortlistDecision={async (cid, payload) => {
                    await api.shortlistDecision(cid, payload, userRole);
                    await loadWorkspace();
                  }}
                  onSendScreeningInvite={async (cid) => {
                    const res = await api.sendScreeningInviteEmail(cid, userRole);
                    await loadWorkspace();
                    return res;
                  }}
                  onRunScreening={async (cid, payload) => {
                    await api.runScreeningCall(cid, payload, userRole);
                    await loadWorkspace();
                  }}
                  onReviewScreening={async (cid, payload) => {
                    await api.reviewScreening(cid, payload, userRole);
                    await loadWorkspace();
                  }}
                  onProposeSlots={async (cid, payload) => {
                    await api.proposeSlots(cid, payload, userRole);
                    await loadWorkspace();
                  }}
                  onDraftInvitation={async (cid, payload) => {
                    await api.draftInvitation(cid, payload, userRole);
                    await loadWorkspace();
                  }}
                  onSendInvitation={async (cid, payload) => {
                    const res = await api.sendInvitation(cid, payload, userRole);
                    await loadWorkspace();
                    return res;
                  }}
                  onManualResolve={async (cid, targetStatus, reason) => {
                    await api.manualResolve(cid, targetStatus, reason, actorName, userRole);
                    await loadWorkspace();
                  }}
                  onDeleteCandidate={async (cid) => {
                    await api.deleteCandidate(cid, userRole);
                    await loadWorkspace();
                  }}
                />
              </div>
            </div>
          )}

          {/* ================= PAGE 6: ACTIVITY & AUDIT LOG ================= */}
          {adminSection === 'audit' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">System-Wide Audit & Compliance Trail</h2>
                <p className="text-xs text-slate-500">
                  Every job creation, candidate application, Agent 1 score, Gate #1 approval, Agent 2 call, Gate #2 review, and Gate #3 email invitation is recorded.
                </p>
              </div>
              <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto">
                {globalAuditLogs.map((log) => (
                  <div key={log.event_id} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-900">
                        #{log.event_id} · {log.action}
                      </div>
                      <div className="text-xs text-slate-500">
                        Actor: <strong className="text-slate-700">{log.actor}</strong> ({log.actor_role}) · Entity:{' '}
                        {log.entity_type} #{log.entity_id}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <CreateRequisitionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRequisition}
      />

      <EditRequisitionModal
        requisition={editingRequisition}
        isOpen={Boolean(editingRequisition)}
        onClose={() => setEditingRequisition(null)}
        onUpdate={handleUpdateRequisition}
      />
    </div>
  );
}
