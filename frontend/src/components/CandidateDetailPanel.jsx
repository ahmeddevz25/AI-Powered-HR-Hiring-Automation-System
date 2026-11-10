import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
  Calendar,
  Mail,
  History,
  FileText,
  Sparkles,
  Send,
  RefreshCw,
  Trash2,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function CandidateDetailPanel({
  candidate,
  requisition,
  interviewers,
  userRole,
  actorName,
  defaultTab = null,
  onShortlistDecision,
  onRunScreening,
  onReviewScreening,
  onProposeSlots,
  onDraftInvitation,
  onSendInvitation,
  onManualResolve,
  onDeleteCandidate,
}) {
  const [activeTab, setActiveTab] = useState('resume');
  const [decisionNote, setDecisionNote] = useState(
    'Verified strong alignment with core JD criteria; approved for preliminary screening call.'
  );
  const [screeningNote, setScreeningNote] = useState(
    'Reviewed screening transcript and factual summary. Candidate responses are clear; approved for technical interview.'
  );

  // Screening Controls
  const [callScenario, setCallScenario] = useState('normal');
  const [customMode, setCustomMode] = useState(false);
  const [customAnswers, setCustomAnswers] = useState({});
  const [statedAvail, setStatedAvail] = useState('Tuesday or Wednesday, 11:00 AM - 4:00 PM PKT');

  // Interview Scheduling Controls
  const [selectedInterviewer, setSelectedInterviewer] = useState('INT-01');
  const [candidateTz, setCandidateTz] = useState(candidate?.timezone || 'Asia/Karachi');
  const [durationMins, setDurationMins] = useState(45);
  const [simCalFailure, setSimCalFailure] = useState(false);
  const [simEmailFailure, setSimEmailFailure] = useState(false);
  const [emailDraftText, setEmailDraftText] = useState('');

  // Exception Resolution
  const [manualReason, setManualReason] = useState('Verified candidate resume details manually.');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!candidate) return;
    setCandidateTz(candidate.timezone || 'Asia/Karachi');
    setEmailDraftText(candidate.interview?.email_draft || '');
    setFeedback(null);

    if (defaultTab) {
      setActiveTab(defaultTab);
      return;
    }

    const st = candidate.current_status;
    if (['Approved for Screening', 'Screening Scheduled / Pending', 'Screening Completed — HR Review'].includes(st)) {
      setActiveTab('screening');
    } else if (['Approved for Interview', 'Interview Proposed', 'Interview Scheduled'].includes(st)) {
      setActiveTab('interview');
    } else {
      setActiveTab('resume');
    }
  }, [candidate?.candidate_id, candidate?.current_status, candidate?.interview?.email_draft, defaultTab]);

  if (!candidate) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-sm">
        Select a candidate from the queue to inspect Agent 1, Agent 2, and Agent 3 workflow stages.
      </div>
    );
  }

  const evalData = candidate.evaluation;
  const scrData = candidate.screening;
  const intData = candidate.interview;

  const wrapAction = async (fn, successMsg) => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fn();
      if (res?.message) {
        setFeedback({ type: 'success', text: res.message });
      } else if (successMsg) {
        setFeedback({ type: 'success', text: successMsg });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Candidate Header */}
      <div className="p-6 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">{candidate.name}</h2>
            <StatusBadge status={candidate.current_status} />
            {evalData && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                Score: {evalData.total_score}/100
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
            {candidate.job_title && (
              <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                <Briefcase className="w-3.5 h-3.5" />
                {candidate.job_title}
              </span>
            )}
            <span>· {candidate.email}</span>
            <span>· {candidate.phone}</span>
            <span>
              · Timezone: <strong className="text-slate-700">{candidate.timezone}</strong>
            </span>
            <span>
              · File: <code className="text-slate-700 font-semibold">{candidate.resume_filename}</code>
            </span>
          </div>
          {candidate.status_reason && (
            <p className="text-xs text-slate-600 mt-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <strong className="text-slate-800">Workflow Note:</strong> {candidate.status_reason}
            </p>
          )}
        </div>

        <button
          onClick={() => {
            if (window.confirm(`Delete personal data for ${candidate.name} (Privacy / Retention Compliance)?`)) {
              wrapAction(() => onDeleteCandidate(candidate.candidate_id), 'Candidate deleted.');
            }
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Data
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mx-6 mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 4 Workflow Stage Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 gap-6 overflow-x-auto">
        {[
          { id: 'resume', label: '1. Agent 1: Resume Score & Gate #1', icon: Sparkles },
          { id: 'screening', label: '2. Agent 2: Screening Call & Gate #2', icon: PhoneCall },
          { id: 'interview', label: '3. Agent 3: Interview Slots & Gate #3', icon: Calendar },
          {
            id: 'history',
            label: `4. Audit Log & Resume (${candidate.audit_events?.length || 0})`,
            icon: History,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                active
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-6">
        {/* ================= TAB 1: AGENT 1 & HUMAN GATE #1 ================= */}
        {activeTab === 'resume' && (
          <div className="space-y-6">
            {!evalData ? (
              <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">
                      Unreadable or Corrupted Resume — Flagged for Manual HR Review
                    </h3>
                    <p className="text-xs text-amber-800 mt-1">
                      Agent 1 did not invent or fabricate extracted details. {candidate.status_reason}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Manual Exception Resolution (HR Recruiter Control)
                  </label>
                  <input
                    type="text"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() =>
                        wrapAction(
                          () => onManualResolve(candidate.candidate_id, 'Approved for Screening', manualReason),
                          'Candidate manually approved for Phone Screening.'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Override & Approve for Screening
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        wrapAction(
                          () => onManualResolve(candidate.candidate_id, 'Closed', manualReason),
                          'Candidate closed with recorded reason.'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 text-xs font-semibold cursor-pointer"
                    >
                      Close Application
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Security / Prompt-Injection Warning */}
                {evalData.parsing_warnings?.length > 0 && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-rose-900">
                        Security Guardrail Alert — Prompt-Injection Attempt Blocked
                      </h4>
                      {evalData.parsing_warnings.map((w, i) => (
                        <p key={i} className="text-xs text-rose-700">
                          • {w}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent 1 Summary Card */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                        Agent 1 — Resume Scoring Recommendation
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                        Model: {evalData.model_version}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {evalData.recommendation_for_human_review}
                    </p>
                  </div>
                  <div className="text-center shrink-0 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-2xs">
                    <div className="text-2xl font-extrabold text-blue-600">{evalData.total_score}/100</div>
                    <div className="text-[11px] font-medium text-slate-500">Prioritization Score</div>
                  </div>
                </div>

                {/* Criterion-Level Score Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Criterion-Level Breakdown & Cited Resume Evidence
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(evalData.criterion_scores || {}).map(([key, item]) => (
                      <div key={key} className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-bold text-blue-600">
                            {item.score} / {item.max_weight} pts
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, (item.score / Math.max(item.max_weight, 1)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600">{item.reasoning}</p>
                        <p className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 italic">
                          Evidence: "{item.evidence_quote}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supporting Evidence & Missing/Unclear Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                    <h4 className="text-xs font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Supporting Resume Evidence
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {(evalData.evidence || []).map((ev, i) => (
                        <li key={i}>• {ev}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                    <h4 className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Missing or Unclear Items (Verify in Screening)
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {(evalData.missing_or_unclear_items || []).map((gap, i) => (
                        <li key={i}>• {gap}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* HUMAN APPROVAL GATE #1 */}
                <div className="p-5 rounded-2xl bg-blue-50/50 border-2 border-blue-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        Human Approval Checkpoint #1 — Shortlist Decision
                      </h4>
                      <p className="text-xs text-slate-600">
                        No candidate is contacted automatically based only on a score. Confirm shortlist progression below.
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                      Gate #1 Status: {evalData.hr_decision}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Enter approval or override justification..."
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                  />

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      disabled={busy}
                      onClick={() =>
                        wrapAction(
                          () =>
                            onShortlistDecision(candidate.candidate_id, {
                              decision: 'Approved',
                              actor: actorName,
                              actor_role: userRole,
                              reason: decisionNote,
                            }),
                          'Shortlist Approved! Candidate unlocked for Agent 2 Screening Call.'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve for Screening Call
                    </button>

                    <button
                      disabled={busy}
                      onClick={() =>
                        wrapAction(
                          () =>
                            onShortlistDecision(candidate.candidate_id, {
                              decision: 'Overridden',
                              actor: actorName,
                              actor_role: userRole,
                              reason: decisionNote || 'Recruiter override to shortlist candidate.',
                            }),
                          'Recruiter Override Recorded: Candidate Approved for Screening Call!'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Override Score & Approve
                    </button>

                    <button
                      disabled={busy}
                      onClick={() =>
                        wrapAction(
                          () =>
                            onShortlistDecision(candidate.candidate_id, {
                              decision: 'Declined',
                              actor: actorName,
                              actor_role: userRole,
                              reason: decisionNote || 'Closed after human review of JD alignment.',
                            }),
                          'Candidate application closed.'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline & Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB 2: AGENT 2 & HUMAN GATE #2 ================= */}
        {activeTab === 'screening' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Agent 2 — Consent-Aware Screening Call Simulator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Introduces itself as an AI assistant, obtains recording consent, asks approved questions, and handles candidate exceptions.
                  </p>
                </div>
                <button
                  onClick={() => setCustomMode(!customMode)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  {customMode ? 'Switch to Preset Call Scenarios' : 'Enter Live Interactive Q&A'}
                </button>
              </div>

              {customMode ? (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  {(requisition?.screening_questions || []).map((q, idx) => (
                    <div key={idx}>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Q{idx + 1}: {q}
                      </label>
                      <input
                        type="text"
                        placeholder="Type candidate's spoken answer..."
                        value={customAnswers[idx] || ''}
                        onChange={(e) => setCustomAnswers({ ...customAnswers, [idx]: e.target.value })}
                        className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Candidate Stated Availability Window
                    </label>
                    <input
                      type="text"
                      value={statedAvail}
                      onChange={(e) => setStatedAvail(e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <button
                    disabled={busy}
                    onClick={() =>
                      wrapAction(
                        () =>
                          onRunScreening(candidate.candidate_id, {
                            mode: 'custom_interactive',
                            custom_answers: customAnswers,
                            candidate_stated_availability: statedAvail,
                            actor: actorName,
                          }),
                        'Interactive Screening Call recorded & summarized by Agent 2!'
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Submit Interactive Call & Generate Summary
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <select
                    value={callScenario}
                    onChange={(e) => setCallScenario(e.target.value)}
                    className="rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-800"
                  >
                    <option value="normal">Normal Call (Consent Granted & All Questions Answered)</option>
                    <option value="unclear_audio">Edge Case: Poor Audio / Unclear Answer on Q2</option>
                    <option value="decline_recording">Edge Case: Candidate Declines Recording Consent</option>
                    <option value="request_human">Edge Case: Candidate Requests Human Recruiter</option>
                    <option value="no_answer">Edge Case: Candidate No Answer (Retry Limit Check)</option>
                  </select>

                  <button
                    disabled={busy}
                    onClick={() =>
                      wrapAction(
                        () => onRunScreening(candidate.candidate_id, { mode: callScenario, actor: actorName }),
                        `Agent 2 Screening Call (${callScenario}) executed!`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Run Screening Call
                  </button>
                </div>
              )}
            </div>

            {scrData && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <div className="text-xs text-slate-500">Call Outcome</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{scrData.call_status}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <div className="text-xs text-slate-500">Consent Status</div>
                    <div className="text-sm font-bold text-blue-600 mt-0.5">{scrData.consent_status}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <div className="text-xs text-slate-500">Stated Availability</div>
                    <div className="text-sm font-bold text-emerald-700 mt-0.5">
                      {scrData.candidate_stated_availability}
                    </div>
                  </div>
                </div>

                {/* Factual Summary vs Separated Agent Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
                    <h4 className="text-xs font-bold text-blue-900 mb-1.5">
                      Candidate Direct Statements (Factual Summary)
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{scrData.concise_summary}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                    <h4 className="text-xs font-bold text-amber-900 mb-1.5">
                      Separated Agent Notes & Uncertainties
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{scrData.agent_interpretation_notes}</p>
                    {scrData.unresolved_questions?.length > 0 && (
                      <ul className="mt-2 pt-2 border-t border-amber-200 text-xs text-amber-900 space-y-1">
                        {scrData.unresolved_questions.map((uq, i) => (
                          <li key={i}>• Unresolved: {uq}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Q&A Transcript */}
                {scrData.question_answer_pairs?.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Structured Call Transcript
                    </h4>
                    <div className="space-y-2">
                      {scrData.question_answer_pairs.map((qa, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">Agent 2: {qa.question}</span>
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                              {qa.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 pl-3 border-l-2 border-blue-500">
                            Candidate: "{qa.candidate_answer}"
                          </p>
                          <p className="text-[11px] text-slate-400">Note: {qa.agent_note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* HUMAN APPROVAL GATE #2 */}
                <div className="p-5 rounded-2xl bg-indigo-50/50 border-2 border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        Human Approval Checkpoint #2 — Screening Review
                      </h4>
                      <p className="text-xs text-slate-600">
                        Review the transcript and summary above and confirm whether the candidate proceeds to Interview Scheduling.
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                      Gate #2 Status: {scrData.hr_decision}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={screeningNote}
                    onChange={(e) => setScreeningNote(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                  />

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      disabled={busy}
                      onClick={() =>
                        wrapAction(
                          () =>
                            onReviewScreening(candidate.candidate_id, {
                              decision: 'Approved for Interview',
                              actor: actorName,
                              actor_role: userRole,
                              notes: screeningNote,
                            }),
                          'Gate #2 Approved: Candidate unlocked for Agent 3 Interview Scheduling!'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve for Interview
                    </button>

                    <button
                      disabled={busy}
                      onClick={() =>
                        wrapAction(
                          () =>
                            onReviewScreening(candidate.candidate_id, {
                              decision: 'Closed',
                              actor: actorName,
                              actor_role: userRole,
                              notes: screeningNote || 'Closed after screening review.',
                            }),
                          'Candidate closed after screening review.'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Close Application
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: AGENT 3 & HUMAN GATE #3 ================= */}
        {activeTab === 'interview' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Agent 3 — Calendar Availability & Time-Zone Slot Matcher
                </h3>
                <p className="text-xs text-slate-500">
                  Checks connected/mock interviewer calendars and proposes slots converted to both the Candidate's and Interviewer's time zones.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Calendar</label>
                  <select
                    value={selectedInterviewer}
                    onChange={(e) => setSelectedInterviewer(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  >
                    {(interviewers || []).map((intv) => (
                      <option key={intv.interviewer_id} value={intv.interviewer_id}>
                        {intv.name} — {intv.timezone} ({intv.available_slot_count} slots)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Time Zone</label>
                  <select
                    value={candidateTz}
                    onChange={(e) => setCandidateTz(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="Asia/Karachi">Asia/Karachi (PKT UTC+05:00)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST UTC+04:00)</option>
                    <option value="Europe/London">Europe/London (GMT UTC+00:00)</option>
                    <option value="America/New_York">America/New_York (EST UTC-05:00)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST UTC-08:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simCalFailure}
                    onChange={(e) => setSimCalFailure(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Simulate Calendar API Timeout Failure (Test Safe Recovery)
                </label>

                <button
                  disabled={busy}
                  onClick={() =>
                    wrapAction(
                      () =>
                        onProposeSlots(candidate.candidate_id, {
                          interviewer_id: selectedInterviewer,
                          duration_minutes: durationMins,
                          candidate_timezone: candidateTz,
                          simulate_api_failure: simCalFailure,
                          actor: actorName,
                        }),
                      'Agent 3 checked interviewer calendar and proposed timezone-aligned slots!'
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Check Availability & Propose Slots
                </button>
              </div>
            </div>

            {intData && (
              <div className="space-y-5">
                {intData.proposed_slots?.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                    No Shared Availability: {intData.interviewer_name} has 0 free slots matching the window. Agent 3 alerted HR for manual scheduling coordination.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Verified Available Slots — Select a Slot to Draft Invitation Email
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {intData.proposed_slots.map((slot) => {
                        const isSelected = intData.confirmed_slot?.slot_id === slot.slot_id;
                        return (
                          <div
                            key={slot.slot_id}
                            className={`p-4 rounded-xl border transition ${
                              isSelected
                                ? 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-600/10'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-blue-600">{slot.slot_id}</span>
                              <span className="text-[11px] text-slate-400">{slot.duration_minutes} mins</span>
                            </div>
                            <div className="text-xs font-bold text-slate-900">
                              Candidate ({slot.candidate_timezone}): {slot.candidate_local_time}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              Interviewer ({slot.interviewer_timezone}): {slot.interviewer_local_time}
                            </div>
                            <button
                              disabled={busy}
                              onClick={() =>
                                wrapAction(
                                  () =>
                                    onDraftInvitation(candidate.candidate_id, {
                                      slot_id: slot.slot_id,
                                      actor: actorName,
                                    }),
                                  `Slot ${slot.slot_id} selected and invitation email drafted!`
                                )
                              }
                              className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              {isSelected ? '✓ Slot Selected & Draft Prepared' : 'Select Slot & Draft Email'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {intData.confirmed_slot && (
                  <div className="p-5 rounded-2xl bg-emerald-50/40 border-2 border-emerald-200 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-emerald-600" />
                          Human Approval Checkpoint #3 — Confirm & Send Interview Invitation
                        </h4>
                        <p className="text-xs text-slate-600">
                          Confirm candidate, interviewer, time zone, meeting link, and email content before sending.
                        </p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-emerald-700">
                        Send Status: {intData.send_status}
                      </span>
                    </div>

                    <textarea
                      rows={10}
                      value={emailDraftText}
                      onChange={(e) => setEmailDraftText(e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 p-3.5 text-xs font-mono text-slate-800 leading-relaxed"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simEmailFailure}
                          onChange={(e) => setSimEmailFailure(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Simulate Email Provider 502 Failure (Retains draft for safe retry)
                      </label>

                      <button
                        disabled={busy}
                        onClick={() =>
                          wrapAction(
                            () =>
                              onSendInvitation(candidate.candidate_id, {
                                approved: true,
                                actor: actorName,
                                actor_role: userRole,
                                custom_email_body: emailDraftText,
                                simulate_email_failure: simEmailFailure,
                              }),
                            'Gate #3 Approved: Interview Invitation Sent!'
                          )
                        }
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {intData.send_status === 'Sent'
                          ? 'Test Duplicate Send (Idempotency Check)'
                          : 'Approve & Send Interview Invitation'}
                      </button>
                    </div>

                    {intData.provider_message_id && (
                      <div className="text-xs text-emerald-800 bg-white p-3 rounded-xl border border-emerald-200">
                        ✓ Sent via Email Adapter · Message ID: <code>{intData.provider_message_id}</code> · Idempotency Key:{' '}
                        <code>{intData.idempotency_key}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: AUDIT HISTORY & EXTRACTED RESUME ================= */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                Candidate Audit & Event History
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(candidate.audit_events || []).map((ev) => (
                  <div
                    key={ev.event_id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{ev.action}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Actor: <strong className="text-slate-700">{ev.actor}</strong> ({ev.actor_role}) · Entity:{' '}
                        {ev.entity_type}
                      </div>
                      {ev.details && Object.keys(ev.details).length > 0 && (
                        <pre className="mt-1.5 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto">
                          {JSON.stringify(ev.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Extracted Resume Text ({candidate.resume_filename})
              </h3>
              <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                {candidate.extracted_text || '[Unreadable file — No text extracted]'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
