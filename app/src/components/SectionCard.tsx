import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  highlight?: boolean;
};

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  id,
  highlight,
}: Props) {
  return (
    <section
      id={id}
      className={`card section-card${highlight ? ' section-card--highlight' : ''} ${className}`.trim()}
    >
      <div className="section-card__head">
        <div>
          <h2 className="section-card__title">{title}</h2>
          {subtitle && <p className="section-card__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="section-card__actions cluster">{actions}</div>}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
