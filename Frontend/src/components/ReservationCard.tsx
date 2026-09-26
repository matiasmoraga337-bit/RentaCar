import type { ReactNode } from 'react';

import { StatusBadge } from './StatusBadge';

export interface ReservationMetaItem {
  label: string;
  value: ReactNode;
}

interface ReservationCardProps {
  title: string;
  plate?: string | null;
  status: string;
  confirmed?: boolean;
  meta: ReservationMetaItem[];
  actions?: ReactNode;
  children?: ReactNode;
}

export function ReservationCard({ title, plate, status, confirmed, meta, actions, children }: ReservationCardProps) {
  return (
    <article className={`reservation-card ${confirmed ? 'confirmed' : ''}`.trim()}>
      <header className="reservation-header">
        <div>
          <strong>{title}</strong>
          {plate && <span className="reservation-plate">{plate}</span>}
        </div>
        <StatusBadge status={status} />
      </header>
      <dl className="reservation-meta">
        {meta.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {actions && <div className="reservation-actions">{actions}</div>}
      {children}
    </article>
  );
}