import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  RefreshCw,
  User,
  Radio,
} from 'lucide-react';
import { api } from '../api/client';

export default function CandidateScreeningPage({ onBackToHome }) {
  const searchParams = new URLSearchParams(window.location.search);
  const candidateId = searchParams.get('candidate_id') || '6';

  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Call State
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [step, setStep] = useState(0); // 0 = Consent, 1..N = Questions, N+1 = Availability
  const [answers, setAnswers] = useState({});
  const [availability, setAvailability] = useState('Available next week, Monday to Thursday, 11:00 AM - 4:00 PM PKT');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const loadBrief = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getScreeningBrief(candidateId);
      setBrief(data);
      if (data.screening_completed) {
        setCompleted(true);
      }
    } catch (err) {
      console.error('Failed to load screening brief:', err);
      setError(err.message || 'Could not load screening call. Please verify your application link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrief();
  }, [candidateId]);

  // Call duration timer
  useEffect(() => {
    if (callActive && !completed && !isEndingCall) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callActive, completed, isEndingCall]);

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const questions = brief?.screening_questions || [
    'Could you walk us through your hands-on experience with Python, FastAPI, and Machine Learning in production?',
    'Tell us about a recent AI/ML or RAG project you built and how you evaluated its accuracy and reliability.',
    'Are you comfortable with our work arrangement and team collaboration schedule?',
  ];

  const totalSteps = questions.length + 2;

  const getPromptForStep = (stepIdx) => {
    if (stepIdx === 0) {
      return `Hello ${brief?.name || 'Candidate'}, this is TalentSense AI Recruitment Assistant calling on behalf of the team for the ${brief?.job_title || 'open position'}. This preliminary voice screening is being recorded and transcribed for human HR review. Do you consent to proceed?`;
    }
    if (stepIdx <= questions.length) {
      const qNum = stepIdx;
      const qText = questions[stepIdx - 1];
      const prefix = qNum === 1 ? 'Thank you. Question 1: ' : `Question ${qNum}: `;
      return `${prefix}${qText}`;
    }
    return 'Final question: What is your current notice period and your preferred time window next week for a 45-minute technical interview with our team lead?';
  };

  const currentPrompt = getPromptForStep(step);
  const currentKey = step === 0 ? 'consent' : step <= questions.length ? String(step - 1) : 'availability';

  // Text to Speech (ElevenLabs In-Browser Audio with Web Speech API Fallback)
  const speakWithBrowserFallback = (text, onFinished = null) => {
    if (!('speechSynthesis' in window)) {
      if (onFinished) onFinished();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setIsSpeaking(true);
      stopListening();
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onFinished) onFinished();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (onFinished) onFinished();
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakText = async (text, onFinished = null) => {
    stopSpeaking();
    stopListening();
    setIsSpeaking(true);

    try {
      const resp = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (resp.ok) {
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(blobUrl);
          audioRef.current = null;
          setIsSpeaking(false);
          if (onFinished) onFinished();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          audioRef.current = null;
          speakWithBrowserFallback(text, onFinished);
        };

        await audio.play();
        return;
      }
    } catch {
      // Fallback to browser TTS if ElevenLabs is not configured or unreachable
    }

    speakWithBrowserFallback(text, onFinished);
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Microphone Speech Recognition (STT)
  const startListening = (key) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(' ');
        if (key === 'availability') {
          setAvailability(transcript);
        } else {
          setAnswers((prev) => ({
            ...prev,
            [key]: transcript,
          }));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn(e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // Start Call Handler
  const handleStartCall = async () => {
    setError('');
    // Request microphone access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop audio tracks after obtaining permission
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('Microphone permission prompt note:', err);
      }
    }

    setCallActive(true);
    setCallDuration(0);
    setStep(0);
    const initialPrompt = getPromptForStep(0);

    // Speak initial disclosure aloud, then auto-activate mic
    speakText(initialPrompt, () => {
      startListening('consent');
    });
  };

  // Next Question Handler
  const handleNextStep = () => {
    stopSpeaking();
    stopListening();

    const nextStepIdx = step + 1;
    setStep(nextStepIdx);

    const nextPrompt = getPromptForStep(nextStepIdx);
    const nextKey =
      nextStepIdx === 0
        ? 'consent'
        : nextStepIdx <= questions.length
        ? String(nextStepIdx - 1)
        : 'availability';

    // Agent speaks aloud, then microphone auto-activates for candidate answer
    speakText(nextPrompt, () => {
      startListening(nextKey);
    });
  };

  // End Call & Submit
  const handleFinishCall = async () => {
    stopSpeaking();
    stopListening();
    setIsEndingCall(true);

    const candidateName = brief?.name || 'Muhammad Ahmed';
    const goodbyeText = `Thank you so much, ${candidateName}, for completing your screening conversation today! All of your responses have been recorded and transcribed for our HR team and team lead. Have a wonderful day, goodbye!`;

    // Speak goodbye aloud
    speakText(goodbyeText, async () => {
      setSubmitting(true);
      try {
        await api.submitCandidateSelfScreening(candidateId, {
          mode: 'custom_interactive',
          custom_answers: {
            ...answers,
            consent: answers.consent || 'Yes, I understand and consent to recording for HR review.',
            availability: availability,
          },
          candidate_stated_availability: availability,
          actor: `Candidate (${brief?.name || 'Self'})`,
        });
        setCompleted(true);
        setCallActive(false);
      } catch (err) {
        setError(err.message || 'Failed to submit screening transcript. Please try again.');
      } finally {
        setSubmitting(false);
        setIsEndingCall(false);
      }
    });
  };

  const handleRetakeCall = () => {
    stopSpeaking();
    stopListening();
    setCompleted(false);
    setCallActive(false);
    setStep(0);
    setAnswers({});
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Connecting to TalentSense Voice AI...</p>
        </div>
      </div>
    );
  }

  // SCREEN 1: CALL COMPLETED
  if (completed) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Screening Call Completed!</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Thank you, <strong>{brief?.name}</strong>. Your spoken answers have been recorded, transcribed, and submitted directly to our HR recruiting team and team lead.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Submitted Screening Summary
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Applied Role:</span>
              <strong className="text-white">{brief?.job_title}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Recording Consent:</span>
              <span className="text-emerald-400 font-semibold">Granted & Recorded</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Stated Availability:</span>
              <span className="text-slate-200">{availability}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                if (onBackToHome) onBackToHome();
                else window.location.href = '/';
              }}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-md text-center"
            >
              ← Return to Careers Portal
            </button>
            <button
              onClick={handleRetakeCall}
              className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake Voice Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: PRE-CALL LOBBY (ALLOW MICROPHONE & ANSWER CALL)
  if (!callActive) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow">
              TS
            </div>
            <span className="text-sm font-bold text-white">TalentSense AI Voice Screening Room</span>
          </div>
          <button
            onClick={() => {
              if (onBackToHome) onBackToHome();
              else window.location.href = '/';
            }}
            className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            ← Exit
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            {/* Animated Call Pulse Avatar */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-20" />
              <span className="animate-pulse absolute inline-flex h-20 w-20 rounded-full bg-blue-600 opacity-30" />
              <div className="relative w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                <PhoneCall className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                Incoming Voice AI Screening Call
              </span>
              <h2 className="text-xl font-bold text-white">Ready for your screening?</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Calling <strong>{brief?.name || 'Candidate'}</strong> for the{' '}
                <strong>{brief?.job_title || 'Applied Position'}</strong> role.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2 text-slate-300">
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                How this Voice Call works:
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-400 pl-4 list-disc">
                <li>TalentSense AI Assistant will speak 3–4 role-related questions aloud.</li>
                <li>You speak your answers naturally using your microphone.</li>
                <li>Your voice is transcribed in real-time and saved for the HR team.</li>
                <li>Takes approximately 3–5 minutes.</li>
              </ul>
            </div>

            <button
              onClick={handleStartCall}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PhoneCall className="w-5 h-5" />
              Answer Call & Allow Microphone Access
            </button>
          </div>
        </main>
      </div>
    );
  }

  // SCREEN 3: ACTIVE CONVERSATIONAL VOICE SCREENING CALL
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow">
            TS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">TalentSense AI Voice Screening</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                In Call: {formatDuration(callDuration)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Candidate: <strong>{brief?.name}</strong> · Role: <strong>{brief?.job_title}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            stopSpeaking();
            stopListening();
            if (onBackToHome) onBackToHome();
            else window.location.href = '/';
          }}
          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 cursor-pointer"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End Call
        </button>
      </header>

      {/* Main Screen Body */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Stepper Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-400/40 text-blue-400 flex items-center justify-center text-xs font-bold">
                {step + 1}
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {step === 0
                    ? 'AI Disclosure & Recording Consent'
                    : step <= questions.length
                    ? `Interview Question ${step} of ${questions.length}`
                    : 'Notice Period & Availability'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Step {step + 1} of {totalSteps}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition ${
                    idx === step
                      ? 'bg-blue-400 ring-4 ring-blue-400/20 scale-125'
                      : answers[idx === 0 ? 'consent' : idx <= questions.length ? String(idx - 1) : 'availability']
                      ? 'bg-emerald-400'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* AI Voice Prompt Box */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Recruiting Assistant Speaking
                  </span>
                  {isSpeaking && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 animate-pulse">
                      🔊 Speaking aloud...
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">{currentPrompt}</p>
              </div>

              {/* Re-play Audio Button */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  else speakText(currentPrompt);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md ${
                  isSpeaking
                    ? 'bg-amber-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title="Click to replay the question voice aloud"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400" />}
                {isSpeaking ? 'Stop' : 'Replay'}
              </button>
            </div>
          </div>

          {/* Candidate Spoken Answer Input Area */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <span>Your Spoken Answer:</span>
                {isListening ? (
                  <span className="text-[11px] text-rose-400 font-semibold animate-pulse flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Microphone Live · Speak now...
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    (Microphone active or type manually)
                  </span>
                )}
              </label>

              {step === 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setAnswers({
                      ...answers,
                      consent: 'Yes, I understand this is an AI assistant and I consent to recording and transcription for HR review.',
                    })
                  }
                  className="text-[11px] text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  + Click Quick Consent ("Yes, I agree")
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                rows={4}
                placeholder="Speak into your microphone. Your spoken words will appear here in real time..."
                value={step <= questions.length ? answers[currentKey] || '' : availability}
                onChange={(e) => {
                  if (step <= questions.length) {
                    setAnswers({ ...answers, [currentKey]: e.target.value });
                  } else {
                    setAvailability(e.target.value);
                  }
                }}
                className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-4 pr-32 text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
              />

              {/* Mic Toggle Button */}
              <div className="absolute right-3 bottom-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening(currentKey);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <Mic className="w-4 h-4 text-white" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-blue-400" />
                      Record Mic
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 0 || isEndingCall}
              onClick={() => {
                stopSpeaking();
                stopListening();
                setStep((s) => Math.max(0, s - 1));
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
            >
              ← Previous
            </button>

            {step < totalSteps - 1 ? (
              <button
                type="button"
                disabled={isEndingCall}
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                Confirm & Next Question
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || isEndingCall}
                onClick={handleFinishCall}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isEndingCall
                  ? 'Saying Goodbye...'
                  : submitting
                  ? 'Submitting to HR...'
                  : 'Finish Call & Submit Responses'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
