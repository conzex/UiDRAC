/**
 * @file empty-state.tsx
 * @description Empty state placeholder component.
 *              Shown when a list, table, or detail view has no data to
 *              display — e.g. "No servers added yet" or "No log entries".
 */

import { type ReactNode } from "react";
import { cn } from "../lib/utils";

export interface EmptyStateProps {
  /** Headline message (e.g. "No servers found") */
  title: string;
  /** Supporting description text */
  description?: string;
  /** Illustrative icon or image rendered above the title */
  icon?: ReactNode;
  /** Call-to-action element (button, link) */
  action?: ReactNode;
  className?: string;
}

/**
 * Centred empty-state placeholder.
 *
 * Provides a consistent, branded treatment for every "nothing here yet"
 * scenario, with optional icon, description, and CTA.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-1 text-slate-300" aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className="text-base font-semibold text-slate-700">{title}</h3>

      {description && (
        <p className="max-w-sm text-sm text-slate-500">{description}</p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
