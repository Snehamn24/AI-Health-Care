import { useState, useEffect } from 'react';
import { AlertTriangle, Building2, FileText, Shield, User, MapPin, Calendar, CheckCircle2, Send, Loader2 } from 'lucide-react';
import type { IntakeSession } from '../types';
import { UrgencyBadge } from './UrgencyBadge';
import { api } from '../api/client';

export function TriagePanel({ session }: { session: IntakeSession | null }) {
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState(false);

  useEffect(() => {
    if (session?.doctorSuggestion?.infoSentToDoctor) {
      setSentStatus(true);
    } else {
      setSentStatus(false);
    }
  }, [session?.doctorSuggestion]);

  const handleSendToDoctor = async () => {
    if (!session?.id) return;
    setSending(true);
    try {
      const res = await api.sendToDoctor(session.id);
      if (res.success) {
        setSentStatus(true);
        alert(`Patient medical record successfully transmitted to ${session.doctorSuggestion?.doctorName}'s clinic workstation.`);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (!session?.triage && !session?.structuredIntake) {
    return (
      <div className="glass rounded-2xl p-6 h-full">
        <h3 className="font-semibold text-slate-800 mb-2">Live Triage Status</h3>
        <p className="text-sm text-slate-500">
          Complete the conversational intake to see routing, urgency, and clinician handoff notes.
        </p>
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-slate-400 uppercase">Phase</div>
          <div className="text-sm capitalize text-care-700 font-medium">
            {session?.phase || 'starting'}
          </div>
          {session?.fieldsCollected && session.fieldsCollected.length > 0 && (
            <>
              <div className="text-xs font-medium text-slate-400 uppercase mt-3">Collected</div>
              <div className="flex flex-wrap gap-1">
                {session.fieldsCollected.map((f) => (
                  <span key={f} className="text-xs bg-care-50 text-care-700 px-2 py-0.5 rounded">
                    {f}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const triage = session.triage!;
  const structured = session.structuredIntake!;
  const handoff = session.clinicianHandoff;

  return (
    <div className="glass rounded-2xl p-6 h-full overflow-y-auto space-y-5">
      <div>
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-care-600" />
          Triage Result
        </h3>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <UrgencyBadge level={triage.urgency} />
          {triage.safetyOverride && (
            <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100">
              Safety override
            </span>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 p-3 bg-care-50 rounded-xl">
        <Building2 className="w-5 h-5 text-care-600 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs text-slate-500">Department</div>
          <div className="font-semibold text-care-900">{triage.department}</div>
        </div>
      </div>

      {session.doctorSuggestion && (
        <div className="p-4 bg-gradient-to-br from-care-50 to-care-100/50 border border-care-200/60 rounded-2xl space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-care-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-care-600" />
              Specialist Match
            </h4>
            {sentStatus ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Sent to Doctor
              </span>
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                Draft
              </span>
            )}
          </div>
          <div>
            <div className="font-bold text-care-950 text-base">{session.doctorSuggestion.doctorName}</div>
            <div className="text-xs text-care-700 font-medium">{session.doctorSuggestion.specialty}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-care-200/40 text-xs">
            <div className="space-y-0.5">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <MapPin className="w-3 h-3 text-slate-400" /> Location
              </div>
              <div className="font-semibold text-slate-700">
                Floor {session.doctorSuggestion.floor}, Room {session.doctorSuggestion.room}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                {session.doctorSuggestion.hospitalLocation}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Calendar className="w-3 h-3 text-slate-400" /> Appointment
              </div>
              <div className="font-semibold text-slate-700">
                {session.doctorSuggestion.appointmentTime}
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={handleSendToDoctor}
              disabled={sending}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                sentStatus
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-care-600 hover:bg-care-700 text-white'
              }`}
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : sentStatus ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Info Transmitted (Resend)
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Transmit Info to Doctor
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {structured.symptoms.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">Symptoms</div>
          <div className="flex flex-wrap gap-1">
            {structured.symptoms.map((s) => (
              <span key={s} className="text-xs bg-white border px-2 py-1 rounded-lg">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {triage.redFlags.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex items-center gap-2 text-red-800 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Red Flags
          </div>
          <ul className="mt-2 text-xs text-red-700 list-disc list-inside">
            {triage.redFlags.map((f) => (
              <li key={f}>{f.replace(/_/g, ' ')}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-slate-600 leading-relaxed border-t pt-3">{triage.reasoning}</div>

      {handoff && (
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
            <FileText className="w-4 h-4" />
            Clinician Handoff
          </div>
          <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-xl border">
            {handoff.summary}
          </p>
          <ul className="mt-2 space-y-1">
            {handoff.recommendedActions.map((a, i) => (
              <li key={i} className="text-xs text-care-800 flex items-start gap-1">
                <span className="text-care-500">→</span> {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
