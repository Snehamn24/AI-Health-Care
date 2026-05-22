import { useState } from 'react';
import { api } from '../api/client';
import type { PatientAccount } from '../api/client';
import {
  User, Phone, LogIn, Clock, AlertTriangle, CheckCircle2,
  FileText, ArrowLeft, Pill, Stethoscope, Eye, Calendar, ClipboardList
} from 'lucide-react';

interface VisitRecord {
  id: string;
  phase: string;
  profile: any;
  symptoms: any;
  messages: any[];
  triage: any;
  clinicianHandoff: any;
  doctorSuggestion: any;
  treatmentPlan: string[] | null;
  approvalStatus: string;
  doctorViewed: boolean;
  doctorViewedAt: string | null;
  prescription: {
    doctorName: string;
    department: string;
    date: string;
    medicines: { name: string; dose: string; frequency: string; duration: string; instructions?: string }[];
    generalInstructions: string;
    generatedAt: string;
  } | null;
  clinicalNotes: {
    patientSummary: string;
    conditionVerified: string;
    followUpRequired: boolean;
    followUpDate: string | null;
    followUpReason: string | null;
    priority: string;
    additionalNotes: string;
    completedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function PatientPortalPage() {
  const [patient, setPatient] = useState<PatientAccount | null>(null);
  const [history, setHistory] = useState<VisitRecord[]>([]);
  const [loginForm, setLoginForm] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!loginForm.name.trim() || !loginForm.phone.trim()) {
      setError('Please enter both name and phone number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.patientLogin(loginForm.name.trim(), loginForm.phone.trim());
      if (res.success && res.patient) {
        setPatient(res.patient);
        // Load visit history
        const visits = await api.getPatientHistory(res.patient.id);
        setHistory(visits);
      } else {
        setError(res.error || 'Login failed.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'rejected': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  // Login screen
  if (!patient) {
    return (
      <div className="min-h-[calc(100vh-130px)] flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Patient Portal</h2>
            <p className="text-sm text-slate-500">
              Login with your registered name and phone number to view your visit history.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 border rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-indigo-500">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={loginForm.name}
                onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                placeholder="Your registered full name"
                className="flex-1 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-2 border rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-indigo-500">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="tel"
                value={loginForm.phone}
                onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
                placeholder="Phone number"
                className="flex-1 text-sm outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Loading...' : 'View My Records'}
          </button>

          <p className="text-[10px] text-center text-slate-400">
            Don't have an account? Complete a consultation via <strong>AI Intake</strong> and save your visit.
          </p>
        </div>
      </div>
    );
  }

  // Dashboard screen
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Welcome, {patient.name}</h2>
          <p className="text-xs text-slate-500">Phone: {patient.phone} • Patient since: {new Date(patient.created_at).toLocaleDateString()}</p>
        </div>
        <button
          onClick={() => setPatient(null)}
          className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl border flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Visit History */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" /> Visit History ({history.length} records)
        </h3>

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-slate-400 text-sm">
            No visit records found. Complete a consultation via <strong>AI Intake</strong> and save your visit.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((visit) => (
              <div key={visit.id} className="bg-white rounded-2xl border overflow-hidden">
                <button
                  onClick={() => setExpandedVisit(expandedVisit === visit.id ? null : visit.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(visit.approvalStatus)}
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-800">
                        {visit.symptoms?.symptoms?.join(', ') || 'Consultation'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(visit.createdAt).toLocaleDateString()} • {new Date(visit.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {visit.doctorViewed && (
                      <span className="text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Doctor Reviewed
                      </span>
                    )}
                    {visit.triage && (
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {visit.triage.department}
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                      visit.approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      visit.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {visit.approvalStatus === 'approved' ? 'Reviewed' : visit.approvalStatus === 'rejected' ? 'Needs Followup' : 'Under Review'}
                    </span>
                  </div>
                </button>

                {expandedVisit === visit.id && (
                  <div className="border-t p-4 bg-slate-50 space-y-3">
                    {/* Conversation transcript */}
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Conversation</h5>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {visit.messages?.map((msg: any, i: number) => (
                          <div key={i} className={`text-xs p-2 rounded-lg ${
                            msg.role === 'user' ? 'bg-indigo-50 text-indigo-800 ml-8' : 'bg-white text-slate-700 mr-8 border'
                          }`}>
                            <span className="font-bold text-[9px] uppercase text-slate-400">{msg.role}: </span>
                            {msg.content}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Triage summary */}
                    {visit.triage && (
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-1">AI Triage Result</h5>
                        <p className="text-xs text-slate-600">{visit.triage.reasoning}</p>
                      </div>
                    )}

                    {/* Clinician Handoff */}
                    {visit.clinicianHandoff && (
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Clinical Summary</h5>
                        <p className="text-xs text-slate-600">{visit.clinicianHandoff.summary}</p>
                      </div>
                    )}

                    {/* Possible Concerns */}
                    {visit.clinicianHandoff?.possibleConcerns?.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> Possible Concerns
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {visit.clinicianHandoff.possibleConcerns.map((c: string, i: number) => (
                            <span key={i} className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescribed Treatment Plan */}
                    {visit.treatmentPlan && visit.treatmentPlan.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
                        <h5 className="text-[10px] font-bold text-indigo-700 uppercase flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-indigo-600" /> Prescribed Treatment Plan
                        </h5>
                        <div className="space-y-1.5">
                          {visit.treatmentPlan.map((step: string, idx: number) => (
                            <div key={idx} className="flex gap-2 text-xs text-slate-700">
                              <span className="text-indigo-600 font-black shrink-0">{idx + 1}.</span>
                              <span className="font-semibold">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescription Card — visible to patient after consultation */}
                    {visit.prescription && (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <h5 className="text-[11px] font-black text-emerald-800 uppercase flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-emerald-600" /> Prescription
                          <span className="ml-auto text-[9px] font-bold text-emerald-600 normal-case">Dr. {visit.prescription.doctorName} • {visit.prescription.date}</span>
                        </h5>
                        {/* Medicines Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-emerald-200">
                                <th className="text-left text-[9px] font-black text-emerald-700 uppercase py-1 pr-2">Medicine</th>
                                <th className="text-left text-[9px] font-black text-emerald-700 uppercase py-1 pr-2">Dose</th>
                                <th className="text-left text-[9px] font-black text-emerald-700 uppercase py-1 pr-2">Frequency</th>
                                <th className="text-left text-[9px] font-black text-emerald-700 uppercase py-1">Duration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-100">
                              {visit.prescription.medicines.map((med: any, i: number) => (
                                <tr key={i}>
                                  <td className="py-1.5 pr-2 font-bold text-slate-800">{med.name}</td>
                                  <td className="py-1.5 pr-2 text-slate-600">{med.dose}</td>
                                  <td className="py-1.5 pr-2 text-slate-600">{med.frequency}</td>
                                  <td className="py-1.5 text-slate-600">{med.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {visit.prescription.generalInstructions && (
                          <p className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/60 px-3 py-2 rounded-lg">
                            📋 {visit.prescription.generalInstructions}
                          </p>
                        )}
                        {/* Follow-up Date */}
                        {visit.clinicalNotes?.followUpRequired && visit.clinicalNotes?.followUpDate && (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <p className="text-[10px] font-bold text-amber-800">
                              Next Follow-up: <span className="font-black">{new Date(visit.clinicalNotes.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {visit.clinicianHandoff?.recommendedActions?.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-emerald-500" /> Recommended Actions
                        </h5>
                        <ul className="list-disc pl-4 text-xs font-semibold text-slate-600 space-y-0.5">
                          {visit.clinicianHandoff.recommendedActions.map((a: string, i: number) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Doctor Suggestion */}
                    {visit.doctorSuggestion && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1">
                        <h5 className="text-[10px] font-bold text-emerald-700 uppercase">Assigned Doctor</h5>
                        <p className="text-xs font-semibold text-slate-700">
                          Dr. {visit.doctorSuggestion.doctorName} • {visit.doctorSuggestion.specialty} • Floor {visit.doctorSuggestion.floor}, Room {visit.doctorSuggestion.room}
                        </p>
                        {visit.doctorSuggestion.appointmentTime && (
                          <p className="text-[10px] text-slate-500">Appointment: {visit.doctorSuggestion.appointmentTime}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
