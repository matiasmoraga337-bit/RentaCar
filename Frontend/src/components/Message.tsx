import type { ReactNode } from 'react';

interface MessageProps {
  tone: 'error' | 'success';
  children: ReactNode;
  className?: string;
}

export function Message({ tone, children, className }: MessageProps) {
  const classes = [`${tone === 'error' ? 'form-error' : 'success-message'}`, className].filter(Boolean).join(' ');
  return <p className={classes} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>;
}