/** Shared layout width and padding — use for all page-level horizontal boundaries. */
import { cn } from '@/lib/utils';

/** Standard app/marketing content container (1440px max). */
export const PAGE_CONTAINER_CLASS = 'max-w-layout mx-auto w-full px-3 sm:px-5';

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
};

export default function PageContainer({ children, className, as: Tag = 'div' }: PageContainerProps) {
  return <Tag className={cn(PAGE_CONTAINER_CLASS, className)}>{children}</Tag>;
}
