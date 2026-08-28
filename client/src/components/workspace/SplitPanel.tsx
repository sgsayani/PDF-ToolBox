import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { formatPageList } from '../../lib/format';
import { parsePageRange } from '../../lib/pages';
import { findTool } from '../../lib/tools';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { ToolPanel } from './ToolPanel';

export type SplitMode = 'selection' | 'range';

interface SplitPanelProps {
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  pageCount: number;
  /** Source page numbers that will be extracted. */
  pages: number[];
  /** Called whenever the range expression resolves to a different set of pages. */
  onRangeChange: (pages: number[]) => void;
  disabled: boolean;
}

export function SplitPanel({
  mode,
  onModeChange,
  pageCount,
  pages,
  onRangeChange,
  disabled,
}: SplitPanelProps) {
  const schema = useMemo(
    () =>
      z.object({
        range: z.string().superRefine((value, ctx) => {
          if (!value.trim()) return;
          const { error } = parsePageRange(value, pageCount);
          if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
        }),
      }),
    [pageCount],
  );

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { range: '' },
  });

  const rangeValue = watch('range');

  useEffect(() => {
    if (mode !== 'range') return;
    const { pages: parsed, error } = parsePageRange(rangeValue, pageCount);
    onRangeChange(error ? [] : parsed);
  }, [mode, rangeValue, pageCount, onRangeChange]);

  return (
    <ToolPanel tool={findTool('split')}>
      <Segmented
        label="How to choose pages"
        value={mode}
        onChange={onModeChange}
        options={[
          { value: 'selection', label: 'Select pages' },
          { value: 'range', label: 'Page range' },
        ]}
      />

      {mode === 'range' ? (
        <Field
          label="Pages to extract"
          placeholder="e.g. 1-3, 5, 8-10"
          autoComplete="off"
          spellCheck={false}
          inputMode="numeric"
          disabled={disabled}
          error={errors.range?.message}
          hint={`Separate pages and ranges with commas. This document has ${pageCount} pages.`}
          {...register('range')}
        />
      ) : (
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Click pages in the preview to choose what to extract. They keep their original order in
          the new file.
        </p>
      )}

      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
          Will extract
        </p>
        <p className="mt-1 text-[12.5px] text-ink">
          {pages.length === 0 ? (
            <span className="text-ink-muted">No pages chosen yet</span>
          ) : (
            <>
              {pages.length} of {pageCount} · pages {formatPageList(pages)}
            </>
          )}
        </p>
      </div>
    </ToolPanel>
  );
}
