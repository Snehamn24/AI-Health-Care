import type { UrgencyLevel } from '../types';

const styles: Record<UrgencyLevel, string> = {
  emergency: 'bg-red-100 text-red-800 border-red-200',
  urgent: 'bg-orange-100 text-orange-800 border-orange-200',
  high: 'bg-amber-100 text-amber-800 border-amber-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${styles[level]}`}>
      {level}
    </span>
  );
}
