import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children?: ReactNode;
}

export function SectionHeading({ title, subtitle, eyebrow, children }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      {eyebrow ? (
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          {subtitle && <span>{subtitle}</span>}
        </div>
      ) : (
        <>
          <h2>{title}</h2>
          {subtitle && <span>{subtitle}</span>}
        </>
      )}
      {children}
    </div>
  );
}