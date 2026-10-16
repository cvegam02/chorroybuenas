import { useRef } from 'react';
import { FaFilePdf } from 'react-icons/fa';
import type { SeasonalPdf } from '../../../repositories/SeasonalRepository';
import {
  SEASONAL_PDF_MIME_TYPE,
  formatFileSize,
  type SeasonalFormErrors,
  type SeasonalLoteriaForm,
} from '../../../utils/seasonalLoteria';

interface WizardOwnPdfProps {
  pdf: SeasonalPdf | null;
  form: SeasonalLoteriaForm;
  errors: SeasonalFormErrors;
  setField: <K extends keyof SeasonalLoteriaForm>(field: K, value: SeasonalLoteriaForm[K]) => void;
  isUploading: boolean;
  onUpload: (file: File) => void;
}

/** «Ya tengo el PDF» (FEAT-48, decisión 11): se sube el PDF terminado y se escriben cuántas cartas y tableros trae. */
export const WizardOwnPdf = ({ pdf, form, errors, setField, isUploading, onUpload }: WizardOwnPdfProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="seasonal-wizard__dropzone">
        {pdf ? (
          <span className="seasonal-wizard__pdf-name">
            <FaFilePdf aria-hidden="true" /> {pdf.name} · {formatFileSize(pdf.sizeBytes)}
          </span>
        ) : (
          <b>Todavía no hay PDF</b>
        )}
        <button type="button" className="seasonal-wizard__btn" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          {isUploading ? 'Subiendo el PDF…' : pdf ? 'Cambiar PDF' : 'Elegir PDF'}
        </button>
        <span className="seasonal-wizard__muted">El PDF que se vende, ya terminado. Hasta 50 MB.</span>
        <input
          ref={inputRef}
          type="file"
          accept={SEASONAL_PDF_MIME_TYPE}
          hidden
          aria-label="PDF de la lotería"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Se limpia para poder volver a elegir el mismo archivo después de un rechazo.
            e.target.value = '';
            if (file) onUpload(file);
          }}
        />
      </div>

      <div className="seasonal-wizard__two-cols">
        <div className="seasonal-wizard__label">
          <label htmlFor="wizard-card-count">¿Cuántas cartas trae?</label>
          <input
            id="wizard-card-count"
            type="text"
            inputMode="numeric"
            className="seasonal-wizard__field"
            value={form.cardCount}
            onChange={(e) => setField('cardCount', e.target.value)}
          />
          {errors.cardCount && <span className="seasonal-wizard__field-error">{errors.cardCount}</span>}
        </div>
        <div className="seasonal-wizard__label">
          <label htmlFor="wizard-board-count">¿Cuántos tableros trae?</label>
          <input
            id="wizard-board-count"
            type="text"
            inputMode="numeric"
            className="seasonal-wizard__field"
            value={form.boardCount}
            onChange={(e) => setField('boardCount', e.target.value)}
          />
          {errors.boardCount && <span className="seasonal-wizard__field-error">{errors.boardCount}</span>}
        </div>
      </div>
    </>
  );
};
