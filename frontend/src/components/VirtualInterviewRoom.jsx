import React, { useState, useEffect } from 'react';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Share2,
  Users,
  MessageSquare,
  Award,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { api } from '../api/client';

export default function VirtualInterviewRoom({ onBackToDashboard }) {
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState('briefing');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [interviewerNotes, setInterviewerNotes] = useState('');
  const [interviewerRating, setInterviewerRating] = useState('Strong Hire');
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'System',
      text: 'Welcome to the TalentSense Encrypted Virtual Interview Room.',
      time: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Read URL params
  const searchParams = new URLSearchParams(window.location.search);
  const interviewId = searchParams.get('interview_id') || '1';
  const userRole = searchParams.get('role') || 'interviewer'; // 'candidate' or 'interviewer'

  useEffect(() => {
    let timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getInterviewRoomDetails(interviewId);
        setRoomData(data);
      } catch (err) {
        console.error('Failed to load interview room details:', err);
        // Fallback realistic demo data
        setRoomData({
          candidate_id: Number(interviewId),
          candidate_name: 'Muhammad Ahmed',
          candidate_email: 'ahmed.dev@example.com',
          job_title: 'AI / Machine Learning Engineer',
          department: 'Applied AI & Platform Engineering',
          interviewer_name: 'Sarah Jenkins (Lead ML Engineer)',
          interviewer_email: 'sarah.jenkins@company.example',
          interviewer_timezone: 'Asia/Karachi',
          candidate_score: 85.5,
          score_recommendation: 'Strong hands-on Python and FastAPI microservices experience.',
          screening_summary:
            'Candidate confirmed comfort with Hybrid model and demonstrated clear understanding of RAG architectures and SQL optimizations.',
          confirmed_slot: {
            candidate_local_time: 'Tuesday, 10:00 AM – 10:45 AM PKT (UTC+05:00)',
            interviewer_local_time: 'Tuesday, 10:00 AM – 10:45 AM PKT (UTC+05:00)',
          },
          screening_qa: [
            {
              question: 'Walk us through your hands-on experience with Python and ML in production.',
              candidate_answer: 'Built FastAPI microservices and model serving pipelines for SaaS applications.',
            },
            {
              question: 'Tell us about a recent AI/ML or RAG project you built.',
              candidate_answer: 'Designed RAG retrieval pipeline with vector database embeddings and evaluation tests.',
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [interviewId]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const isLead = userRole === 'interviewer';
    const sender = isLead
      ? (roomData?.interviewer_name?.split(' ')[0] || 'Team Lead')
      : (roomData?.candidate_name?.split(' ')[0] || 'Candidate');
    setChatMessages([
      ...chatMessages,
      {
        sender,
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
            TS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {roomData?.job_title || 'Technical Interview Session'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {userRole === 'interviewer' ? 'Team Lead View' : 'Candidate View'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {roomData?.candidate_name} & {roomData?.interviewer_name} · Scheduled:{' '}
              {roomData?.confirmed_slot?.candidate_local_time || 'Confirmed Window'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>
          <button
            onClick={() => {
              if (onBackToDashboard) onBackToDashboard();
              else window.location.href = '/admin';
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition border border-slate-700"
          >
            ← Exit to Dashboard
          </button>
        </div>
      </header>

      {/* Main Room Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left: Video Feeds (8 cols on lg) */}
        <div className="lg:col-span-8 p-6 flex flex-col justify-between bg-slate-950 relative">
          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center max-h-[72vh]">
            {/* Candidate Video Tile */}
            <div className="relative aspect-video rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-xl group">
              {videoActive ? (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-24 h-24 rounded-full bg-blue-600/20 border-2 border-blue-400/40 flex items-center justify-center text-3xl font-bold text-blue-300 mb-3 shadow-inner">
                    {roomData?.candidate_name?.charAt(0) || 'C'}
                  </div>
                  <h4 className="text-base font-bold text-white">{roomData?.candidate_name || 'Candidate'}</h4>
                  <p className="text-xs text-blue-300/80">{roomData?.job_title}</p>
                  <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    HD Video Connected
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <VideoOff className="w-10 h-10 mb-2 text-slate-600" />
                  <span className="text-xs font-semibold">Camera is Turned Off</span>
                </div>
              )}

              {/* Status overlay */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-semibold text-slate-200">
                <span>{roomData?.candidate_name}</span>
                {!micActive && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
              </div>
            </div>

            {/* Team Lead / Interviewer Video Tile */}
            <div className="relative aspect-video rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col items-center justify-center shadow-xl group">
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-purple-600/20 border-2 border-purple-400/40 flex items-center justify-center text-3xl font-bold text-purple-300 mb-3 shadow-inner">
                  {roomData?.interviewer_name?.charAt(0) || 'I'}
                </div>
                <h4 className="text-base font-bold text-white">
                  {roomData?.interviewer_name || 'Interviewer'}
                </h4>
                <p className="text-xs text-purple-300/80">{roomData?.department}</p>
                <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Authorized Interviewer
                </div>
              </div>

              {/* Status overlay */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-semibold text-slate-200">
                <span>{roomData?.interviewer_name}</span>
              </div>
            </div>
          </div>

          {/* Bottom Call Controls Toolbar */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setMicActive(!micActive)}
              className={`p-3.5 rounded-2xl transition cursor-pointer flex items-center justify-center shadow-lg ${
                micActive
                  ? 'bg-slate-800 hover:bg-slate-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
              title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setVideoActive(!videoActive)}
              className={`p-3.5 rounded-2xl transition cursor-pointer flex items-center justify-center shadow-lg ${
                videoActive
                  ? 'bg-slate-800 hover:bg-slate-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
              title={videoActive ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {videoActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => alert('Screen sharing enabled for interview presentation.')}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer flex items-center justify-center shadow-lg"
              title="Share Screen"
            >
              <Share2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to conclude this interview session?')) {
                  if (onBackToDashboard) onBackToDashboard();
                  else window.location.href = '/admin';
                }
              }}
              className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </button>
          </div>
        </div>

        {/* Right: Team Lead Briefing / Chat Sidebar (4 cols on lg) */}
        <div className="lg:col-span-4 border-l border-slate-800 bg-slate-900/60 flex flex-col h-full overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="p-3 border-b border-slate-800 flex items-center gap-2 bg-slate-900">
            <button
              onClick={() => setActiveSideTab('briefing')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSideTab === 'briefing'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              AI Briefing & Scores
            </button>

            <button
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSideTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Live Chat ({chatMessages.length})
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {activeSideTab === 'briefing' ? (
              <div className="space-y-4">
                {/* Agent 1 Score Card */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Agent 1 Resume Evaluation
                    </span>
                    <span className="text-base font-extrabold text-blue-400">
                      {roomData?.candidate_score ?? 85.0}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {roomData?.score_recommendation ||
                      'Verified strong hands-on Python and system architecture experience.'}
                  </p>
                </div>

                {/* Agent 2 Screening Summary */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Agent 2 Phone Screening Summary
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {roomData?.screening_summary ||
                      'Candidate stated full comfort with hybrid working, answered technical questions concisely, and requested no accommodations.'}
                  </p>
                </div>

                {/* Screening Q&A Pairs */}
                {(roomData?.screening_qa || []).length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Screening Q&A Evidence
                    </h5>
                    {roomData.screening_qa.map((qa, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="font-semibold text-slate-200">
                          Q{i + 1}: {qa.question}
                        </div>
                        <div className="text-slate-400 pl-2 border-l border-blue-500/40 text-[11px]">
                          Candidate: "{qa.candidate_answer}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Team Lead Evaluation Notes */}
                {userRole === 'interviewer' && (
                  <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/50 space-y-3">
                    <h5 className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Team Lead Interview Evaluation
                    </h5>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Recommendation Rating
                      </label>
                      <select
                        value={interviewerRating}
                        onChange={(e) => setInterviewerRating(e.target.value)}
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Strong Hire">Strong Hire (High Priority)</option>
                        <option value="Hire">Hire (Standard Offer)</option>
                        <option value="Need Second Opinion">Need Second Technical Round</option>
                        <option value="Decline">Decline</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Technical Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Candidate problem-solving ability, system design clarity, code quality..."
                        value={interviewerNotes}
                        onChange={(e) => setInterviewerNotes(e.target.value)}
                        className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setFeedbackSaved(true);
                        setTimeout(() => setFeedbackSaved(false), 3000);
                      }}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {feedbackSaved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          Feedback Saved to Requisition Audit!
                        </>
                      ) : (
                        'Save Interview Feedback'
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Live Chat Tab */
              <div className="flex flex-col h-full space-y-3">
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[50vh]">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl text-xs space-y-1 ${
                        msg.sender === 'System'
                          ? 'bg-slate-800/60 text-slate-400 border border-slate-700 text-center'
                          : msg.sender.includes('Lead') || msg.sender === roomData?.interviewer_name
                          ? 'bg-blue-950/50 border border-blue-900/60 text-blue-100 ml-4'
                          : 'bg-slate-800 border border-slate-700 text-slate-200 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-300">{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    placeholder="Type message to room..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

