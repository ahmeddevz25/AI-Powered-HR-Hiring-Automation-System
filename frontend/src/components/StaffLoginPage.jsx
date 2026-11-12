import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowLeft,
  KeyRound,
  User,
  ShieldCheck,
  PhoneCall,
  Calendar,
  FileCheck2,
} from 'lucide-react';
import { api } from '../api/client';

export default function StaffLoginPage({ onLoginSuccess, onBackToPublic }) {
  const [loginType, setLoginType] = useState('staff'); // 'staff' | 'candidate'
  const [email, setEmail] = useState('recruiter@talentsense.ai');
  const [password, setPassword] = useState('password123');
  const [candEmail, setCandEmail] = useState('ahmednadeemryk20@gmail.com');
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getDemoAccounts().then(setDemoAccounts).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.user, res.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSignIn = (cEmail, cName = '') => {
    if (!cEmail) return;
    const cleanEmail = cEmail.trim().toLowerCase();
    const cleanName = cName || cleanEmail.split('@')[0];
    localStorage.setItem(
      'talentsense_candidate_user',
      JSON.stringify({ email: cleanEmail, name: cleanName })
    );
    onBackToPublic();
  };

  const accounts = demoAccounts.length
    ? demoAccounts
    : [
        {
          email: 'recruiter@talentsense.ai',
          password: 'password123',
          name: 'Ayesha Khan',
          role: 'HR Recruiter',
        },
        {
          email: 'manager@talentsense.ai',
          password: 'password123',
          name: 'Sarah Jenkins',
          role: 'Hiring Manager',
        },
        {
          email: 'admin@talentsense.ai',
          password: 'password123',
          name: 'Ahmed Raza',
          role: 'Administrator',
        },
      ];

  return (
    <div className="min-h-screen bg-[#F3F5F8] text-zinc-900 grid grid-cols-1 lg:grid-cols-12">
      {/* Left Enterprise Brand Showcase Panel */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#0B121E] via-[#0F1B2C] to-[#112A34] text-white p-10 flex-col justify-between border-r border-zinc-800">
        <div>
          <button
            onClick={onBackToPublic}
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-teal-400" />
            Back to Public Careers Portal
          </button>

          <div className="mt-12 space-y-4">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-teal-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white">TalentSense</span>
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Enterprise OS
                </span>
              </div>
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight pt-2">
              Human-in-the-Loop AI Recruitment Suite
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Manage job requisitions, explainable resume evaluations, live voice screenings, and timezone-aware interview scheduling from one unified SaaS command center.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {[
              {
                icon: FileCheck2,
                title: 'Agent 1 · Explainable Resume Scoring & Gate #1',
                desc: 'Configurable 100% rubric weights with verbatim evidence quotes and prompt-injection defense.',
              },
              {
                icon: PhoneCall,
                title: 'Agent 2 · Neural Voice AI Studio & Gate #2',
                desc: 'Consent-aware live voice screening with ElevenLabs neural audio and human escalation.',
              },
              {
                icon: Calendar,
                title: 'Agent 3 · Smart Calendar & Mailtrap SMTP Gate #3',
                desc: 'Cross-timezone slot proposals, idempotency protection, and automated virtual interview rooms.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{item.title}</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            100% Audited Human Approval Gates
          </span>
          <span>v2.5 Enterprise</span>
        </div>
      </div>

      {/* Right Sign-In Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10">
        <div className="lg:hidden">
          <button
            onClick={onBackToPublic}
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 px-3.5 py-2 rounded-xl bg-white border border-zinc-200 shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Careers Site
          </button>
        </div>

        <div className="max-w-md w-full mx-auto bg-white border border-zinc-200/90 rounded-3xl p-8 shadow-xl my-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-900/15 mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Sign in to TalentSense</h1>
            <p className="text-xs text-zinc-500 font-medium">
              {loginType === 'staff' ? 'HR Recruiter & Hiring Team Workspace' : 'Candidate Application & Screening Portal'}
            </p>
          </div>

          {/* Toggle between Staff Recruiter vs Candidate Portal */}
          <div className="flex p-1 bg-zinc-100 rounded-2xl border border-zinc-200/60">
            <button
              type="button"
              onClick={() => setLoginType('staff')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginType === 'staff'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-teal-600" />
              Recruiter / Staff
            </button>
            <button
              type="button"
              onClick={() => setLoginType('candidate')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginType === 'candidate'
                  ? 'bg-white text-teal-700 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <User className="w-3.5 h-3.5 text-teal-600" />
              Candidate Sign In
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {loginType === 'staff' ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-bold shadow-md shadow-teal-900/15 transition cursor-pointer"
                >
                  {loading ? 'Signing In...' : 'Launch Recruiter Workspace →'}
                </button>
              </form>

              {/* Quick Demo Switcher */}
              <div className="pt-4 border-t border-zinc-100 space-y-2">
                <div className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                  1-Click Demo Staff Credentials:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {accounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        setEmail(acc.email);
                        setPassword(acc.password);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        email === acc.email
                          ? 'bg-teal-50/70 border-teal-500 ring-1 ring-teal-500/20'
                          : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{acc.name}</div>
                        <div className="text-[11px] text-zinc-500">{acc.email}</div>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-zinc-200 text-teal-800 font-bold">
                        {acc.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Your Candidate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    placeholder="e.g. ahmednadeemryk20@gmail.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCandidateSignIn(candEmail)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-bold shadow-md shadow-teal-900/15 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Open Candidate Portal →
              </button>

              {/* Quick Candidate Logins */}
              <div className="pt-4 border-t border-zinc-100 space-y-2">
                <div className="text-xs font-bold text-zinc-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  1-Click Demo Candidate Profiles:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { name: 'Muhammad Ahmed', email: 'ahmednadeemryk20@gmail.com', status: 'Shortlisted for Screening' },
                    { name: 'Ayesha Siddiqui', email: 'ayesha.siddiqui@example.com', status: 'Interview Scheduled' },
                    { name: 'Bilal Ahmed', email: 'bilal.ahmed@example.com', status: 'Under Review' },
                  ].map((c) => (
                    <button
                      key={c.email}
                      type="button"
                      onClick={() => handleCandidateSignIn(c.email, c.name)}
                      className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-teal-50 hover:border-teal-300 text-left transition flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{c.name}</div>
                        <div className="text-[11px] text-zinc-500">{c.email}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-teal-700 font-bold">
                        {c.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-zinc-400 font-medium">
          TalentSense Cloud · Human-in-the-Loop Multi-Agent SaaS
        </div>
      </div>
    </div>
  );
}
