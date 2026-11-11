import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Briefcase,
  MapPin,
  Clock,
  Upload,
  Search,
  PhoneCall,
  Calendar,
  ArrowRight,
  Lock,
  UserCheck,
  X,
  Building2,
  CheckCircle2,
  User,
  LogOut,
  RefreshCw,
  Video,
  ExternalLink,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from './StatusBadge';

const SAMPLE_APPLICANTS = [
  { name: 'Muhammad Ahmed', email: 'ahmednadeemryk20@gmail.com', role: 'AI / Machine Learning Engineer' },
  { name: 'Ayesha Siddiqui', email: 'ayesha.siddiqui@example.com', role: 'AI / Machine Learning Engineer' },
  { name: 'Bilal Ahmed', email: 'bilal.ahmed@example.com', role: 'AI / Machine Learning Engineer' },
  { name: 'Hamza Malik', email: 'hamza.malik@example.com', role: 'AI / Machine Learning Engineer' },
];

export default function PublicCareersSite({ onNavigateLogin, loggedInUser, onNavigateAdmin }) {
  const [publicTab, setPublicTab] = useState('jobs'); // 'jobs' | 'tracker'
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobLoadError, setJobLoadError] = useState(null);

  // Candidate Session State (Persisted in localStorage)
  const [candidateUser, setCandidateUser] = useState(() => {
    try {
      const saved = localStorage.getItem('talentsense_candidate_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showCandidateLoginModal, setShowCandidateLoginModal] = useState(false);
  const [modalLoginEmail, setModalLoginEmail] = useState('');

  // Apply Form State
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('+92-300-1234567');
  const [candTz, setCandTz] = useState('Asia/Karachi');
  const [resumeFile, setResumeFile] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState(null);

  // Candidate Tracker State
  const [lookupEmail, setLookupEmail] = useState(candidateUser?.email || 'ahmednadeemryk20@gmail.com');
  const [myApplications, setMyApplications] = useState([]);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalMessage, setPortalMessage] = useState(null);
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [screeningAvail, setScreeningAvail] = useState('Tuesday or Wednesday, 11:00 AM - 4:00 PM PKT');

  const loadJobs = async () => {
    setLoadingJobs(true);
    setJobLoadError(null);
    try {
      const list = await api.listPublicJobs();
      const safeList = Array.isArray(list) ? list : [];
      setJobs(safeList);
      if (safeList.length > 0) {
        setSelectedJob((prev) => (prev && safeList.some((j) => j.requisition_id === prev.requisition_id) ? prev : safeList[0]));
      }
    } catch (err) {
      console.error('Failed to load public jobs:', err);
      setJobLoadError(err.message || 'Failed to load jobs from server');
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadJobs();
    if (candidateUser?.email) {
      handleLookupApplications(candidateUser.email);
    }
  }, []);

  const handleCandidateLogin = (email, name = '') => {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name || cleanEmail.split('@')[0];
    const userObj = { email: cleanEmail, name: cleanName };
    setCandidateUser(userObj);
    localStorage.setItem('talentsense_candidate_user', JSON.stringify(userObj));
    setLookupEmail(cleanEmail);
    setShowCandidateLoginModal(false);
    setPublicTab('tracker');
    handleLookupApplications(cleanEmail);
  };

  const handleCandidateLogout = () => {
    setCandidateUser(null);
    localStorage.removeItem('talentsense_candidate_user');
    setMyApplications([]);
    setPortalMessage(null);
  };

  const handleLookupApplications = async (emailToSearch = lookupEmail) => {
    if (!emailToSearch) return;
    setLoadingPortal(true);
    setPortalMessage(null);
    try {
      const res = await api.getCandidatePortal(emailToSearch);
      setMyApplications(res);
      if (res.length === 0) {
        setPortalMessage({
          type: 'info',
          text: `No applications found for "${emailToSearch}". You can apply for any open role or test with a sample applicant.`,
        });
      } else {
        const first = res[0];
        const userObj = { email: first.email, name: first.name };
        setCandidateUser(userObj);
        localStorage.setItem('talentsense_candidate_user', JSON.stringify(userObj));
      }
    } catch (err) {
      setPortalMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyModalJob || !resumeFile) return;
    setApplying(true);
    setApplyFeedback(null);
    try {
      const res = await api.applyToJob(applyModalJob.requisition_id, {
        name: candName,
        email: candEmail,
        phone: candPhone,
        timezone: candTz,
        resumeFile,
      });
      setApplyFeedback({
        type: 'success',
        text: `Application submitted! Signing you into your candidate portal...`,
      });
      const userObj = {
        name: candName.trim() || res.candidate_name || 'Candidate',
        email: (res.email || candEmail).trim().toLowerCase(),
      };
      setCandidateUser(userObj);
      localStorage.setItem('talentsense_candidate_user', JSON.stringify(userObj));
      setLookupEmail(userObj.email);
      setTimeout(() => {
        setApplyModalJob(null);
        setApplyFeedback(null);
        setPublicTab('tracker');
        handleLookupApplications(userObj.email);
      }, 1000);
    } catch (err) {
      setApplyFeedback({ type: 'error', text: err.message });
    } finally {
      setApplying(false);
    }
  };

  const handleCandidateScreeningAction = async (candidateId, mode) => {
    setLoadingPortal(true);
    setPortalMessage(null);
    try {
      await api.submitCandidateSelfScreening(candidateId, {
        mode,
        custom_answers: screeningAnswers,
        candidate_stated_availability: screeningAvail,
        actor: `Candidate (${lookupEmail})`,
      });
      setPortalMessage({
        type: 'success',
        text:
          mode === 'custom_interactive'
            ? 'Your screening answers have been submitted to our recruitment team!'
            : mode === 'decline_recording'
            ? 'Your preference for an unrecorded screening has been saved. A recruiter will reach out.'
            : 'We have notified a human recruiter to contact you directly.',
      });
      await handleLookupApplications(lookupEmail);
    } catch (err) {
      setPortalMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingPortal(false);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    const titleMatch = (j.title || '').toLowerCase().includes(q);
    const deptMatch = (j.department || '').toLowerCase().includes(q);
    const skills = Array.isArray(j.required_skills)
      ? j.required_skills
      : typeof j.required_skills === 'string'
      ? [j.required_skills]
      : [];
    const skillsMatch = skills.some((s) => String(s).toLowerCase().includes(q));
    return titleMatch || deptMatch || skillsMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Clean SaaS Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div onClick={() => setPublicTab('jobs')} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">TalentSense</span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Careers
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPublicTab('jobs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                publicTab === 'jobs'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open Positions ({jobs.length})
            </button>
            <button
              onClick={() => {
                setPublicTab('tracker');
                if (candidateUser?.email) {
                  handleLookupApplications(candidateUser.email);
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                publicTab === 'tracker'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              {candidateUser ? 'Candidate Portal' : 'Track My Application'}
              {myApplications.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                  {myApplications.length}
                </span>
              )}
            </button>
          </nav>

          <div className="flex items-center gap-2.5">
            {/* Candidate User Pill */}
            {candidateUser ? (
              <div className="flex items-center gap-1.5">
                <div
                  onClick={() => {
                    setPublicTab('tracker');
                    handleLookupApplications(candidateUser.email);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition"
                  title="Click to view Candidate Portal"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                    {candidateUser.name ? candidateUser.name.slice(0, 1).toUpperCase() : 'C'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-slate-800 leading-tight">
                      {candidateUser.name}
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium">Candidate</div>
                  </div>
                </div>

                <button
                  onClick={handleCandidateLogout}
                  title="Sign out of Candidate Portal"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCandidateLoginModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                Candidate Sign In
              </button>
            )}

            {/* Recruiter Suite Access */}
            {loggedInUser ? (
              <button
                onClick={onNavigateAdmin}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                Recruiter Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onNavigateLogin}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Recruiter Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* TAB 1: PUBLIC CAREERS BOARD */}
      {publicTab === 'jobs' && (
        <div className="flex-1">
          {/* Clean Modern Hero Banner */}
          <section className="bg-white border-b border-slate-200 py-12 px-4">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                We're Hiring Across Engineering & AI
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Find your next role at <span className="text-blue-600">TalentSense</span>
              </h1>
              <p className="text-base text-slate-600 max-w-2xl mx-auto">
                Browse open roles posted by our hiring team, upload your resume in seconds, and track every stage of your application online.
              </p>

              <div className="max-w-xl mx-auto pt-2">
                <div className="relative flex items-center">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by job title, team, or skill (Python, React, FastAPI)..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Job Board Split Layout */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left List of Jobs */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Available Roles ({loadingJobs ? '...' : filteredJobs.length})
                  </h2>
                  <button
                    onClick={loadJobs}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                {jobLoadError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
                    <p className="font-semibold">Failed to connect to backend: {jobLoadError}</p>
                    <button
                      onClick={loadJobs}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {loadingJobs && (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingJobs && !jobLoadError && filteredJobs.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No open positions found</p>
                    <p className="text-xs text-slate-500">
                      Try clearing your search query or check back later.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        loadJobs();
                      }}
                      className="text-xs text-blue-600 font-bold underline cursor-pointer"
                    >
                      Clear search & reload jobs
                    </button>
                  </div>
                )}

                {!loadingJobs && filteredJobs.map((job) => {
                  const active = selectedJob?.requisition_id === job.requisition_id;
                  return (
                    <div
                      key={job.requisition_id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-5 rounded-2xl border transition cursor-pointer ${
                        active
                          ? 'bg-white border-blue-600 ring-2 ring-blue-600/10 shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-blue-600">{job.department}</span>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5">{job.title}</h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {job.location_work_arrangement}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {job.min_experience_years}+ yrs experience
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3.5">
                        {(job.required_skills || []).map((skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Job Details Card */}
              <div className="lg:col-span-7">
                {!selectedJob && !loadingJobs && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-sm">
                    Select an open role on the left to review requirements and apply.
                  </div>
                )}
                {selectedJob && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm sticky top-24">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
                      <div>
                        <div className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" />
                          {selectedJob.department}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedJob.title}</h2>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-2">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {selectedJob.location_work_arrangement}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            {selectedJob.min_experience_years}+ Years Experience
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setApplyModalJob(selectedJob)}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        Apply Now
                      </button>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-900">About the Role</h3>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {selectedJob.job_description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                          Required Skills
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedJob.required_skills || []).map((sk) => (
                            <span
                              key={sk}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold shadow-2xs"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                          Bonus / Preferred Skills
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedJob.preferred_skills || []).map((sk) => (
                            <span
                              key={sk}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-900">What happens after you apply?</strong> Our recruiting team reviews every application. If shortlisted, you'll receive an invite in your Candidate Portal for a quick 5-minute preliminary screening and interview scheduling.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: CANDIDATE APPLICATION TRACKER & PORTAL */}
      {publicTab === 'tracker' && (
        <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 space-y-6 flex-1">
          {/* Candidate Profile Header OR Sign-In Banner */}
          {candidateUser ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                  {candidateUser.name ? candidateUser.name.slice(0, 1).toUpperCase() : 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">
                      Welcome, {candidateUser.name}!
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Candidate Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Logged in as <strong>{candidateUser.email}</strong> · Real-time Application Status & Interactive Stages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLookupApplications(candidateUser.email)}
                  disabled={loadingPortal}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Refresh latest updates from recruiting team"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPortal ? 'animate-spin' : ''}`} />
                  {loadingPortal ? 'Checking...' : 'Refresh Status'}
                </button>
                <button
                  type="button"
                  onClick={handleCandidateLogout}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Candidate Sign In & Application Tracker</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Sign in with your email address to check your real-time status, launch your AI voice screening, or join scheduled technical interviews.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="Enter your email address (e.g. ahmednadeemryk20@gmail.com)..."
                  className="flex-1 rounded-xl bg-slate-50 border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
                <button
                  onClick={() => handleCandidateLogin(lookupEmail)}
                  disabled={loadingPortal}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  {loadingPortal ? 'Signing In...' : 'Sign In as Candidate'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400">Quick Candidate Logins:</span>
                {SAMPLE_APPLICANTS.map((app) => (
                  <button
                    key={app.email}
                    onClick={() => handleCandidateLogin(app.email, app.name)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 text-slate-700 font-medium transition cursor-pointer"
                  >
                    👤 {app.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {portalMessage && (
            <div
              className={`p-4 rounded-xl border text-sm font-medium ${
                portalMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {portalMessage.text}
            </div>
          )}

          <div className="space-y-5">
            {myApplications.length === 0 && !loadingPortal && !portalMessage && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No applications found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You haven't submitted any job applications under this email yet. Browse our open positions and submit your resume!
                </p>
                <button
                  onClick={() => setPublicTab('jobs')}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 cursor-pointer"
                >
                  Browse Open Positions →
                </button>
              </div>
            )}

            {myApplications.map((app) => (
              <div
                key={app.candidate_id}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs"
              >
                {/* Application Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-blue-600">{app.department}</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{app.job_title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Applicant: <strong className="text-slate-800">{app.name}</strong> ({app.email}) · Timezone: {app.timezone}
                      {app.applied_at && ` · Applied: ${new Date(app.applied_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <StatusBadge status={app.current_status} />
                </div>

                {/* 4-Stage Candidate Visual Stepper */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Application Hiring Pipeline
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    {/* Stage 1: Resume Submission */}
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        1. Resume Submitted
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-1">
                        AI Agent 1 evaluation complete
                      </div>
                    </div>

                    {/* Stage 2: Shortlist Decision */}
                    <div className={`p-3 rounded-xl border ${
                      ['Approved for Screening', 'Screening Scheduled / Pending', 'Screening Completed — HR Review', 'Approved for Interview', 'Interview Proposed', 'Interview Scheduled'].includes(app.current_status)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold">
                        {['Approved for Screening', 'Screening Scheduled / Pending', 'Screening Completed — HR Review', 'Approved for Interview', 'Interview Proposed', 'Interview Scheduled'].includes(app.current_status) ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        2. Recruiter Shortlist
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {['Approved for Screening', 'Screening Scheduled / Pending', 'Screening Completed — HR Review', 'Approved for Interview', 'Interview Proposed', 'Interview Scheduled'].includes(app.current_status)
                          ? 'Gate #1 Approved by HR'
                          : 'In HR review queue'}
                      </div>
                    </div>

                    {/* Stage 3: Voice AI Screening */}
                    <div className={`p-3 rounded-xl border ${
                      app.screening_completed || ['Approved for Interview', 'Interview Proposed', 'Interview Scheduled'].includes(app.current_status)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : app.can_take_screening
                        ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold">
                        {app.screening_completed || ['Approved for Interview', 'Interview Proposed', 'Interview Scheduled'].includes(app.current_status) ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : app.can_take_screening ? (
                          <PhoneCall className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        3. Voice AI Screening
                      </div>
                      <div className="text-[11px] mt-1">
                        {app.screening_completed
                          ? 'Call completed & recorded'
                          : app.can_take_screening
                          ? '👉 Call Ready to Start'
                          : 'Awaiting Gate #1'}
                      </div>
                    </div>

                    {/* Stage 4: Technical Interview */}
                    <div className={`p-3 rounded-xl border ${
                      app.interview_scheduled
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold">
                        {app.interview_scheduled ? (
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        4. Team Lead Interview
                      </div>
                      <div className="text-[11px] mt-1">
                        {app.interview_scheduled
                          ? 'Confirmed & Meeting Ready'
                          : 'Pending Gate #2 approval'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Screening Call Action Card when Shortlisted */}
                {app.can_take_screening && (
                  <div className="p-5 rounded-2xl bg-blue-50/80 border-2 border-blue-300 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
                          Action Required
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-2 flex items-center gap-2">
                          <PhoneCall className="w-5 h-5 text-blue-600" />
                          Interactive AI Voice Screening Call Ready
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                          Congratulations! You've been shortlisted. Our AI Recruitment Assistant will ask you 3–4 role-related questions aloud. Speak your answers naturally via your microphone (~5 minutes).
                        </p>
                      </div>

                      <a
                        href={`/screening-call?candidate_id=${app.candidate_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
                      >
                        <PhoneCall className="w-4 h-4" />
                        Launch AI Voice Screening Room →
                      </a>
                    </div>

                    {/* Fallback Text Q&A Form */}
                    <details className="pt-2 text-xs text-slate-700">
                      <summary className="font-semibold text-blue-600 cursor-pointer hover:underline mb-2">
                        Alternative: Submit Written Answers (if you do not have a microphone)
                      </summary>
                      <div className="space-y-3 pt-2">
                        {(app.screening_questions || []).map((q, idx) => (
                          <div key={idx}>
                            <label className="block text-xs font-semibold text-slate-800 mb-1">
                              {idx + 1}. {q}
                            </label>
                            <input
                              type="text"
                              placeholder="Write your answer..."
                              value={screeningAnswers[idx] || ''}
                              onChange={(e) =>
                                setScreeningAnswers({ ...screeningAnswers, [idx]: e.target.value })
                              }
                              className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                            />
                          </div>
                        ))}

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 mb-1">
                            Your Availability for an Interview & Notice Period
                          </label>
                          <input
                            type="text"
                            value={screeningAvail}
                            onChange={(e) => setScreeningAvail(e.target.value)}
                            className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2.5 pt-1">
                          <button
                            disabled={loadingPortal}
                            onClick={() => handleCandidateScreeningAction(app.candidate_id, 'custom_interactive')}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                          >
                            Submit Written Answers
                          </button>
                          <button
                            disabled={loadingPortal}
                            onClick={() => handleCandidateScreeningAction(app.candidate_id, 'request_human')}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
                          >
                            Request Human Recruiter Contact
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>
                )}

                {/* Scheduled Interview Card */}
                {app.interview_scheduled && app.interview_details && (
                  <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        Your Technical Interview is Confirmed!
                      </div>
                      <a
                        href={app.interview_details.meeting_link || `/interview-room?candidate_id=${app.candidate_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Video className="w-4 h-4" />
                        Enter Virtual Video Interview Room →
                      </a>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-white border border-emerald-200 space-y-1">
                        <span className="text-slate-500 font-medium">Scheduled Time (Your Timezone: {app.timezone}):</span>
                        <div className="font-bold text-slate-900 text-sm">
                          {app.interview_details.confirmed_slot?.candidate_local_time || 'Confirmed by HR'}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white border border-emerald-200 space-y-1">
                        <span className="text-slate-500 font-medium">Interviewer & Department Lead:</span>
                        <div className="font-bold text-slate-900 text-sm">
                          {app.interview_details.interviewer_name}
                        </div>
                        <div className="text-blue-600 text-[11px] truncate">
                          Room: {app.interview_details.meeting_link || `/interview-room?candidate_id=${app.candidate_id}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Apply Modal */}
      {applyModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-blue-600">Apply for Position</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{applyModalJob.title}</h3>
              </div>
              <button onClick={() => setApplyModalJob(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1-Click Test Helper so User can test applying immediately without searching for a file */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Quick Test Fill (Auto-Fills Form + Attaches Sample Resume)
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const skills = (applyModalJob.required_skills || ['Python', 'FastAPI', 'SQL']).join(', ');
                    const pref = (applyModalJob.preferred_skills || ['Docker', 'AWS']).join(', ');
                    const text = `Usman Ali\nEmail: usman.ali@example.com | Phone: +92-300-5551122 | Location: Lahore, Pakistan\n\nPROFESSIONAL SUMMARY\nSenior Engineer with 3.5 years of hands-on production experience in ${skills}.\n\nWORK EXPERIENCE\nLead Software & AI Engineer — NextGen Systems (3.5 years)\n- Architected and deployed production services using ${skills} serving 100k+ daily requests.\n- Built scalable pipelines and cloud deployments using ${pref}.\n\nPROJECTS\n- Enterprise Automation Platform: Designed end-to-end microservices and ML workflows with ${skills} and ${pref}.\n\nEDUCATION\nB.S. in Computer Science — LUMS\nAWS Certified Solutions Architect`;
                    const file = new File([text], 'Usman_Ali_Strong_Match_Resume.txt', { type: 'text/plain' });
                    setCandName('Usman Ali');
                    setCandEmail('usman.ali@example.com');
                    setCandPhone('+92-300-5551122');
                    setCandTz('Asia/Karachi');
                    setResumeFile(file);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  + Strong Match Candidate (Usman Ali)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstSkill = (applyModalJob.required_skills || ['Python'])[0];
                    const text = `Sara Tariq\nEmail: sara.tariq@example.com | Phone: +971-50-4443322 | Location: Dubai\n\nSUMMARY\nJunior Developer with 1 year of experience working with ${firstSkill}.\n\nEXPERIENCE\nAssociate Developer — Techify (1 year)\n- Built internal scripts and assisted senior engineers using ${firstSkill}.\n\nEDUCATION\nB.S. in Software Engineering — FAST-NUCES`;
                    const file = new File([text], 'Sara_Tariq_Partial_Match_Resume.txt', { type: 'text/plain' });
                    setCandName('Sara Tariq');
                    setCandEmail('sara.tariq@example.com');
                    setCandPhone('+971-50-4443322');
                    setCandTz('Asia/Dubai');
                    setResumeFile(file);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-blue-300 text-blue-700 text-xs font-semibold transition cursor-pointer"
                >
                  + Partial Match (Sara Tariq)
                </button>
              </div>
            </div>

            {applyFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium ${
                  applyFeedback.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                {applyFeedback.text}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={candPhone}
                    onChange={(e) => setCandPhone(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time Zone</label>
                <select
                  value={candTz}
                  onChange={(e) => setCandTz(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                >
                  <option value="Asia/Karachi">Asia/Karachi (PKT UTC+05:00)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST UTC+04:00)</option>
                  <option value="Europe/London">Europe/London (GMT UTC+00:00)</option>
                  <option value="America/New_York">America/New_York (EST UTC-05:00)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST UTC-08:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resume / CV (PDF, DOCX, or TXT) *
                </label>
                <input
                  type="file"
                  required={!resumeFile}
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold"
                />
                {resumeFile && (
                  <div className="mt-1.5 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Attached: {resumeFile.name}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyModalJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying || !resumeFile}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Sign In Modal */}
      {showCandidateLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Candidate Sign In</h3>
                  <p className="text-[11px] text-slate-500">Track your application, screening & interviews</p>
                </div>
              </div>
              <button
                onClick={() => setShowCandidateLoginModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCandidateLogin(modalLoginEmail || lookupEmail);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate Email Address
                </label>
                <input
                  type="email"
                  required
                  value={modalLoginEmail}
                  onChange={(e) => setModalLoginEmail(e.target.value)}
                  placeholder="e.g. ahmednadeemryk20@gmail.com"
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loadingPortal}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {loadingPortal ? 'Signing in...' : 'Sign In to Candidate Portal →'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500">
                Or Sign In as a Verified Applicant:
              </div>
              <div className="space-y-1.5">
                {SAMPLE_APPLICANTS.map((app) => (
                  <button
                    key={app.email}
                    type="button"
                    onClick={() => {
                      setModalLoginEmail(app.email);
                      handleCandidateLogin(app.email, app.name);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{app.name}</div>
                      <div className="text-[10px] text-slate-500">{app.email}</div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                      Sign In →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
