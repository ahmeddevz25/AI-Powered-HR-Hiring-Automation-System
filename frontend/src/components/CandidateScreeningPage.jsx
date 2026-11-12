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
  Bot,
  MessageSquare,
  Clock,
  Globe,
  CornerDownLeft,
} from 'lucide-react';
import { api } from '../api/client';
import recruiterAvatar from '../assets/recruiter.png';
import candidateAvatar from '../assets/candidate.png';

// Animated Audio Equalizer Component
function AudioEqualizer({ active, color = 'blue' }) {
  const heights = [35, 90, 55, 100, 45, 80, 60];
// Compact Animated Equalizer Pill
function AudioEqualizer({ active, color = 'cyan' }) {
  const heights = [40, 95, 60, 100, 50, 85, 65, 90];
  return (
    <div className="flex items-end gap-1 h-4 px-1">
    <div className="flex items-center gap-0.5 h-4 px-1">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${
            color === 'emerald' ? 'bg-emerald-400' : 'bg-blue-400'
            active ? 'animate-soundwave' : ''
          } ${
            color === 'emerald'
              ? 'bg-gradient-to-t from-emerald-500 to-teal-300'
              : 'bg-gradient-to-t from-cyan-500 to-teal-300'
          }`}
          style={{
            height: active ? `${h}%` : '20%',
            animation: active
              ? `pulse 0.6s ease-in-out infinite ${(i * 0.1).toFixed(2)}s`
              : 'none',
            height: active ? `${h}%` : '24%',
            animationDelay: `${(i * 0.09).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}

// Wide Studio Multi-Bar Soundwave Visualizer
function StudioWaveform({ active, color = 'cyan', volume = 50 }) {
  const bars = [28, 52, 85, 45, 95, 70, 100, 60, 88, 40, 92, 76, 100, 58, 84, 48, 90, 64, 42, 30];
  return (
    <div className="flex items-center justify-center gap-1 h-9 px-3 py-1.5 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md">
      {bars.map((baseH, idx) => {
        const boost = active ? Math.min(100, Math.max(25, baseH + (volume > 10 ? (volume - 30) * 0.3 : 0))) : 18;
        return (
          <span
            key={idx}
            className={`w-1 rounded-full transition-all duration-150 ${
              active ? 'animate-soundwave' : 'opacity-30'
            } ${
              color === 'emerald'
                ? 'bg-gradient-to-t from-emerald-500 via-teal-400 to-emerald-200 shadow-xs shadow-emerald-400/50'
                : 'bg-gradient-to-t from-cyan-500 via-teal-400 to-cyan-200 shadow-xs shadow-cyan-400/50'
            }`}
            style={{
              height: active ? `${boost}%` : '20%',
              animationDelay: `${((idx % 7) * 0.11).toFixed(2)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function CandidateScreeningPage({ onBackToHome }) {
  const searchParams = new URLSearchParams(window.location.search);
  const candidateId = searchParams.get('candidate_id') || '8';

  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Call State
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [step, setStep] = useState(0); // 0 = Consent, 1..N = Questions
  const [answers, setAnswers] = useState({});
  const [availability, setAvailability] = useState('Available next week, Monday to Thursday, 11:00 AM - 4:00 PM PKT');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);
  const [validationWarning, setValidationWarning] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-US'); // 'en-US' or 'en-PK' or 'ur-PK'
  const [micVolume, setMicVolume] = useState(0); // Real mic volume meter (0..100)

  // Refs for race-condition-free audio & recognition management
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const shouldListenRef = useRef(false);
  const activeKeyRef = useRef('consent');
  const baseTextRef = useRef('');
  const callActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

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

  const questions = brief?.screening_questions?.length
    ? brief.screening_questions
    : [
        'Could you briefly tell me about yourself and a backend API or database system you designed?',
        'Are you comfortable collaborating in a remote or hybrid engineering team?',
        'What is your notice period, and what times next week work best for a conversation with our team lead?',
      ];

  const totalSteps = 1 + questions.length;

  const getStepTitle = (stepIdx) => {
    if (stepIdx === 0) return 'Consent & Recording';
    if (stepIdx === 1) return 'Technical & Role Experience';
    if (stepIdx === 2) return 'Work Style & Team Collaboration';
    if (stepIdx === 3) return 'Availability & Next Steps';
    return `Question ${stepIdx}`;
  };

  const getPromptForStep = (stepIdx) => {
    if (stepIdx === 0) {
      return `Hi ${brief?.name || 'there'}! It's wonderful to connect with you. I'm calling from TalentSense regarding your application for the ${brief?.job_title || 'open'} role. Before we get started with a few quick questions, is it okay if we record this 3-minute call for our HR team?`;
    }
    const qText = questions[stepIdx - 1];
    return qText;
  };

  const currentPrompt = getPromptForStep(step);
  const currentKey = step === 0 ? 'consent' : String(step - 1);

  // Strict Answer Validation
  const validateCurrentAnswer = () => {
    const val = (answers[currentKey] || '').trim();
    if (!val) {
      if (step === 0) {
        return {
          valid: false,
          promptHint: "Could you please confirm if it's okay for us to record this call for our HR team?",
          uiMessage: "Please provide consent before proceeding (speak 'Yes, I agree' or click quick consent below).",
        };
      }
      if (step === 1) {
        return {
          valid: false,
          promptHint: "Could you please share a little bit about your experience or a project you worked on?",
          uiMessage: "Please speak a short answer about your experience before moving to the next question.",
        };
      }
      if (step === 2) {
        return {
          valid: false,
          promptHint: "Could you let us know if you're comfortable with hybrid or remote work?",
          uiMessage: "Please confirm your work arrangement comfort before continuing.",
        };
      }
      return {
        valid: false,
        promptHint: "Could you please share your notice period or availability for next week?",
        uiMessage: "Please mention your notice period or availability before submitting.",
      };
    }

    if (step === 0 && val.length < 3) {
      return {
        valid: false,
        promptHint: "Please confirm with a clear 'Yes, I agree' or click quick consent to continue.",
        uiMessage: "Please provide a clear consent response before continuing.",
      };
    }
    if (step === 1 && val.length < 8) {
      return {
        valid: false,
        promptHint: "Could you tell me just a little more detail about what you've worked on?",
        uiMessage: "Please provide a slightly more descriptive answer (at least a few words) before continuing.",
      };
    }
    if (step > 1 && val.length < 4) {
      return {
        valid: false,
        promptHint: "Could you please give a slightly clearer answer before we move forward?",
        uiMessage: "Please give a clear response before proceeding.",
      };
    }

    return { valid: true };
  };

  const isCurrentAnswerValid = validateCurrentAnswer().valid;

  const getQuickSuggestions = (stepIdx) => {
    if (stepIdx === 0) {
      return [
        { label: '+ Quick Consent ("Yes, I agree")', text: 'Yes, I understand and consent to recording for HR review.' },
        { label: '+ "Yes, proceed with call"', text: 'Yes, I agree, please proceed with the screening conversation.' },
      ];
    }
    if (stepIdx === 1) {
      return [
        { label: '+ "FastAPI & Python Architecture"', text: 'I specialize in Python and FastAPI microservices, architecting high-performance asynchronous REST endpoints, PostgreSQL databases, and Redis caching.' },
        { label: '+ "Full-Stack Web & APIs"', text: 'I have hands-on experience building full-stack web applications with React on the frontend and scalable REST APIs on the backend.' },
      ];
    }
    if (stepIdx === 2) {
      return [
        { label: '+ "Comfortable with Hybrid / Remote"', text: 'Yes, I am fully comfortable collaborating in a remote or hybrid engineering team.' },
        { label: '+ "Comfortable with team schedule"', text: 'Yes, perfectly aligned with the team collaboration hours and sprint syncs.' },
      ];
    }
    return [
      { label: '+ "Tuesday or Wednesday 11 AM - 4 PM"', text: 'Immediate joiner / 2 weeks notice period. Available Tuesday or Wednesday between 11:00 AM and 4:00 PM PKT.' },
      { label: '+ "Flexible next week"', text: '2 weeks notice period. Flexible and available anytime next week during business hours.' },
    ];
  };

  // Text-To-Speech with ElevenLabs + Browser Fallback
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
      isSpeakingRef.current = true;
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onFinished) onFinished();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onFinished) onFinished();
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakText = async (text, onFinished = null) => {
    // 1. Force-stop any active microphone cleanly before speaking
    stopListening(true);
    stopSpeaking();
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    const safetyTimer = setTimeout(() => {
      if (isSpeakingRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onFinished) onFinished();
      }
    }, 9500);

    const safeOnFinished = () => {
      clearTimeout(safetyTimer);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onFinished) onFinished();
    };

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
          safeOnFinished();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          audioRef.current = null;
          speakWithBrowserFallback(text, safeOnFinished);
        };

        await audio.play();
        return;
      }
    } catch {
      // Fallback
    }

    speakWithBrowserFallback(text, safeOnFinished);
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
    isSpeakingRef.current = false;
  };

  // =========================================================================
  // BULLETPROOF SPEECH RECOGNITION (CLEAN LIFECYCLE & MULTI-STEP SAFE)
  // =========================================================================

  // Completely neutralizes any active recognition instance so it cannot fire or resurrect
  const cleanupRecognition = () => {
    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current;
        rec.onstart = null;
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const stopListening = (permanent = false) => {
    if (permanent) {
      shouldListenRef.current = false;
    }
    cleanupRecognition();
  };

  const startListening = (targetStepKey) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser.');
      return;
    }

    // Never start listening while AI is actively speaking or transitioning
    if (isSpeakingRef.current || isTransitioningRef.current) {
      return;
    }

    // 1. Cleanly tear down any prior instance
    cleanupRecognition();

    const targetKey = targetStepKey || activeKeyRef.current || 'consent';
    activeKeyRef.current = targetKey;
    shouldListenRef.current = true;

    // Snapshot existing text so newly spoken words append smoothly
    setAnswers((prev) => {
      baseTextRef.current = (prev[targetKey] || '').trim();
      return prev;
    });

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript + ' ';
        }
        sessionTranscript = sessionTranscript.trim();

        const base = (baseTextRef.current || '').trim();
        const combined = base
          ? `${base} ${sessionTranscript}`.trim()
          : sessionTranscript;

        const currentActiveKey = activeKeyRef.current;
        if (currentActiveKey === 'availability') {
          setAvailability(combined);
        }

        setAnswers((prev) => ({
          ...prev,
          [currentActiveKey]: combined,
        }));

        if (validationWarning) setValidationWarning('');
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return; // Normal Chrome pause or clean abort
        }
        console.warn('SpeechRecognition notice:', event.error);
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          setValidationWarning('Microphone access was blocked or not detected. Please verify microphone permission in your browser.');
        }
      };

      recognition.onend = () => {
        // If this recognition is still the active one and we should listen, re-start cleanly
        if (
          recognitionRef.current === recognition &&
          shouldListenRef.current &&
          callActiveRef.current &&
          !isSpeakingRef.current &&
          !isTransitioningRef.current
        ) {
          // Commit current text to baseTextRef
          setAnswers((prev) => {
            baseTextRef.current = (prev[activeKeyRef.current] || '').trim();
            return prev;
          });

          setTimeout(() => {
            if (
              recognitionRef.current === recognition &&
              shouldListenRef.current &&
              !isSpeakingRef.current &&
              !isTransitioningRef.current
            ) {
              try {
                recognition.start();
                setIsListening(true);
              } catch (err) {
                // If restart fails, create a fresh session
                cleanupRecognition();
                startListening(activeKeyRef.current);
              }
            }
          }, 150);
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
      setIsListening(false);
    }
  };

  // Real-time Audio Level Detection (decibel meter for visual voice feedback)
  const setupAudioMeter = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicVolume(normalized);
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn('AudioContext meter setup note:', e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecognition();
      stopSpeaking();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // START CALL HANDLER
  const handleStartCall = async () => {
    setError('');
    // Request persistent mic stream for real decibel visualization
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setupAudioMeter(stream);
      } catch (err) {
        console.warn('Microphone permission prompt note:', err);
      }
    }

    setCallActive(true);
    callActiveRef.current = true;
    shouldListenRef.current = true;
    isTransitioningRef.current = false;
    activeKeyRef.current = 'consent';
    baseTextRef.current = '';
    setCallDuration(0);
    setStep(0);
    const initialPrompt = getPromptForStep(0);

    // Speak initial prompt, then cleanly activate mic
    speakText(initialPrompt, () => {
      startListening('consent');
    });
  };

  // NEXT QUESTION HANDLER
  const handleNextStep = async () => {
    const check = validateCurrentAnswer();
    if (!check.valid) {
      setValidationWarning(check.uiMessage);
      speakText(check.promptHint, () => {
        startListening(currentKey);
      });
      return;
    }

    // 1. Immediately lock down mic and mark transition to prevent race conditions!
    stopListening(true);
    isTransitioningRef.current = true;

    const candidateInput = (answers[currentKey] || '').trim();
    setIsEvaluating(true);

    try {
      const evalResult = await api.evaluateScreeningResponse({
        job_title: brief?.job_title || 'Senior Software Engineer',
        current_question: currentPrompt,
        step_index: step,
        candidate_input: candidateInput,
      });

      if (evalResult && !evalResult.is_relevant) {
        setValidationWarning(evalResult.agent_reply);
        isTransitioningRef.current = false;
        // AI speaks the polite answer + redirection back to the unanswered question!
        speakText(evalResult.agent_reply, () => {
          setAnswers((prev) => ({ ...prev, [currentKey]: '' }));
          baseTextRef.current = '';
          startListening(currentKey);
        });
        setIsEvaluating(false);
        return; // Stays on the exact same question!
      }
    } catch (err) {
      console.warn('Evaluation check notice:', err);
    } finally {
      setIsEvaluating(false);
    }

    setValidationWarning('');
    stopSpeaking();

    // 2. Advance to the next step
    baseTextRef.current = '';
    const nextStepIdx = step + 1;
    setStep(nextStepIdx);

    const nextPrompt = getPromptForStep(nextStepIdx);
    const nextKey = String(nextStepIdx - 1);
    activeKeyRef.current = nextKey;

    const acknowledgments = [
      "Thank you! That's really clear.",
      "Got it, thank you!",
      "Awesome, thanks for explaining that!",
      "Perfect, thank you!",
    ];
    const ack = acknowledgments[step % acknowledgments.length];
    const fullSpeech = `${ack} Next question: ${nextPrompt}`;

    // 3. Speak next question aloud, then cleanly open the mic for nextKey
    speakText(fullSpeech, () => {
      isTransitioningRef.current = false;
      startListening(nextKey);
    });
  };

  // FINISH CALL HANDLER
  const handleFinishCall = async () => {
    const check = validateCurrentAnswer();
    if (!check.valid) {
      setValidationWarning(check.uiMessage);
      speakText(check.promptHint, () => {
        startListening(currentKey);
      });
      return;
    }

    stopListening(true);
    isTransitioningRef.current = true;

    const candidateInput = (answers[currentKey] || '').trim();
    setIsEvaluating(true);

    try {
      const evalResult = await api.evaluateScreeningResponse({
        job_title: brief?.job_title || 'Senior Software Engineer',
        current_question: currentPrompt,
        step_index: step,
        candidate_input: candidateInput,
      });

      if (evalResult && !evalResult.is_relevant) {
        setValidationWarning(evalResult.agent_reply);
        isTransitioningRef.current = false;
        speakText(evalResult.agent_reply, () => {
          setAnswers((prev) => ({ ...prev, [currentKey]: '' }));
          baseTextRef.current = '';
          startListening(currentKey);
        });
        setIsEvaluating(false);
        return;
      }
    } catch (err) {
      console.warn('Evaluation check notice:', err);
    } finally {
      setIsEvaluating(false);
    }

    setValidationWarning('');
    stopSpeaking();
    setIsEndingCall(true);

    const candidateName = brief?.name || 'there';
    const goodbyeText = `Thank you so much, ${candidateName}! It was really wonderful speaking with you today. All of your responses have been recorded and saved for our team lead and hiring team. We will be in touch very soon. Have a great day ahead, goodbye!`;

    const availabilityAnswer =
      answers[String(questions.length - 1)] ||
      availability ||
      'Available next week during business hours';

    speakText(goodbyeText, async () => {
      setSubmitting(true);
      try {
        await api.submitCandidateSelfScreening(candidateId, {
          mode: 'custom_interactive',
          custom_answers: {
            ...answers,
            consent: answers.consent || 'Yes, I understand and consent to recording for HR review.',
            availability: availabilityAnswer,
          },
          candidate_stated_availability: availabilityAnswer,
          actor: `Candidate (${brief?.name || 'Self'})`,
        });
        setCompleted(true);
        setCallActive(false);
      } catch (err) {
        setError(err.message || 'Failed to submit screening transcript. Please try again.');
      } finally {
        setSubmitting(false);
        setIsEndingCall(false);
        isTransitioningRef.current = false;
      }
    });
  };

  const handleRetakeCall = () => {
    stopSpeaking();
    stopListening(true);
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
          <p className="text-sm font-semibold text-slate-300">Connecting to TalentSense Voice AI Studio...</p>
      <div className="min-h-screen bg-[#060B14] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-96 h-96 rounded-full bg-teal-500/15 blur-3xl absolute -top-20 -left-20 animate-float-orb" />
        <div className="w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl absolute -bottom-20 -right-20 animate-float-orb" />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-11 h-11 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-zinc-200">Connecting to TalentSense Neural Voice Studio...</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 1: CALL COMPLETED
  // =========================================================================
  if (completed) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
      <div className="min-h-screen bg-[#060B14] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="w-[450px] h-[450px] rounded-full bg-emerald-500/15 blur-3xl absolute top-10 left-1/4 animate-float-orb pointer-events-none" />
        <div className="max-w-xl w-full bg-zinc-900/85 border border-white/15 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-2xl relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-zinc-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Screening Call Completed!</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Voice Screening Completed!</h2>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-md mx-auto">
              Thank you, <strong>{brief?.name}</strong>. Your spoken responses have been recorded, transcribed, and submitted directly to our HR recruiting team and team lead.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Screening Summary
            </div>
            <div className="flex items-center justify-between text-slate-300 border-b border-slate-900 pb-2">
              <span className="text-slate-400">Candidate:</span>
            <div className="flex items-center justify-between text-zinc-300 border-b border-white/10 pb-2">
              <span className="text-zinc-400">Candidate:</span>
              <strong className="text-white">{brief?.name}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300 border-b border-slate-900 pb-2">
              <span className="text-slate-400">Applied Role:</span>
              <strong className="text-white">{brief?.job_title}</strong>
            <div className="flex items-center justify-between text-zinc-300 border-b border-white/10 pb-2">
              <span className="text-zinc-400">Applied Role:</span>
              <strong className="text-teal-300">{brief?.job_title}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300 border-b border-slate-900 pb-2">
              <span className="text-slate-400">Recording Consent:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <div className="flex items-center justify-between text-zinc-300 border-b border-white/10 pb-2">
              <span className="text-zinc-400">Recording Consent:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Granted & Saved
              </span>
            </div>
            <div className="flex items-start justify-between text-slate-300 pt-1">
              <span className="text-slate-400 shrink-0">Stated Availability:</span>
              <span className="text-slate-200 text-right font-medium max-w-[280px]">
            <div className="flex items-start justify-between text-zinc-300 pt-1">
              <span className="text-zinc-400 shrink-0">Stated Availability:</span>
              <span className="text-zinc-100 text-right font-semibold max-w-[280px]">
                {availability || 'Flexible next week'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                if (onBackToHome) onBackToHome();
                else window.location.href = '/';
              }}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-600/30 text-center"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-teal-600/30 text-center"
            >
              ← Return to Careers Portal
            </button>
            <button
              onClick={handleRetakeCall}
              className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retake Voice Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: PRE-CALL LOBBY (ALLOW MICROPHONE & ANSWER CALL)
  // =========================================================================
  if (!callActive) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
      <div className="min-h-screen bg-[#060B14] text-zinc-100 flex flex-col font-sans relative overflow-hidden">
        {/* Animated Aurora Background Orbs */}
        <div className="w-[500px] h-[500px] rounded-full bg-teal-500/15 blur-3xl absolute -top-28 -left-24 animate-float-orb pointer-events-none" />
        <div className="w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-3xl absolute -bottom-28 -right-24 animate-float-orb pointer-events-none" />
        <div className="inset-0 absolute bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />

        <header className="h-16 border-b border-white/10 bg-zinc-950/60 backdrop-blur-xl px-6 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/20">
              TS
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-zinc-950 font-black text-sm shadow-lg shadow-teal-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wide">TalentSense AI</span>
              <span className="text-[11px] text-blue-400 block font-medium">Virtual Interview Studio</span>
              <span className="text-sm font-extrabold text-white tracking-tight">TalentSense Neural Voice</span>
              <span className="text-[11px] text-teal-400 block font-semibold">ElevenLabs AI Screening Studio</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (onBackToHome) onBackToHome();
              else window.location.href = '/';
            }}
            className="text-xs text-slate-400 hover:text-white transition cursor-pointer px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700"
            className="text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
          >
            ← Exit
            ← Exit Studio
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800/80 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
            {/* Dual Illustrated Avatars in Incoming Call */}
            <div className="flex items-center justify-center gap-5 pt-2">
        <main className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="max-w-lg w-full bg-zinc-900/80 border border-white/15 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-2xl">
            {/* Dual Illustrated Avatars with Animated Concentric Ripple Rings */}
            <div className="flex items-center justify-center gap-6 pt-3">
              {/* Recruiter Avatar Image */}
              <div className="relative">
                <span className="animate-ping absolute -inset-1.5 rounded-full bg-blue-500 opacity-30" />
                <div className="relative w-20 h-20 rounded-full border-2 border-blue-400 p-1 shadow-xl shadow-blue-500/30 overflow-hidden bg-gradient-to-tr from-blue-950 to-indigo-900 flex items-center justify-center">
                <span className="animate-ripple-glow absolute -inset-3 rounded-full border-2 border-cyan-400/50" />
                <span className="animate-ping absolute -inset-1.5 rounded-full bg-cyan-500 opacity-25" />
                <div className="relative w-24 h-24 rounded-full border-2 border-cyan-400 p-1 shadow-2xl shadow-cyan-500/30 overflow-hidden bg-gradient-to-tr from-cyan-950 via-teal-900 to-zinc-900 flex items-center justify-center">
                  <img
                    src={recruiterAvatar}
                    alt="Sarah Jenkins (Recruiter)"
                    className="w-16 h-16 object-contain object-bottom translate-y-1"
                    className="w-20 h-20 object-contain object-bottom translate-y-1"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white border-2 border-slate-900 shadow">
                  RECRUITER
                <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-cyan-500 to-teal-500 text-zinc-950 shadow">
                  AI RECRUITER
                </span>
              </div>

              {/* Connecting Wave Indicator */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              {/* Animated Waveform Bridge */}
              <div className="flex flex-col items-center gap-1">
                <AudioEqualizer active={true} color="cyan" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-teal-400">Live Link</span>
              </div>

              {/* Candidate Avatar Image */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-emerald-400 p-1 shadow-xl shadow-emerald-500/30 overflow-hidden bg-gradient-to-tr from-emerald-950 to-teal-900 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-2 border-emerald-400 p-1 shadow-2xl shadow-emerald-500/30 overflow-hidden bg-gradient-to-tr from-emerald-950 via-teal-900 to-zinc-900 flex items-center justify-center">
                  <img
                    src={candidateAvatar}
                    alt={brief?.name || 'Candidate'}
                    className="w-16 h-16 object-contain object-bottom translate-y-1"
                    className="w-20 h-20 object-contain object-bottom translate-y-1"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white border-2 border-slate-900 shadow">
                <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-emerald-400 to-teal-500 text-zinc-950 shadow">
                  YOU
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5">
            <div className="space-y-1.5 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                Incoming Voice AI Screening Call
                Incoming Neural Voice Screening Call
              </span>
              <h2 className="text-xl font-bold text-white">Sarah Jenkins is calling...</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Calling <strong>{brief?.name || 'Candidate'}</strong> for the{' '}
                <strong className="text-slate-300">{brief?.job_title || 'Applied Position'}</strong> role at TalentSense.
              <h2 className="text-2xl font-extrabold text-white tracking-tight pt-1">
                Sarah Jenkins is calling...
              </h2>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Connecting with <strong className="text-white">{brief?.name || 'Candidate'}</strong> for{' '}
                <strong className="text-teal-300">{brief?.job_title || 'Applied Position'}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-left text-xs space-y-2.5 text-slate-300">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                <Sparkles className="w-4 h-4" />
                Interactive Studio Experience:
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-left text-xs space-y-2.5 text-zinc-300">
              <div className="flex items-center gap-2 text-teal-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-teal-400" />
                AI Voice Studio Highlights:
              </div>
              <ul className="space-y-2 text-[11px] text-slate-400 pl-4 list-disc">
                <li><strong className="text-slate-300">Interactive Recruiter:</strong> Sarah will speak role questions aloud.</li>
                <li><strong className="text-slate-300">Hands-Free Microphone:</strong> Speak naturally; your words stream in real-time.</li>
                <li><strong className="text-slate-300">Conversational Guard:</strong> Ask any clarification; Sarah will guide you back.</li>
                <li><strong className="text-slate-300">Duration:</strong> Approximately 3–5 minutes.</li>
              <ul className="space-y-2 text-[11px] text-zinc-300 pl-4 list-disc">
                <li><strong className="text-white">ElevenLabs Neural Voice:</strong> Sarah speaks questions aloud right in your browser.</li>
                <li><strong className="text-white">Hands-Free Live Mic:</strong> Speak naturally; your voice streams into real-time text.</li>
                <li><strong className="text-white">Conversational Guard:</strong> Ask clarifying questions anytime during the call.</li>
              </ul>
            </div>

            <button
              onClick={handleStartCall}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-500 text-zinc-950 text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PhoneCall className="w-5 h-5 animate-pulse" />
              Answer Call & Enable Microphone
              <PhoneCall className="w-5 h-5 animate-bounce" />
              Answer Call & Launch Voice Studio
            </button>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: ACTIVE CONVERSATIONAL VOICE SCREENING CALL (DUAL-AVATAR STAGE)
  // SCREEN 3: ACTIVE CONVERSATIONAL VOICE SCREENING CALL (ANIMATED STUDIO STAGE)
  // =========================================================================
  const isCandidateTurn = !isSpeaking;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/20">
            TS
    <div className="min-h-screen bg-[#050A12] text-zinc-100 flex flex-col font-sans select-none relative overflow-hidden">
      {/* Dynamic Animated Aurora Orbs & Studio Grid */}
      <div
        className={`w-[560px] h-[560px] rounded-full blur-3xl absolute -top-32 -left-24 pointer-events-none transition-all duration-700 animate-float-orb ${
          isSpeaking ? 'bg-cyan-500/25 scale-110' : 'bg-cyan-500/8 scale-95'
        }`}
      />
      <div
        className={`w-[560px] h-[560px] rounded-full blur-3xl absolute -bottom-32 -right-24 pointer-events-none transition-all duration-700 animate-float-orb ${
          isListening ? 'bg-emerald-500/25 scale-110' : 'bg-teal-500/10 scale-95'
        }`}
      />
      <div className="inset-0 absolute bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />

      {/* Top Glass Studio Header */}
      <header className="h-16 border-b border-white/10 bg-zinc-950/75 backdrop-blur-xl px-6 flex items-center justify-between shrink-0 relative z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-zinc-950 font-black text-sm shadow-lg shadow-teal-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">TalentSense AI Voice Studio</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-inner">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-extrabold text-white tracking-tight">
                TalentSense Neural Voice Studio
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 shadow-inner font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live: {formatDuration(callDuration)}
                LIVE · {formatDuration(callDuration)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-md">
              Candidate: <strong className="text-slate-200">{brief?.name}</strong> · Role: <strong className="text-slate-200">{brief?.job_title}</strong>
            <p className="text-[11px] text-zinc-400 truncate max-w-md mt-0.5">
              Candidate: <strong className="text-white">{brief?.name}</strong> · Role:{' '}
              <strong className="text-teal-300">{brief?.job_title}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            stopSpeaking();
            stopListening(true);
            if (onBackToHome) onBackToHome();
            else window.location.href = '/';
          }}
          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
          className="text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-600 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 transition cursor-pointer shadow-sm"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End Call
        </button>
      </header>

      {/* Stepper Progress Bar */}
      <div className="bg-slate-900/40 border-b border-slate-800/60 px-6 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              {getStepTitle(step)}
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400 font-medium">
              Step {step + 1} of {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-2">
      {/* Interactive Connected Step Timeline Header */}
      <div className="bg-zinc-900/50 border-b border-white/10 px-6 py-3 backdrop-blur-md relative z-20">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const isPast = idx < step;
              const isCurrent = idx === step;
              return (
                <div key={idx} className="flex items-center gap-1.5">
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                    className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                      isCurrent
                        ? 'w-8 bg-blue-500 shadow-md shadow-blue-500/50'
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-zinc-950 shadow-md shadow-teal-500/30 scale-105'
                        : isPast
                        ? 'w-5 bg-emerald-500'
                        : 'w-4 bg-slate-700'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/5 text-zinc-500 border border-white/10'
                    }`}
                  />
                  >
                    {isPast ? (
                      <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                    ) : (
                      <span className="font-mono">{idx + 1}.</span>
                    )}
                    <span>{getStepTitle(idx)}</span>
                  </div>
                  {idx < totalSteps - 1 && (
                    <div className={`w-5 h-0.5 rounded-full ${isPast ? 'bg-emerald-500/60' : 'bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </div>

          <span className="text-xs font-mono font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg">
            Step {step + 1} / {totalSteps}
          </span>
        </div>
      </div>

      {/* Main Calling Stage: Dual Avatars */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pb-28">
      {/* Main Calling Stage: Dual Animated Voice Orbs & Teleprompter */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pb-28 relative z-10">
        <div className="max-w-5xl w-full space-y-4">

          {/* Turn Flow Banner */}
          {/* Animated Live Turn Status Pill */}
          <div className="flex items-center justify-center">
            {isSpeaking ? (
              <div className="px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-2 animate-pulse shadow-md">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Sarah Jenkins (AI Recruiter) is speaking...</span>
                <AudioEqualizer active={true} color="blue" />
              <div className="px-5 py-2 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center gap-2.5 shadow-lg shadow-cyan-950/60 backdrop-blur-xl">
                <Volume2 className="w-4 h-4 text-cyan-300 animate-bounce" />
                <span>Sarah Jenkins (ElevenLabs AI Recruiter) is speaking...</span>
                <AudioEqualizer active={true} color="cyan" />
              </div>
            ) : isListening ? (
              <div className="px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-md">
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Your turn to speak · Microphone is listening!</span>
                <AudioEqualizer active={micVolume > 5 || isListening} color="emerald" />
              <div className="px-5 py-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-lg shadow-emerald-950/60 backdrop-blur-xl">
                <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Your Turn to Speak · Live Microphone Active</span>
                <AudioEqualizer active={micVolume > 4 || isListening} color="emerald" />
              </div>
            ) : (
              <div className="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Answer recorded · Click Confirm & Next Question</span>
              <div className="px-5 py-2 rounded-full bg-white/5 border border-white/15 text-zinc-200 text-xs font-bold flex items-center gap-2 backdrop-blur-xl">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Response captured · Click Confirm & Next Question below</span>
              </div>
            )}
          </div>

          {/* Validation / Off-Topic Guard Notification Banner */}
          {validationWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3 animate-pulse shadow-lg">
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-3 shadow-lg backdrop-blur-xl">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1 font-medium leading-relaxed">
                <span className="font-bold text-amber-300">Recruiter Clarification: </span>
                <span className="font-bold text-amber-300">Recruiter Guidance: </span>
                {validationWarning}
              </div>
            </div>
          )}

          {/* Two-Column Avatar Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Two-Column Animated Studio Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

            {/* =================================================================== */}
            {/* AVATAR CARD 1: AI RECRUITER (SARAH JENKINS) */}
            {/* POD 1: AI RECRUITER (SARAH JENKINS — ANIMATED NEURAL VOICE STAGE) */}
            {/* =================================================================== */}
            <div
              className={`rounded-3xl border transition-all duration-300 p-6 flex flex-col justify-between backdrop-blur-xl ${
              className={`rounded-3xl border transition-all duration-500 p-6 flex flex-col justify-between backdrop-blur-2xl relative overflow-hidden ${
                isSpeaking
                  ? 'bg-slate-900/95 border-blue-500 ring-2 ring-blue-500/40 shadow-2xl shadow-blue-500/20 scale-[1.01]'
                  : 'bg-slate-900/60 border-slate-800/80 shadow-lg opacity-85'
                  ? 'bg-gradient-to-b from-cyan-950/60 via-zinc-900/95 to-zinc-950/95 border-cyan-400 ring-2 ring-cyan-400/30 shadow-2xl shadow-cyan-500/20 scale-[1.01]'
                  : 'bg-zinc-900/65 border-white/10 shadow-xl opacity-90'
              }`}
            >
              {/* Recruiter Header Profile */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
                <div className="flex items-center gap-3.5">
                  {/* Glowing Animated Avatar Image */}
                  <div className="relative">
                    {isSpeaking && (
                      <>
                        <span className="animate-ping absolute -inset-1 rounded-full bg-blue-500 opacity-40" />
                        <span className="animate-pulse absolute -inset-2 rounded-full bg-blue-600 opacity-20" />
                      </>
                    )}
                    <div
                      className={`relative w-16 h-16 rounded-full overflow-hidden transition-all shadow-md flex items-center justify-center ${
                        isSpeaking
                          ? 'bg-gradient-to-tr from-blue-900/80 to-indigo-900/80 border-2 border-blue-300 ring-4 ring-blue-500/40'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    >
                      <img
                        src={recruiterAvatar}
                        alt="Sarah Jenkins"
                        className="w-14 h-14 object-contain object-bottom translate-y-1"
              {/* Top Animated Avatar Orb Stage + Multi-Bar Waveform */}
              <div className="flex flex-col items-center text-center pt-1 pb-4 border-b border-white/10 space-y-3">
                <div className="relative flex items-center justify-center">
                  {isSpeaking && (
                    <>
                      <span className="animate-ripple-glow absolute -inset-4 rounded-full border-2 border-cyan-400/60" />
                      <span
                        className="animate-ripple-glow absolute -inset-7 rounded-full border border-teal-400/35"
                        style={{ animationDelay: '0.6s' }}
                      />
                    </div>
                    {isSpeaking && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      </span>
                    )}
                      <span className="animate-ping absolute -inset-2 rounded-full bg-cyan-400/25" />
                    </>
                  )}
                  <div
                    className={`relative w-24 h-24 rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
                      isSpeaking
                        ? 'bg-gradient-to-tr from-cyan-900 via-teal-800 to-zinc-900 border-2 border-cyan-300 ring-4 ring-cyan-500/30 shadow-2xl shadow-cyan-500/40 scale-105'
                        : 'bg-zinc-800/90 border-2 border-white/15'
                    }`}
                  >
                    <img
                      src={recruiterAvatar}
                      alt="Sarah Jenkins"
                      className="w-20 h-20 object-contain object-bottom translate-y-1"
                    />
                  </div>
                  <span
                    className={`absolute -bottom-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase shadow ${
                      isSpeaking
                        ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300 border border-white/15'
                    }`}
                  >
                    {isSpeaking ? '● Speaking Live' : 'AI Talent Lead'}
                  </span>
                </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Sarah Jenkins</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        AI Talent Lead
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Talent Acquisition Lead · TalentSense</p>
                  </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">Sarah Jenkins</h3>
                  <p className="text-[11px] text-cyan-300/90 font-medium">
                    Talent Acquisition Lead · ElevenLabs Neural Voice
                  </p>
                </div>

                {/* Recruiter Status Pill */}
                {isSpeaking ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5 animate-pulse">
                    <AudioEqualizer active={true} color="blue" />
                    Speaking
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60 flex items-center gap-1">
                    👂 Listening
                  </span>
                )}
                {/* 20-Bar Animated Studio Soundwave */}
                <StudioWaveform active={isSpeaking} color="cyan" volume={85} />
              </div>

              {/* Recruiter Speech Bubble */}
              <div className="my-5 flex-1 flex flex-col justify-center">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 relative space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    Question {step === 0 ? 'Consent' : step}:
              {/* Recruiter Teleprompter Speech Card */}
              <div className="my-4 flex-1 flex flex-col justify-center">
                <div className="p-4 rounded-2xl bg-black/45 border border-white/10 relative space-y-2 shadow-inner">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                      {step === 0 ? 'Consent & Disclosure Prompt' : `Question ${step} of ${questions.length}`}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">AGENT-02</span>
                  </div>
                  <p className="text-sm font-medium text-slate-100 leading-relaxed">
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    "{currentPrompt}"
                  </p>
                  {validationWarning && (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs mt-2 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-amber-400">Sarah's Answer to Your Question:</div>
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs mt-2 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-amber-300">
                        Sarah's Live Clarification:
                      </div>
                      <p className="leading-relaxed font-normal">{validationWarning}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recruiter Audio Replay Action */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {isSpeaking ? 'Speaking question aloud...' : 'Voice audio played'}
                <span className="text-[11px] text-zinc-400 font-medium">
                  {isSpeaking ? 'Streaming neural voice audio...' : 'Question spoken aloud'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    else speakText(currentPrompt);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                    isSpeaking
                      ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                  }`}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400" />}
                  {isSpeaking ? 'Stop Audio' : 'Replay Question'}
                  {isSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                  {isSpeaking ? 'Stop Audio' : 'Replay Voice'}
                </button>
              </div>
            </div>

            {/* =================================================================== */}
            {/* AVATAR CARD 2: CANDIDATE (YOU) */}
            {/* POD 2: CANDIDATE LIVE VOICE STUDIO (YOU) */}
            {/* =================================================================== */}
            <div
              className={`rounded-3xl border transition-all duration-300 p-6 flex flex-col justify-between backdrop-blur-xl ${
              className={`rounded-3xl border transition-all duration-500 p-6 flex flex-col justify-between backdrop-blur-2xl relative overflow-hidden ${
                isCandidateTurn
                  ? 'bg-slate-900/95 border-emerald-500 ring-2 ring-emerald-500/40 shadow-2xl shadow-emerald-500/20 scale-[1.01]'
                  : 'bg-slate-900/60 border-slate-800/80 shadow-lg opacity-85'
                  ? 'bg-gradient-to-b from-emerald-950/60 via-zinc-900/95 to-zinc-950/95 border-emerald-400 ring-2 ring-emerald-400/30 shadow-2xl shadow-emerald-500/20 scale-[1.01]'
                  : 'bg-zinc-900/65 border-white/10 shadow-xl opacity-90'
              }`}
            >
              {/* Candidate Header Profile */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
                <div className="flex items-center gap-3.5">
                  {/* Glowing Candidate Avatar Image */}
                  <div className="relative">
                    {isListening && (
                      <>
                        <span className="animate-ping absolute -inset-1 rounded-full bg-emerald-500 opacity-40" />
                        <span className="animate-pulse absolute -inset-2 rounded-full bg-emerald-600 opacity-20" />
                      </>
                    )}
                    <div
                      className={`relative w-16 h-16 rounded-full overflow-hidden transition-all shadow-md flex items-center justify-center ${
                        isListening
                          ? 'bg-gradient-to-tr from-emerald-900/80 to-teal-900/80 border-2 border-emerald-300 ring-4 ring-emerald-500/40'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    >
                      <img
                        src={candidateAvatar}
                        alt={brief?.name || 'Candidate'}
                        className="w-14 h-14 object-contain object-bottom translate-y-1"
              {/* Top Animated Candidate Avatar Stage + Live Mic Waveform */}
              <div className="flex flex-col items-center text-center pt-1 pb-4 border-b border-white/10 space-y-3">
                <div className="relative flex items-center justify-center">
                  {isListening && (
                    <>
                      <span className="animate-ripple-glow absolute -inset-4 rounded-full border-2 border-emerald-400/60" />
                      <span
                        className="animate-ripple-glow absolute -inset-7 rounded-full border border-teal-400/35"
                        style={{ animationDelay: '0.6s' }}
                      />
                    </div>
                    {isListening && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      </span>
                    )}
                      <span className="animate-ping absolute -inset-2 rounded-full bg-emerald-400/25" />
                    </>
                  )}
                  <div
                    className={`relative w-24 h-24 rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center ${
                      isListening
                        ? 'bg-gradient-to-tr from-emerald-900 via-teal-800 to-zinc-900 border-2 border-emerald-300 ring-4 ring-emerald-500/30 shadow-2xl shadow-emerald-500/40 scale-105'
                        : 'bg-zinc-800/90 border-2 border-white/15'
                    }`}
                  >
                    <img
                      src={candidateAvatar}
                      alt={brief?.name || 'Candidate'}
                      className="w-20 h-20 object-contain object-bottom translate-y-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{brief?.name || 'Candidate'}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Candidate
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                      {brief?.job_title || 'Applied Applicant'}
                    </p>
                  </div>
                  <span
                    className={`absolute -bottom-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase shadow ${
                      isListening
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-zinc-950'
                        : isCurrentAnswerValid
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 border border-white/15'
                    }`}
                  >
                    {isListening ? '● Mic Listening' : isCurrentAnswerValid ? '✓ Answer Ready' : 'Your Turn'}
                  </span>
                </div>

                {/* Candidate Mic Status Pill & Language Selector */}
                <div className="flex items-center gap-2">
                  {/* Language Selector Pill */}
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    {brief?.name || 'Candidate'}
                  </h3>
                  <select
                    value={speechLang}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setSpeechLang(newLang);
                      if (isListening) {
                        stopListening(false);
                        setTimeout(() => startListening(currentKey), 100);
                      }
                    }}
                    className="bg-slate-950 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    className="bg-black/50 border border-white/15 text-teal-300 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-400 cursor-pointer"
                    title="Select Speech Recognition Accent/Language"
                  >
                    <option value="en-US">🇺🇸 English (US)</option>
                    <option value="en-PK">🇵🇰 English (Pakistani)</option>
                    <option value="en-PK">🇵🇰 English (PK)</option>
                    <option value="ur-PK">🇵🇰 Urdu (اردو)</option>
                  </select>
                </div>

                  {isListening ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 animate-pulse">
                      <AudioEqualizer active={true} color="emerald" />
                      Mic Live
                    </span>
                  ) : isCurrentAnswerValid ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Recorded
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" /> Speak Answer
                    </span>
                  )}
                </div>
                {/* 20-Bar Animated Candidate Microphone Soundwave */}
                <StudioWaveform active={isListening} color="emerald" volume={Math.max(35, micVolume)} />
              </div>

              {/* Candidate Spoken Transcript & Text Area */}
              <div className="my-3 flex-1 flex flex-col justify-center space-y-2">
              <div className="my-4 flex-1 flex flex-col justify-center space-y-2.5">
                <div className="relative">
                  <textarea
                    rows={4}
                    rows={3}
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    spellCheck="false"
                    placeholder="Speak naturally into your microphone. Your spoken words appear here in real time (or you may type)..."
                    placeholder="Speak naturally into your microphone — your spoken words stream here live (or type directly)..."
                    value={answers[currentKey] || ''}
                    onChange={(e) => {
                      setAnswers({ ...answers, [currentKey]: e.target.value });
                      if (validationWarning) setValidationWarning('');
                    }}
                    className="w-full rounded-2xl bg-slate-950/80 border border-slate-700/80 p-3.5 pr-28 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans resize-none transition"
                    className="w-full rounded-2xl bg-black/50 border border-white/15 p-3.5 pr-28 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400 leading-relaxed font-sans resize-none transition shadow-inner"
                  />
                  {isListening && (
                    <span className="absolute right-3 top-3 flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-700 shadow-md">
                    <span className="absolute right-3 top-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Listening now...
                      Live STT
                    </span>
                  )}
                </div>

                {/* Quick 1-Tap Response Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-semibold text-slate-400">Quick options:</span>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] font-bold text-zinc-400">1-Tap Voice Reply:</span>
                  {getQuickSuggestions(step).map((sugg, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => {
                        setAnswers({
                          ...answers,
                          [currentKey]: sugg.text,
                        });
                        if (validationWarning) setValidationWarning('');
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-900/50 font-semibold cursor-pointer bg-blue-950/60 border border-blue-900/70 px-2 py-1 rounded-lg transition"
                      className="text-[10px] text-teal-300 hover:text-zinc-950 hover:bg-teal-400 font-bold cursor-pointer bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 rounded-lg transition"
                    >
                      {sugg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mic Control Toggle & Real Volume Bar */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    {isListening ? '🎙️ Continuous Auto-Mic' : 'Microphone paused'}
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {isListening ? '🎙️ Auto-Mic Streaming' : 'Mic Paused'}
                  </span>
                  {/* Real decibel visual indicator */}
                  {isListening && (
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden" title="Live audio input volume">
                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden" title="Live audio input volume">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{ width: `${Math.max(10, micVolume)}%` }}
                        className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-75"
                        style={{ width: `${Math.max(12, micVolume)}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Manual Clear / Retalk */}
                  {(answers[currentKey] || '').length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAnswers({ ...answers, [currentKey]: '' });
                        baseTextRef.current = '';
                        startListening(currentKey);
                      }}
                      className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                      className="text-[10px] font-bold text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer"
                      title="Clear text and re-record this question"
                    >
                      Clear & Re-talk
                      Clear
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening(true);
                      } else {
                        startListening(currentKey);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/40 shadow-rose-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40 shadow-emerald-600/20'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/40'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        Pause Mic
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        Speak / Resume Mic
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FLOATING STUDIO CALL CONTROLS DOCK (BOTTOM) */}
      {/* FLOATING GLASS STUDIO CALL CONTROLS DOCK (BOTTOM) */}
      {/* ========================================================================= */}
      <footer className="fixed bottom-4 inset-x-0 mx-auto max-w-3xl px-4 z-40 pointer-events-auto">
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3">
        <div className="bg-zinc-900/90 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3">
          {/* Previous Question Button */}
          <button
            type="button"
            disabled={step === 0 || isEndingCall}
            onClick={() => {
              stopSpeaking();
              stopListening(true);
              setValidationWarning('');
              setStep((s) => Math.max(0, s - 1));
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
            className="px-4 py-2 rounded-xl border border-white/15 text-zinc-200 text-xs font-bold hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
          >
            ← Previous
          </button>

          {/* Center Call Audio Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <span className="text-slate-400">Audio Mode:</span>
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs">
            <span className="text-zinc-400 font-medium">Studio Channel:</span>
            {isSpeaking ? (
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" /> AI Speaking
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Sarah Speaking
              </span>
            ) : isListening ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Mic className="w-3.5 h-3.5 animate-pulse" /> Candidate Mic
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 animate-pulse" /> Candidate Mic Live
              </span>
            ) : (
              <span className="text-slate-400">Ready</span>
              <span className="text-teal-300 font-semibold">Ready to Advance</span>
            )}
          </div>

          {/* Next / Finish Button */}
          <div className="flex items-center gap-2">
            {step < totalSteps - 1 ? (
              <button
                type="button"
                disabled={isEndingCall || !isCurrentAnswerValid || isEvaluating}
                onClick={handleNextStep}
                title={!isCurrentAnswerValid ? "Please speak or select an answer before moving forward" : ""}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer ${
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition cursor-pointer ${
                  isCurrentAnswerValid && !isEvaluating
                    ? 'bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/40 shadow-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 opacity-60 cursor-not-allowed'
                    ? 'bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-zinc-950 shadow-teal-500/25'
                    : 'bg-white/5 text-zinc-500 border border-white/10 opacity-60 cursor-not-allowed'
                }`}
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Reviewing Answer...
                    Checking Response...
                  </>
                ) : (
                  <>
                    <span>Confirm & Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || isEndingCall || !isCurrentAnswerValid || isEvaluating}
                onClick={handleFinishCall}
                title={!isCurrentAnswerValid ? "Please provide your availability before finishing the call" : ""}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl transition cursor-pointer ${
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xl transition cursor-pointer ${
                  isCurrentAnswerValid && !isEvaluating
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40 shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 opacity-60 cursor-not-allowed'
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-zinc-950 shadow-emerald-500/30'
                    : 'bg-white/5 text-zinc-500 border border-white/10 opacity-60 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isEndingCall
                  ? 'Saying Goodbye...'
                  : submitting
                  ? 'Submitting Responses...'
                  ? 'Saving Transcript...'
                  : isEvaluating
                  ? 'Checking Answer...'
                  : 'Finish Call & Submit'}
                  ? 'Checking Response...'
                  : 'Complete Call & Submit'}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
