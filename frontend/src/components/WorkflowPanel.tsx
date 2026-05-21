import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import type { WorkflowExplain } from '../types';

export function WorkflowPanel({ sessionId }: { sessionId: string | null }) {
  const [workflow, setWorkflow] = useState<WorkflowExplain | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    api.explainWorkflow(sessionId).then(setWorkflow).catch(() => {});
    const interval = setInterval(() => {
      api.explainWorkflow(sessionId).then(setWorkflow).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <div className="glass rounded-2xl p-4 mt-4">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Explainable AI Workflow
      </h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {workflow?.steps.map((s) => (
          <div key={s.step} className="flex items-center gap-2 text-xs">
            {s.status === 'complete' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
            ) : s.status === 'active' ? (
              <Loader2 className="w-3.5 h-3.5 text-care-600 animate-spin shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            )}
            <span className="text-slate-700">{s.name}</span>
          </div>
        )) || (
          <p className="text-xs text-slate-400">Loading workflow...</p>
        )}
      </div>
    </div>
  );
}
