import { FileX2, Lock } from 'lucide-react';

import { cn } from '../../lib/cn';
import { EmptyState } from '../ui/EmptyState';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { Skeleton } from '../ui/Skeleton';
import type { FormFieldInfo, FormFieldValue } from '../../types';

interface FormFieldsEditorProps {
  fields: FormFieldInfo[] | undefined;
  isLoading: boolean;
  isError: boolean;
  values: Record<string, FormFieldValue>;
  onChange: (name: string, value: FormFieldValue) => void;
  disabled: boolean;
}

const selectClassName = cn(
  'h-9.5 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink',
  'transition-colors focus:outline-none focus-visible:border-accent',
  'disabled:cursor-not-allowed disabled:bg-raised disabled:text-ink-subtle',
);

function FieldRow({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldInfo;
  value: FormFieldValue | undefined;
  onChange: (value: FormFieldValue) => void;
  disabled: boolean;
}) {
  const locked = disabled || field.readOnly;

  if (field.type === 'unsupported') {
    return (
      <div className="rounded-md border border-line bg-raised/40 px-4 py-3">
        <p className="text-[13px] font-medium text-ink-subtle">{field.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-subtle">
          <Lock className="size-3" aria-hidden="true" />
          Button or signature field — can't be filled here.
        </p>
      </div>
    );
  }

  const label = `${field.name}${field.required ? ' *' : ''}`;

  if (field.type === 'text') {
    return (
      <Field
        label={label}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={locked}
        hint={field.readOnly ? 'Read-only field' : undefined}
      />
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label
        className={cn(
          'flex items-center gap-2.5 rounded-md border border-line-strong bg-surface px-3 py-2.5',
          locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
        )}
      >
        <input
          type="checkbox"
          checked={value === true}
          disabled={locked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 shrink-0 accent-[var(--color-accent)]"
        />
        <span className="text-[13px] font-medium text-ink">{label}</span>
      </label>
    );
  }

  if (field.type === 'radio') {
    const options = field.options ?? [];
    return (
      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        <Segmented
          label={label}
          value={typeof value === 'string' && value ? value : (options[0] ?? '')}
          onChange={onChange}
          options={options.map((option) => ({ value: option, label: option }))}
        />
      </div>
    );
  }

  // dropdown / optionList
  const options = field.options ?? [];
  const multiple = field.type === 'optionList';
  const selected = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-ink">{label}</label>
      <select
        className={selectClassName}
        disabled={locked}
        multiple={multiple}
        value={multiple ? selected : (selected[0] ?? '')}
        onChange={(event) => {
          if (multiple) {
            onChange(Array.from(event.target.selectedOptions, (option) => option.value));
          } else {
            onChange(event.target.value ? [event.target.value] : []);
          }
        }}
      >
        {!multiple && <option value="">— Select —</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FormFieldsEditor({
  fields,
  isLoading,
  isError,
  values,
  onChange,
  disabled,
}: FormFieldsEditorProps) {
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4 sm:p-6">
        <Skeleton className="h-9.5 w-full" />
        <Skeleton className="h-9.5 w-full" />
        <Skeleton className="h-9.5 w-2/3" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<FileX2 />}
        title="We couldn't read this document's form"
        description="The file may be corrupted or password-protected."
        className="p-4 sm:p-6"
      />
    );
  }

  if (!fields || fields.length === 0) {
    return (
      <EmptyState
        icon={<FileX2 />}
        title="No fillable fields"
        description="This PDF has no interactive form fields."
        className="p-4 sm:p-6"
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4 sm:p-6">
      {fields.map((field) => (
        <FieldRow
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(value) => onChange(field.name, value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
