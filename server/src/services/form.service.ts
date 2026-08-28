import {
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  type PDFField,
} from 'pdf-lib';

import { AppError, ErrorCode } from '../errors/AppError.js';
import { loadDocument, serialise } from './pdf.service.js';

/**
 * The field kinds this tool actually fills. `PDFButton` (push buttons) and
 * `PDFSignature` fields exist in the AcroForm spec but have no text/boolean
 * value to fill — they're reported as `'unsupported'` rather than silently
 * dropped, so the UI can say so instead of just not mentioning them.
 */
export type FormFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionList' | 'unsupported';

export interface FormFieldInfo {
  name: string;
  type: FormFieldType;
  required: boolean;
  readOnly: boolean;
  /** Choices for `radio`, `dropdown` and `optionList` fields. */
  options?: string[];
  /** Whether more than one option may be selected (`optionList` only). */
  multiselect?: boolean;
  currentValue?: string | boolean | string[];
}

export interface FormInspection {
  pageCount: number;
  hasFields: boolean;
  fields: FormFieldInfo[];
}

export interface FormFieldValue {
  name: string;
  value: string | boolean | string[];
}

function describeField(field: PDFField): FormFieldInfo {
  const base = {
    name: field.getName(),
    required: field.isRequired(),
    readOnly: field.isReadOnly(),
  };

  if (field instanceof PDFTextField) {
    return { ...base, type: 'text', currentValue: field.getText() ?? '' };
  }
  if (field instanceof PDFCheckBox) {
    return { ...base, type: 'checkbox', currentValue: field.isChecked() };
  }
  if (field instanceof PDFRadioGroup) {
    return { ...base, type: 'radio', options: field.getOptions(), currentValue: field.getSelected() ?? '' };
  }
  if (field instanceof PDFDropdown) {
    return {
      ...base,
      type: 'dropdown',
      options: field.getOptions(),
      currentValue: field.getSelected(),
      multiselect: false,
    };
  }
  if (field instanceof PDFOptionList) {
    return {
      ...base,
      type: 'optionList',
      options: field.getOptions(),
      currentValue: field.getSelected(),
      multiselect: field.isMultiselect(),
    };
  }

  return { ...base, type: 'unsupported' };
}

export const formService = {
  /** Reads a document's AcroForm fields without changing the file. */
  async inspect(data: Uint8Array): Promise<FormInspection> {
    const doc = await loadDocument(data);
    const fields = doc.getForm().getFields().map(describeField);

    return { pageCount: doc.getPageCount(), hasFields: fields.length > 0, fields };
  },

  /**
   * Fills the given fields with their submitted values and flattens the
   * form: values are baked into the page content and the fields stop being
   * interactive, so the download is a finished document rather than a form
   * someone could reopen and accidentally change.
   */
  async fill(data: Uint8Array, values: FormFieldValue[]): Promise<Uint8Array> {
    const doc = await loadDocument(data);
    const form = doc.getForm();
    const fields = form.getFields();

    if (fields.length === 0) {
      throw AppError.badRequest(ErrorCode.EMPTY_RESULT, 'This PDF has no fillable fields.');
    }

    const byName = new Map(fields.map((field) => [field.getName(), field]));

    for (const { name, value } of values) {
      const field = byName.get(name);
      if (!field) continue; // Unknown or stale field name — ignore rather than fail the whole submission.

      if (field instanceof PDFTextField && typeof value === 'string') {
        field.setText(value.length > 0 ? value : undefined);
      } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
        if (value) field.check();
        else field.uncheck();
      } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
        if (value.length > 0) field.select(value);
      } else if (field instanceof PDFDropdown && Array.isArray(value)) {
        if (value.length > 0) field.select(value);
      } else if (field instanceof PDFOptionList && Array.isArray(value)) {
        field.select(value);
      }
      // PDFButton / PDFSignature / anything else: not fillable, skipped —
      // matches the `'unsupported'` type reported by `inspect`.
    }

    form.flatten();
    return serialise(doc);
  },
};
