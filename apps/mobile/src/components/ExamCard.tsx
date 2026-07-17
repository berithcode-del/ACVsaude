import type { ReactNode } from 'react';

interface ExamCardProps {
  children: ReactNode;
}

export function ExamCard({ children }: ExamCardProps) {
  return (
    <div
      className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm flex-1 flex flex-col"
      role="region"
      aria-label="Área do optotipo"
    >
      {children}
    </div>
  );
}
