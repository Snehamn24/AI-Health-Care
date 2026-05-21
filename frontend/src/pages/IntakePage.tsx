import { useCallback, useEffect, useState } from 'react';
import { Send, Volume2, VolumeX, Save, X, User, Phone } from 'lucide-react';
import { api } from '../api/client';
import type { IntakeSession } from '../types';
import { ChatPanel } from '../components/ChatPanel';
import { VoiceInput } from '../components/VoiceInput';
import { TriagePanel } from '../components/TriagePanel';

const QUICK_PROMPTS = [
  "My name is Sarah Chen, I'm 45 years old, female",
  'I have diabetes and take metformin. No allergies.',
  'I have chest pain and shortness of breath for 2 days, with sweating',
  'I have had fever and cough for 3 days',
  'Severe headache with dizziness since this morning',
];

export default function IntakePage() {
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [demoMode, setDemoMode] = useState(true);

  // Save conversation state
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', phone: '' });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [savedAlready, setSavedAlready] = useState(false);

  useEffect(() => {
    api.health().then((h) => setDemoMode(h.demoMode));
    initSession();
  }, []);

  // Show save prompt when intake completes
  useEffect(() => {
    if (session?.phase === 'complete' && !savedAlready && !showSavePrompt) {
      const timer = setTimeout(() => setShowSavePrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [session?.phase, savedAlready, showSavePrompt]);

  const initSession = async () => {
    setLoading(true);
    setSavedAlready(false);
    setShowSavePrompt(false);
    setSaveStatus(null);
    try {
      const s = await api.createSession();
      setSession(s);
    } finally {
      setLoading(false);
    }
  };

  const speakReply = useCallback(async (text: string) => {
    if (!voiceEnabled) return;
    try {
      const { audioContent } = await api.synthesize(text.replace(/\*\*/g, ''));
      if (!audioContent) return;
      const audio = new Audio(`data:audio/mpeg;base64,${audioContent}`);
      await audio.play();
    } catch {
      /* TTS optional in demo */
    }
  }, [voiceEnabled]);

  const send = async (text: string) => {
    if (!session || !text.trim() || loading) return;
    setInput('');
    setLoading(true);
    const optimistic = {
      ...session,
      messages: [
        ...session.messages,
        { role: 'user' as const, content: text, timestamp: new Date().toISOString() },
      ],
    };
    setSession(optimistic);

    try {
      const result = await api.sendMessage(session.id, text);
      setSession(result.session);
      if (voiceEnabled) await speakReply(result.reply);
    } catch (e) {
      alert((e as Error).message);
      setSession(session);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    const { transcript } = await api.transcribe(blob);
    if (transcript.startsWith('[Demo mode]')) {
      const manual = prompt(
        'Demo mode: Speech-to-Text requires GCP. Enter what you said (or cancel):',
        ''
      );
      return manual || '';
    }
    return transcript;
  };

  const handleSaveConversation = async () => {
    if (!session || !saveForm.name.trim() || !saveForm.phone.trim()) {
      setSaveStatus('Please enter both name and phone number.');
      return;
    }
    try {
      const regResult = await api.patientRegister({
        name: saveForm.name.trim(),
        phone: saveForm.phone.trim(),
      });
      if (regResult.success && regResult.patient) {
        await api.saveSessionToPatient(session.id, regResult.patient.id);
        setSaveStatus(`✅ Conversation saved! ${regResult.message || 'View your visit history from the Patient Portal.'}`);
        setSavedAlready(true);
        setTimeout(() => setShowSavePrompt(false), 3000);
      } else {
        setSaveStatus(regResult.error || 'Failed to save.');
      }
    } catch (err) {
      setSaveStatus((err as Error).message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {demoMode && (
        <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Demo mode active — Gemini, Firestore, and Speech use intelligent local fallbacks. Set{' '}
          <code className="bg-amber-100 px-1 rounded">DEMO_MODE=false</code> and GCP credentials for
          production.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        <div className="lg:col-span-2 flex flex-col glass rounded-2xl overflow-hidden min-h-[500px]">
          <div className="px-4 py-3 border-b border-slate-200/80 flex justify-between items-center bg-white/50">
            <div>
              <h2 className="font-semibold text-slate-800">Patient Intake Conversation</h2>
              <p className="text-xs text-slate-500">
                Speak or type naturally — AI conducts registration, symptoms, and triage
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              title="Toggle AI voice responses"
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          <ChatPanel messages={session?.messages || []} loading={loading} onSendOption={send} />

          <div className="p-3 border-t border-slate-200/80 bg-white/50">
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  disabled={loading}
                  className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-care-50 text-slate-600 hover:text-care-800 transition truncate max-w-[200px]"
                >
                  {p.slice(0, 40)}…
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <VoiceInput
                disabled={loading}
                onTranscribe={handleTranscribe}
                onTranscript={(t) => t && send(t)}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe symptoms, answer questions..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-care-500 focus:border-transparent outline-none text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-3 bg-care-600 text-white rounded-xl hover:bg-care-700 disabled:opacity-50 transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        <div className="min-h-0 h-full">
          <TriagePanel session={session} />
        </div>
      </div>

      {/* ─── Save Conversation Modal ─── */}
      {showSavePrompt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
            <button
              onClick={() => { setShowSavePrompt(false); setSavedAlready(true); }}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <Save className="w-10 h-10 text-indigo-600 mx-auto" />
              <h3 className="text-lg font-black text-slate-800">Save Your Visit Record?</h3>
              <p className="text-xs text-slate-500">
                Register with your name and phone number to save this consultation.
                You can view your visit history anytime from the <strong>Patient Portal</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
                <User className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                  placeholder="Your full name"
                  className="flex-1 text-sm outline-none"
                />
              </div>
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
                <Phone className="w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={saveForm.phone}
                  onChange={(e) => setSaveForm({ ...saveForm, phone: e.target.value })}
                  placeholder="Phone number"
                  className="flex-1 text-sm outline-none"
                />
              </div>
            </div>

            {saveStatus && (
              <p className={`text-xs font-semibold text-center ${saveStatus.startsWith('✅') ? 'text-emerald-600' : 'text-red-600'}`}>
                {saveStatus}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowSavePrompt(false); setSavedAlready(true); }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50"
              >
                Skip
              </button>
              <button
                onClick={handleSaveConversation}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow"
              >
                Save My Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
