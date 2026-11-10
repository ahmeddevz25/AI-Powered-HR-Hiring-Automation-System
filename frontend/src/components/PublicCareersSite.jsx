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
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from './StatusBadge';

export default function PublicCareersSite({ onNavigateLogin, loggedInUser, onNavigateAdmin }) {
  const [publicTab, setPublicTab] = useState('jobs'); // 'jobs' | 'tracker'
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyModalJob, setApplyModalJob] = useState(null);

  // Apply Form State
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('+92-300-1234567');
  const [candTz, setCandTz] = useState('Asia/Karachi');
  const [resumeFile, setResumeFile] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState(null);

  // Candidate Tracker State
  const [lookupEmail, setLookupEmail] = useState('ayesha.siddiqui@example.com');
  const [myApplications, setMyApplications] = useState([]);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalMessage, setPortalMessage] = useState(null);
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [screeningAvail, setScreeningAvail] = useState('Tuesday or Wednesday, 11:00 AM - 4:00 PM PKT');

  const loadJobs = async () => {
    try {
      const list = await api.listPublicJobs();
      setJobs(list);
      if (list.length > 0 && !selectedJob) {
        setSelectedJob(list[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

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
          text: `No applications found for "${emailToSearch}". Apply to an open job or click a sample applicant below.`,
        });
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
        text: `Application submitted! Redirecting to your application tracker...`,
      });
      setLookupEmail(res.email);
      setTimeout(() => {
        setApplyModalJob(null);
        setApplyFeedback(null);
        setPublicTab('tracker');
        handleLookupApplications(res.email);
      }, 1200);
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

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.required_skills || []).some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                publicTab === 'jobs'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open Positions ({jobs.length})
            </button>
            <button
              onClick={() => {
                setPublicTab('tracker');
                handleLookupApplications(lookupEmail);
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                publicTab === 'tracker'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Track My Application
            </button>
          </nav>

          <div>
            {loggedInUser ? (
              <button
                onClick={onNavigateAdmin}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition"
              >
                Recruiter Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onNavigateLogin}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold flex items-center gap-2 transition shadow-xs"
              >
                <Lock className="w-4 h-4 text-slate-500" />
                Recruiter Login
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
                    Available Roles ({filteredJobs.length})
                  </h2>
                </div>

                {filteredJobs.map((job) => {
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

      {/* TAB 2: CANDIDATE APPLICATION TRACKER */}
      {publicTab === 'tracker' && (
        <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 space-y-6 flex-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Track Your Job Application</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Enter your email address to check your application status, complete your phone screening, or view your interview details.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="flex-1 rounded-xl bg-slate-50 border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
              />
              <button
                onClick={() => handleLookupApplications(lookupEmail)}
                disabled={loadingPortal}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs cursor-pointer"
              >
                {loadingPortal ? 'Checking...' : 'Check Status'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400">Demo Applicants:</span>
              {[
                ['Ayesha Siddiqui', 'ayesha.siddiqui@example.com'],
                ['Bilal Ahmed', 'bilal.ahmed@example.com'],
                ['Hamza Malik', 'hamza.malik@example.com'],
              ].map(([label, email]) => (
                <button
                  key={email}
                  onClick={() => {
                    setLookupEmail(email);
                    handleLookupApplications(email);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

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

          <div className="space-y-4">
            {myApplications.map((app) => (
              <div
                key={app.candidate_id}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-blue-600">{app.department}</span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{app.job_title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Applicant: <strong className="text-slate-800">{app.name}</strong> ({app.email}) · Timezone: {app.timezone}
                    </p>
                  </div>
                  <StatusBadge status={app.current_status} />
                </div>

                {/* Screening Call Action Card when Shortlisted */}
                {app.can_take_screening && (
                  <div className="p-5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
                        Next Step Available
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-2 flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-blue-600" />
                        Complete Your Preliminary Screening
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        You've been shortlisted! Our AI Recruiting Assistant conducts this quick screening on behalf of our HR team. By submitting your answers below, you consent to having your responses recorded for recruiter review—or you can request a human recruiter instead.
                      </p>
                    </div>

                    <div className="space-y-3">
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
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        disabled={loadingPortal}
                        onClick={() => handleCandidateScreeningAction(app.candidate_id, 'custom_interactive')}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        Consent & Submit Screening Answers
                      </button>
                      <button
                        disabled={loadingPortal}
                        onClick={() => handleCandidateScreeningAction(app.candidate_id, 'decline_recording')}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
                      >
                        Decline AI Recording
                      </button>
                      <button
                        disabled={loadingPortal}
                        onClick={() => handleCandidateScreeningAction(app.candidate_id, 'request_human')}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
                      >
                        Request Human Recruiter
                      </button>
                    </div>
                  </div>
                )}

                {/* Scheduled Interview Card */}
                {app.interview_scheduled && app.interview_details && (
                  <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Your Technical Interview is Scheduled!
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-white border border-emerald-200">
                        <span className="text-slate-500">Scheduled Time ({app.timezone}):</span>
                        <div className="font-bold text-slate-900 mt-1">
                          {app.interview_details.confirmed_slot?.candidate_local_time}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white border border-emerald-200">
                        <span className="text-slate-500">Interviewer & Meeting Link:</span>
                        <div className="font-bold text-slate-900 mt-1">
                          {app.interview_details.interviewer_name}
                        </div>
                        <div className="text-blue-600 truncate mt-0.5">
                          {app.interview_details.meeting_details?.meeting_link}
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
    </div>
  );
}
