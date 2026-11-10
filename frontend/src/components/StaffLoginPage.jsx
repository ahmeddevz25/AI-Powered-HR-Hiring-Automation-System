import React, { useState, useEffect } from 'react';
import { Sparkles, Lock, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { api } from '../api/client';

export default function StaffLoginPage({ onLoginSuccess, onBackToPublic }) {
  const [email, setEmail] = useState('recruiter@talentsense.ai');
  const [password, setPassword] = useState('password123');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4">
      <div className="max-w-5xl w-full mx-auto pt-3">
        <button
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Careers Site
        </button>
      </div>

      <div className="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-lg my-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to TalentSense</h1>
          <p className="text-xs text-slate-500">HR Recruiter & Hiring Team Portal</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Switcher */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            Quick Demo Login Accounts:
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
                    ? 'bg-blue-50/80 border-blue-500'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{acc.name}</div>
                  <div className="text-[11px] text-slate-500">{acc.email}</div>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">
                  {acc.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 pb-2">TalentSense HR Platform</div>
    </div>
  );
}
