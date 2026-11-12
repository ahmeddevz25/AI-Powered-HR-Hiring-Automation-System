import React, { useState, useEffect } from 'react';
import { X, Briefcase, Sliders, Trash2, Plus, UserCheck, Save, CheckCircle2 } from 'lucide-react';
import { AVAILABLE_INTERVIEWERS } from './CreateRequisitionModal';

export default function EditRequisitionModal({ requisition, isOpen, onClose, onUpdate }) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [minExp, setMinExp] = useState(1.5);
  const [assignedInterviewerId, setAssignedInterviewerId] = useState('INT-01');
  const [status, setStatus] = useState('Open');
  const [jd, setJd] = useState('');
  const [reqSkills, setReqSkills] = useState('');
  const [prefSkills, setPrefSkills] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');

  const [rubric, setRubric] = useState({
    required_skills: 40,
    relevant_experience: 25,
    role_related_projects: 20,
    education_certifications: 10,
    other_job_related_evidence: 5,
    justification: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (requisition) {
      setTitle(requisition.title || '');
      setDepartment(requisition.department || '');
      setLocation(requisition.location_work_arrangement || 'Hybrid (Lahore / Remote)');
      setMinExp(requisition.min_experience_years ?? 1.5);
      setAssignedInterviewerId(requisition.assigned_interviewer_id || 'INT-01');
      setStatus(requisition.status || 'Open');
      setJd(requisition.job_description || '');
      setReqSkills((requisition.required_skills || []).join(', '));
      setPrefSkills((requisition.preferred_skills || []).join(', '));
      setQuestionsList(requisition.screening_questions || []);
      if (requisition.rubric) {
        setRubric({
          required_skills: requisition.rubric.required_skills ?? 40,
          relevant_experience: requisition.rubric.relevant_experience ?? 25,
          role_related_projects: requisition.rubric.role_related_projects ?? 20,
          education_certifications: requisition.rubric.education_certifications ?? 10,
          other_job_related_evidence: requisition.rubric.other_job_related_evidence ?? 5,
          justification: requisition.rubric.justification || '',
        });
      }
      setError('');
    }
  }, [requisition, isOpen]);

  if (!isOpen || !requisition) return null;

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestionsList([...questionsList, newQuestion.trim()]);
    setNewQuestion('');
  };

  const removeQuestion = (idx) => {
    setQuestionsList(questionsList.filter((_, i) => i !== idx));
  };

  const totalWeight =
    Number(rubric.required_skills) +
    Number(rubric.relevant_experience) +
    Number(rubric.role_related_projects) +
    Number(rubric.education_certifications) +
    Number(rubric.other_job_related_evidence);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (Math.abs(totalWeight - 100) > 0.5) {
      setError(`Scoring rubric weights must sum to 100% (currently ${totalWeight}%).`);
      return;
    }
    setSubmitting(true);
    try {
      const interviewer =
        AVAILABLE_INTERVIEWERS.find((i) => i.id === assignedInterviewerId) || AVAILABLE_INTERVIEWERS[0];

      await onUpdate(requisition.requisition_id, {
        title: title.trim(),
        department: department.trim(),
        location_work_arrangement: location.trim(),
        min_experience_years: Number(minExp) || 0,
        job_description: jd.trim(),
        required_skills: reqSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        preferred_skills: prefSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        screening_questions: questionsList.filter(Boolean),
        assigned_interviewer_id: interviewer.id,
        assigned_interviewer_name: interviewer.name,
        assigned_interviewer_email: interviewer.email,
        status,
        rubric: {
          required_skills: Number(rubric.required_skills),
          relevant_experience: Number(rubric.relevant_experience),
          role_related_projects: Number(rubric.role_related_projects),
          education_certifications: Number(rubric.education_certifications),
          other_job_related_evidence: Number(rubric.other_job_related_evidence),
          justification: rubric.justification,
        },
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-zinc-200 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-7 py-5 bg-[#0B121E] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Edit Job Requisition</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  #{requisition.requisition_id}
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Update job details, rubric weights, screening questions, or assigned department team lead.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-7 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Section 1: Basic Job Details */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-zinc-100 pb-1.5 flex items-center justify-between">
              <span>1. Job Details & Assignment</span>
              <span className="text-zinc-400 font-normal">Active status on Public Careers site</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Job Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Job Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                >
                  <option value="Open">Open (Live for applicants)</option>
                  <option value="Closed">Closed</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">Department *</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Location & Work Arrangement *
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                >
                  <option value="Hybrid (Lahore / Remote)">Hybrid (Lahore / Remote)</option>
                  <option value="Remote (Global / Anywhere)">Remote (Global / Anywhere)</option>
                  <option value="On-Site (Islamabad Office)">On-Site (Islamabad Office)</option>
                  <option value="Hybrid (Karachi / Remote)">Hybrid (Karachi / Remote)</option>
                  <option value="Hybrid (Dubai / Remote)">Hybrid (Dubai / Remote)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Minimum Experience Required (Years)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={minExp}
                  onChange={(e) => setMinExp(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-teal-700 font-bold">
                    <UserCheck className="w-3.5 h-3.5" />
                    Assigned Team Lead / Interviewer *
                  </span>
                </label>
                <select
                  value={assignedInterviewerId}
                  onChange={(e) => setAssignedInterviewerId(e.target.value)}
                  className="w-full rounded-xl bg-teal-50/50 border border-teal-200 px-3.5 py-2.5 text-sm font-semibold text-zinc-800 focus:bg-white focus:outline-none focus:border-teal-600"
                >
                  {AVAILABLE_INTERVIEWERS.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} · {lead.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Job Description (JD) *
              </label>
              <textarea
                rows={4}
                required
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Must-Have / Required Skills (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={reqSkills}
                  onChange={(e) => setReqSkills(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Preferred / Bonus Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={prefSkills}
                  onChange={(e) => setPrefSkills(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Agent 1 Scoring Rubric */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-zinc-100 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                2. Agent 1 Scoring Rubric Weights
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  Math.abs(totalWeight - 100) < 0.5
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                Sum: {totalWeight}% / 100%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Required Skills %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rubric.required_skills}
                  onChange={(e) => setRubric({ ...rubric, required_skills: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Experience %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rubric.relevant_experience}
                  onChange={(e) => setRubric({ ...rubric, relevant_experience: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Projects %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rubric.role_related_projects}
                  onChange={(e) => setRubric({ ...rubric, role_related_projects: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Education %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rubric.education_certifications}
                  onChange={(e) => setRubric({ ...rubric, education_certifications: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Other Evidence %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rubric.other_job_related_evidence}
                  onChange={(e) => setRubric({ ...rubric, other_job_related_evidence: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Rubric Weighting Justification
              </label>
              <input
                type="text"
                value={rubric.justification}
                onChange={(e) => setRubric({ ...rubric, justification: e.target.value })}
                className="w-full rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Section 3: Agent 2 Approved Screening Questions */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 border-b border-zinc-100 pb-1.5 flex items-center justify-between">
              <span>3. Agent 2 Approved Screening Questions ({questionsList.length})</span>
            </div>

            <div className="space-y-2">
              {questionsList.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200"
                >
                  <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const updated = [...questionsList];
                      updated[idx] = e.target.value;
                      setQuestionsList(updated);
                    }}
                    className="flex-1 bg-transparent text-xs text-zinc-900 font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a new approved screening question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addQuestion();
                  }
                }}
                className="flex-1 rounded-xl bg-zinc-50 border border-zinc-300 px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={addQuestion}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-[#0B121E] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving Changes...' : 'Save Job Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

