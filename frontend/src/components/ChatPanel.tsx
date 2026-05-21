import { useEffect, useRef } from 'react';
import { Bot, User, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendOption?: (text: string) => void;
}

export function ChatPanel({ messages, loading, onSendOption }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isLastAssistant = lastMessage && lastMessage.role === 'assistant';

  // Helper to determine which quick options to display
  const getQuickOptions = () => {
    if (!isLastAssistant || loading || !onSendOption) return null;
    const content = lastMessage.content.toLowerCase();

    // 1. Gender Selection Question
    if (content.includes('full name, age, and gender?') || content.includes('tell me your gender') || content.includes('your gender?')) {
      return [
        { label: '♂️ Male', value: 'Male' },
        { label: '♀️ Female', value: 'Female' },
        { label: '⚪ Other / Prefer not to say', value: 'Other' }
      ];
    }

    // 2. Optional Health Profile Skip Question
    if (content.includes('medical conditions') || content.includes('medications, or allergies') || content.includes('prefer to skip')) {
      return [
        { label: '❌ Skip background questions', value: 'skip' },
        { label: '📝 No medical conditions or allergies', value: 'no' },
        { label: '🩺 Has diabetes & metformin', value: 'I have diabetes and take metformin.' },
        { label: '🥜 Has peanut allergy', value: 'I have allergy to peanuts.' }
      ];
    }

    // 3. Symptoms Description Question
    if (content.includes('describe your main symptoms') || content.includes('about your symptoms') || content.includes('how long you have had them')) {
      return [
        { label: 'Chest Pain with Sweating ⚠️', value: 'I have severe chest pain and shortness of breath with sweating' },
        { label: 'Sudden high fever & cough 🤒', value: 'I have had a high fever of 103 and a cough for 3 days' },
        { label: 'Severe headache 🤕', value: 'I have a severe crushing headache since this morning' },
        { label: 'General checkup / None', value: 'No symptoms, just checking in for a routine exam.' }
      ];
    }

    return null;
  };

  const options = getQuickOptions();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-care-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-care-600 text-white rounded-tr-sm font-semibold'
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm font-semibold'
            }`}
          >
            {m.content.split(/\*\*(.*?)\*\*/g).map((part, j) =>
              j % 2 === 1 ? <strong key={j} className="text-care-850 font-black">{part}</strong> : part
            )}
          </div>
        </div>
      ))}

      {/* Render Dynamic Click-to-Select Option Pills */}
      {options && (
        <div className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 max-w-[90%] ml-11 transition-all duration-300 animate-fade-in animate-bounce-subtle">
          <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" /> Quick Select Triage Options
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendOption?.(opt.value)}
                className="text-xs font-bold px-3 py-2 bg-white hover:bg-care-50 border hover:border-care-300 text-slate-700 hover:text-care-900 rounded-xl transition-all shadow-2xs hover:shadow-sm transform active:scale-95 flex items-center gap-1 shrink-0"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
            <Bot className="w-4 h-4 text-slate-500 animate-pulse" />
          </div>
          <div className="bg-white border rounded-2xl px-4 py-3 text-sm text-slate-500 font-semibold shadow-2xs">
            CareAssist is thinking...
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
