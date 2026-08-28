import { FileX2, ListChecks } from 'lucide-react';

import { findTool } from '../../lib/tools';
import type { FormInspection } from '../../types';
import { Skeleton } from '../ui/Skeleton';
import { ToolPanel } from './ToolPanel';

interface FormFillPanelProps {
  form: FormInspection | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function FormFillPanel({ form, isLoading, isError }: FormFillPanelProps) {
  const unsupportedCount = form?.fields.filter((field) => field.type === 'unsupported').length ?? 0;

  return (
    <ToolPanel tool={findTool('fill-form')}>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : isError || !form ? (
        <p className="text-[12.5px] text-danger">Couldn’t read this document’s form fields.</p>
      ) : (
        <>
          <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
              {form.hasFields ? (
                <ListChecks className="size-3.5 text-ink-subtle" aria-hidden="true" />
              ) : (
                <FileX2 className="size-3.5 text-ink-subtle" aria-hidden="true" />
              )}
              {form.hasFields ? `${form.fields.length} fields found` : 'No fillable fields'}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              {form.hasFields
                ? 'Fill in the values on the right, then generate a finished copy. The result is flattened — values are no longer editable once downloaded.'
                : 'This PDF has no interactive form fields to fill.'}
            </p>
          </div>

          {unsupportedCount > 0 && (
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              {unsupportedCount} field{unsupportedCount === 1 ? '' : 's'} (buttons or signature
              fields) can't be filled here and will be left as-is.
            </p>
          )}
        </>
      )}
    </ToolPanel>
  );
}
