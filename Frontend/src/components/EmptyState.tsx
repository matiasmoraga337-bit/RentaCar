interface EmptyStateProps {
  title: string;
  copy?: string;
  compact?: boolean;
}

export function EmptyState({ title, copy, compact }: EmptyStateProps) {
  return (
    <div className={`empty-state ${compact ? 'compact-empty' : ''}`.trim()}>
      <span>✦</span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}