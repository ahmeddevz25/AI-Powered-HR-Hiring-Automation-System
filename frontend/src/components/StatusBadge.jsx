import React from 'react';

const STATUS_CONFIG = {
  'Resume Received': {
    label: 'New Application',
    style: 'bg-zinc-100 text-zinc-700 border-zinc-200/80',
    dot: 'bg-zinc-400',
  },
  'Needs Manual Review': {
    label: 'Needs Review',
    style: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500 animate-pulse',
  },
  'Scored — HR Review': {
    label: 'AI Scored · Review',
    style: 'bg-teal-50 text-teal-800 border-teal-200/80',
    dot: 'bg-teal-500',
  },
  'Approved for Screening': {
    label: 'Shortlisted',
    style: 'bg-cyan-50 text-cyan-800 border-cyan-200/80',
    dot: 'bg-cyan-500',
  },
  'Screening Scheduled / Pending': {
    label: 'Screening Invited',
    style: 'bg-sky-50 text-sky-800 border-sky-200/80',
    dot: 'bg-sky-500',
  },
  'Screening Completed — HR Review': {
    label: 'Screening Done',
    style: 'bg-violet-50 text-violet-800 border-violet-200/80',
    dot: 'bg-violet-500',
  },
  'Approved for Interview': {
    label: 'Interview Approved',
    style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  'Interview Proposed': {
    label: 'Slots Proposed',
    style: 'bg-teal-50 text-teal-800 border-teal-200/80',
    dot: 'bg-teal-500',
  },
  'Interview Scheduled': {
    label: 'Interview Confirmed',
    style: 'bg-emerald-600 text-white border-emerald-600 shadow-2xs',
    dot: 'bg-white',
  },
  'Closed': {
    label: 'Closed / Declined',
    style: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
  },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    style: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dot: 'bg-zinc-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-tight border ${cfg.style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
