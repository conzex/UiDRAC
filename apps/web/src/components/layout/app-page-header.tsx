/** Standard in-app page title block (matches marketing typography scale). */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AppPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  actions?: ReactNode;
};

export default function AppPageHeader({ title, description, className, actions }: AppPageHeaderProps) {
  return (
    <div className={cn('mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions ? <div className="shrink-0 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
