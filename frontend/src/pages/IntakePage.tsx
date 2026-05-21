import { useCallback, useEffect, useState } from 'react';
import { Send, Volume2, VolumeX } from 'lucide-react';
import { api } from '../api/client';
import type { IntakeSession } from '../types';
import { ChatPanel } from '../components/ChatPanel';
import { VoiceInput } from '../components/VoiceInput';
import { TriagePanel } from '../components/TriagePanel';
import { WorkflowPanel } from '../components/WorkflowPanel';

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

  useEffect(() => {
    api.health().then((h) => setDemoMode(h.demoMode));
    initSession();
  }, []);

  const initSession = async () => {
    setLoading(true);
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

        <div className="flex flex-col gap-0 min-h-0">
          <TriagePanel session={session} />
          <WorkflowPanel sessionId={session?.id ?? null} />
        </div>
      </div>
    </div>
  );
}
