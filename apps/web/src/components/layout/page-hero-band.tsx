/** Compact / full hero band — same visual language as the marketing home page. */
import type { ReactNode } from 'react';
import { PAGE_CONTAINER_CLASS } from './page-container';
import { cn } from '@/lib/utils';

export const MARKETING_HERO_BG_URL = 'https://cdn.conzex.com/bg/dc.jpg';

export type PageHeroBandProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  size?: 'compact' | 'large';
  align?: 'center' | 'left';
  children?: ReactNode;
  className?: string;
};

export default function PageHeroBand({
  title,
  subtitle,
  badge,
  size = 'compact',
  align = 'center',
  children,
  className,
}: PageHeroBandProps) {
  const py = size === 'large' ? 'py-20 sm:py-28 lg:py-32' : 'py-10 sm:py-12 lg:py-14';

  return (
    <section className={cn('relative text-white overflow-hidden bg-dell-dark shrink-0', className)}>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${MARKETING_HERO_BG_URL})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-dell-dark/80" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-br from-dell-blue/85 via-dell-blue/65 to-dell-dark/95"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />
      <div className={cn('relative', PAGE_CONTAINER_CLASS, py)}>
        <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
          {badge}
          <h1
            className={cn(
              'font-bold tracking-tight leading-tight text-white',
              size === 'large' ? 'text-3xl sm:text-4xl lg:text-5xl mb-5' : 'text-2xl sm:text-3xl mb-2',
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'text-white/70 leading-relaxed',
                size === 'large' ? 'text-base sm:text-lg max-w-2xl mx-auto mb-8' : 'text-sm sm:text-base max-w-2xl',
                align === 'center' && subtitle && size !== 'large' && 'mx-auto',
              )}
            >
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

/** Bottom-of-page CTA strip matching the home page. */
export function MarketingCtaBand({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="relative bg-gradient-to-br from-dell-blue to-dell-dark text-white overflow-hidden shrink-0">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />
      <div className={cn('relative', PAGE_CONTAINER_CLASS, 'py-14 sm:py-16 text-center')}>
        <div className="max-w-lg mx-auto">
          <h2 className="text-lg sm:text-xl font-bold mb-2">{title}</h2>
          {subtitle && <p className="text-sm text-white/70 mb-6">{subtitle}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
