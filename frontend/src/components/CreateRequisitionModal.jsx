import React, { useState } from 'react';
import { X, Sliders, Briefcase, Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function CreateRequisitionModal({ isOpen, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('Hybrid (Lahore / Remote)');
  const [minExp, setMinExp] = useState(1.5);
  const [jd, setJd] = useState('');
  const [reqSkills, setReqSkills] = useState('');
  const [prefSkills, setPrefSkills] = useState('');
  const [questionsList, setQuestionsList] = useState([
    'Walk us through your hands-on experience relevant to this role.',
    'Tell us about a production or academic project you built recently.',
    'What is your notice period and preferred availability next week for an interview?',
  ]);
  const [newQuestion, setNewQuestion] = useState('');

  const [rubric, setRubric] = useState({
    required_skills: 40,
    relevant_experience: 25,
    role_related_projects: 20,
    education_certifications: 10,
    other_job_related_evidence: 5,
    justification: 'Weighted toward verified core technical skills (40%) and hands-on experience/projects (45%).',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const JOB_TEMPLATES = [
    {
      label: 'Generative AI & RAG Engineer',
      title: 'Generative AI & Multi-Agent Engineer',
      department: 'Applied AI & LLM Lab',
      location: 'Hybrid (Lahore / Remote)',
      minExp: 2.0,
      jd: 'We are looking for a Generative AI Engineer to build explainable multi-agent workflows, RAG pipelines, and FastAPI microservices. You will design structured LLM outputs, prompt-injection guardrails, and evaluation suites.',
      reqSkills: 'Python, Machine Learning, FastAPI, SQL',
      prefSkills: 'LangChain, RAG, Docker, PyTorch, Gemini API',
      questions: [
        'Walk us through your hands-on experience building RAG or multi-agent LLM workflows in Python.',
        'How do you evaluate LLM accuracy and prevent prompt injection in production?',
        'Are you comfortable with our Hybrid (Lahore / Remote) work arrangement?',
        'What is your notice period and preferred time window next week for a technical interview?',
      ],
    },
    {
      label: 'Backend Python / FastAPI Lead',
      title: 'Senior Backend Python & FastAPI Engineer',
      department: 'Core Platform & APIs',
      location: 'Remote (Global / Anywhere)',
      minExp: 3.0,
      jd: 'Design and scale high-reliability Python and FastAPI backend services backed by PostgreSQL. Own API architecture, idempotent background jobs, audit logging, and third-party calendar/email integrations.',
      reqSkills: 'Python, FastAPI, PostgreSQL, SQL',
      prefSkills: 'Docker, Redis, AWS, Pytest, Microservices',
      questions: [
        'Describe a high-traffic Python or FastAPI service you architected and deployed.',
        'How do you handle database schema migrations, indexing, and idempotency in PostgreSQL?',
        'What is your current notice period and availability for a 45-minute technical interview?',
      ],
    },
    {
      label: 'React + TypeScript Frontend Engineer',
      title: 'Senior Frontend SaaS Engineer (React + Tailwind)',
      department: 'SaaS Product Engineering',
      location: 'Hybrid (Islamabad / Remote)',
      minExp: 2.0,
      jd: 'Build clean, high-contrast SaaS admin dashboards, interactive candidate portals, and real-time analytics views using React, Tailwind CSS, and modern REST APIs.',
      reqSkills: 'React, JavaScript, Tailwind CSS, REST APIs',
      prefSkills: 'TypeScript, Vite, UI/UX Design, Node.js',
      questions: [
        'Tell us about a complex SaaS dashboard or multi-step workflow you built in React.',
        'How do you ensure fast page performance, accessibility, and clean component architecture?',
        'What is your notice period and availability next week for an interview?',
      ],
    },
    {
      label: 'Data Scientist & ML Analyst',
      title: 'Data Scientist & Predictive Modeling Specialist',
      department: 'Data & Decision Science',
      location: 'Hybrid (Karachi / Remote)',
      minExp: 1.5,
      jd: 'Develop predictive scoring models, feature engineering pipelines, and fairness validation metrics using Python, SQL, and Scikit-Learn.',
      reqSkills: 'Python, Machine Learning, SQL, Scikit-Learn',
      prefSkills: 'Pandas, PyTorch, Data Visualization, FastAPI',
      questions: [
        'Walk us through an end-to-end machine learning model you trained and evaluated.',
        'How do you check for dataset bias and explain model predictions to non-technical teams?',
        'What is your notice period and preferred interview slot next week?',
      ],
    },
  ];

  const applyTemplate = (tpl) => {
    setTitle(tpl.title);
    setDepartment(tpl.department);
    setLocation(tpl.location);
    setMinExp(tpl.minExp);
    setJd(tpl.jd);
    setReqSkills(tpl.reqSkills);
    setPrefSkills(tpl.prefSkills);
    setQuestionsList(tpl.questions);
  };

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
      await onCreate({
        title: title.trim(),
        department: department.trim() || 'Engineering',
        location_work_arrangement: location.trim() || 'Remote / Hybrid',
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
        rubric: {
          required_skills: Number(rubric.required_skills),
          relevant_experience: Number(rubric.relevant_experience),
          role_related_projects: Number(rubric.role_related_projects),
          education_certifications: Number(rubric.education_certifications),
          other_job_related_evidence: Number(rubric.other_job_related_evidence),
          justification: rubric.justification,
        },
        created_by: 'HR Recruiter',
      });
      // Reset fields after creation
      setTitle('');
      setDepartment('');
      setJd('');
      setReqSkills('');
      setPrefSkills('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-7 py-5 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create New Job Requisition</h2>
              <p className="text-xs text-slate-300">
                Publish a job to the Public Careers Site and configure Agent 1 & Agent 2 rules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyTemplate(JOB_TEMPLATES[0])}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-400/40 text-blue-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Fill Sample Job
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-7 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Quick Job Templates Bar */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Quick Fill Dummy Real Job Templates (1-Click)
            </div>
            <div className="flex flex-wrap gap-2">
              {JOB_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-slate-800 text-xs font-semibold transition shadow-2xs cursor-pointer"
                >
                  + {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Basic Job Details */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-1.5">
              1. Job Requisition Details
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Senior AI / Machine Learning Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Department *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Applied AI & Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Location & Work Arrangement *
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Hybrid (Lahore / Remote)">Hybrid (Lahore / Remote)</option>
                  <option value="Remote (Global / Anywhere)">Remote (Global / Anywhere)</option>
                  <option value="On-Site (Islamabad Office)">On-Site (Islamabad Office)</option>
                  <option value="Hybrid (Karachi / Remote)">Hybrid (Karachi / Remote)</option>
                  <option value="Hybrid (Dubai / Remote)">Hybrid (Dubai / Remote)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Minimum Experience Required (Years)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={minExp}
                  onChange={(e) => setMinExp(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Approved Job Description (JD) *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe responsibilities, expectations, and technical environment..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Must-Have / Required Skills (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Python, Machine Learning, FastAPI, SQL"
                  value={reqSkills}
                  onChange={(e) => setReqSkills(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Preferred / Bonus Skills (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Docker, LangChain, PyTorch, AWS"
                  value={prefSkills}
                  onChange={(e) => setPrefSkills(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Agent 1 Configurable Scoring Rubric */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  2. Agent 1 — Configurable Resume Evaluation Rubric
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set how Agent 1 weights each criterion when scoring uploaded resumes (Must sum to 100%).
                </p>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  Math.abs(totalWeight - 100) < 0.5
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                Total Weight: {totalWeight}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ['required_skills', 'Required Skills %'],
                ['relevant_experience', 'Experience %'],
                ['role_related_projects', 'Projects %'],
                ['education_certifications', 'Education %'],
                ['other_job_related_evidence', 'Other/Bonus %'],
              ].map(([key, label]) => (
                <div key={key} className="bg-white p-3 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rubric[key]}
                    onChange={(e) => setRubric({ ...rubric, [key]: e.target.value })}
                    className="w-full rounded-lg bg-slate-50 border border-slate-300 px-2.5 py-1.5 text-sm font-bold text-slate-900"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rubric Weight Justification (Recorded for Auditability)
              </label>
              <input
                type="text"
                value={rubric.justification}
                onChange={(e) => setRubric({ ...rubric, justification: e.target.value })}
                className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Section 3: Agent 2 Approved Screening Call Questions */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-1.5">
              3. Agent 2 — Approved Screening Call Questions
            </div>

            <div className="space-y-2">
              {questionsList.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                >
                  <span>
                    <strong className="text-blue-600">Q{idx + 1}:</strong> {q}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add another job-related screening question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addQuestion();
                  }
                }}
                className="flex-1 rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
              />
              <button
                type="button"
                onClick={addQuestion}
                className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Question
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Job will immediately appear on the Public Candidate Careers Website.
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? 'Publishing Job...' : 'Publish Job Requisition'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
