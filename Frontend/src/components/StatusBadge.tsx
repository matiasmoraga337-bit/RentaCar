interface StatusBadgeProps {
  status: string;
  variant?: 'badge' | 'pill';
}

export function StatusBadge({ status, variant = 'badge' }: StatusBadgeProps) {
  const normalize = status.toLowerCase().replace(/\s+/g, '-');
  if (variant === 'pill') {
    return <span className={`state-pill badge-${normalize}`}>{status}</span>;
  }
  return <span className={`status-badge status-${normalize}`}>{status}</span>;
}