import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../api/client';
import type { AnalyticsSummary } from '../types';
import {
  Activity,
  TrendingUp,
  Users,
  ShieldAlert,
  Layers,
  Database,
  Building,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const COLORS = ['#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#818cf8', '#a5b4fc', '#c7d2fe'];

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [dbStatus, setDbStatus] = useState({ online: true, mode: 'Memory Store' });

  useEffect(() => {
    api.analytics().then(setData);
    api.health().then((h) => {
      setDbStatus({
        online: true,
        mode: h.demoMode ? 'In-Memory (Demo Mode)' : 'Google Cloud Firestore'
      });
    });
  }, []);

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <Activity className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
        <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest animate-pulse">Aggregating Admin Metrics...</div>
      </div>
    );
  }

  const deptData = Object.entries(data.departmentDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const symptomData = Object.entries(data.symptomFrequency).map(([name, value]) => ({
    name,
    value,
  }));

  const severityData = Object.entries(data.severityBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  const trafficData = Object.entries(data.trafficByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="glass rounded-3xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-black tracking-tight">Clinical Operations Center</h2>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-extrabold uppercase tracking-wider animate-pulse">
              SYSTEM LIVE
            </span>
          </div>
          <p className="text-xs text-indigo-200 mt-1 font-semibold flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-400" /> Automated Clinical Analytics Dashboard • Real-time Triage Streams
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/15 text-xs font-semibold shrink-0">
          <Database className="w-4 h-4 text-indigo-300" />
          <div className="space-y-0.5">
            <div className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider leading-none">Database Registry</div>
            <div className="text-slate-100 flex items-center gap-1 font-black">
              {dbStatus.mode} <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Triage Stats Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Admissions"
          value={String(data.totalCases)}
          icon={<Users className="w-5 h-5" />}
          description="Total patient intake files in database"
        />
        <StatCard
          label="Emergency Priority"
          value={`${data.emergencyPercentage}%`}
          icon={<ShieldAlert className="w-5 h-5" />}
          highlight
          description="Percentage of emergency triage cases"
        />
        <StatCard
          label="Active Services"
          value={String(deptData.length)}
          icon={<Building className="w-5 h-5" />}
          description="Routed hospital specialty clinics"
        />
        <StatCard
          label="Reported Symptoms"
          value={String(symptomData.length)}
          icon={<Layers className="w-5 h-5" />}
          description="Total tracked clinical complaints"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Specialty Department Distribution" icon={<Building className="w-4.5 h-4.5 text-indigo-500" />}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={deptData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 10, fontWeight: 'bold' }}>
                {deptData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Reported Symptoms Frequency" icon={<Layers className="w-4.5 h-4.5 text-indigo-500" />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={symptomData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fontWeight: 'bold' }} />
              <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]}>
                {symptomData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Triage Severity Breakdown" icon={<ShieldAlert className="w-4.5 h-4.5 text-indigo-500" />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {severityData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Patient Traffic Trends" icon={<TrendingUp className="w-4.5 h-4.5 text-indigo-500" />}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold', borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Systems Data Storage & RAG Info panel */}
      <div className="glass rounded-3xl p-6 bg-white border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-display font-black text-slate-800 text-sm flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-650" /> Clinical Data Store & RAG Database architecture
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6 text-xs text-slate-655 font-semibold leading-relaxed">
          <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Database className="w-4 h-4 text-slate-500" /> Where is patient data stored?
            </h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>
                <span className="text-slate-800 font-bold">Local Store (Demo Mode):</span> Sessions are managed instantly in-memory via JS Map structures inside <code className="bg-slate-200 px-1 rounded">firestore.ts</code>. It resets on server restart, making dev quick and fully offline.
              </li>
              <li>
                <span className="text-slate-800 font-bold">Google Cloud Firestore:</span> In production (<code className="bg-slate-200 px-1 rounded">DEMO_MODE=false</code>), patient intakes are permanently stored in secure, HIPAA-compliant Cloud Firestore collections.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <CheckCircle2 className="w-4 h-4 text-slate-500" /> What clinical dataset is used for triage?
            </h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>
                <span className="text-slate-800 font-bold">Medical Guidelines Dataset:</span> The system runs on a highly structured symptom database at <code className="bg-slate-200 px-1 rounded">clinical-guidelines.json</code> (Abdominal pain, Chest pain, UTI, Allergic Reactions, Pediatric Fever, OBGYN, etc.).
              </li>
              <li>
                <span className="text-slate-800 font-bold">Semantic Search (RAG):</span> Patient messages are embedded and matched against these guidelines using Pinecone (or local mock cosine similarity) to identify critical red flags and specialist routing.
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-2xl text-xs text-sky-850 flex gap-2">
          <AlertCircle className="w-5 h-5 text-sky-650 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Enterprise BigQuery Streaming:</span> Clinical admissions also stream dynamically to Google BigQuery under dataset <code className="bg-sky-100 px-1 rounded">healthcare_analytics.intake_events</code> using GCP connectors to support advanced reporting and Looker Studio BI visual charts.
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  description,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`glass rounded-2xl p-5 border transition-all duration-300 transform hover:scale-101 hover:shadow-md ${
        highlight ? 'ring-1 ring-red-200 bg-gradient-to-br from-red-50/40 to-slate-50/30' : 'bg-white'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{label}</div>
          <div className={`text-3xl font-black mt-1 ${highlight ? 'text-red-655' : 'text-slate-800'}`}>
            {value}
          </div>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
          highlight ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-indigo-650'
        }`}>
          {icon}
        </div>
      </div>
      <p className="text-[10px] text-slate-500 font-semibold mt-2">{description}</p>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 bg-white border border-slate-150 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
        {icon}
        <h3 className="font-display font-black text-slate-800 text-xs uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}
