import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  tone?: 'green' | 'blue' | 'gray' | 'orange' | 'red' | 'ink';
  footnote?: string;
}

export function StatCard({ label, value, tone = 'ink', footnote }: StatCardProps) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {footnote ? <small>{footnote}</small> : null}
    </article>
  );
}
