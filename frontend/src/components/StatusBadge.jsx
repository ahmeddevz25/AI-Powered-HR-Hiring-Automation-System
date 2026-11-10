import React from 'react';

const STATUS_CONFIG = {
  'Resume Received': {
    label: 'New Application',
    style: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  'Needs Manual Review': {
    label: 'Needs Review',
    style: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  'Scored — HR Review': {
    label: 'Resume Scored',
    style: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  'Approved for Screening': {
    label: 'Shortlisted',
    style: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  'Screening Scheduled / Pending': {
    label: 'Screening Pending',
    style: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  'Screening Completed — HR Review': {
    label: 'Screening Done',
    style: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  'Approved for Interview': {
    label: 'Ready for Interview',
    style: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
  },
  'Interview Proposed': {
    label: 'Slots Proposed',
    style: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
  },
  'Interview Scheduled': {
    label: 'Interview Scheduled',
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  'Closed': {
    label: 'Rejected / Closed',
    style: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    style: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
