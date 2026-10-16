import { useCallback, useRef, useState } from 'react';
import { SeasonalRepository, type AdminSeasonalLoteria, type Season } from '../../../repositories/SeasonalRepository';
import {
  seasonalFormFromLoteria,
  validateSeasonalLoteriaForm,
  type SeasonalFormErrors,
  type SeasonalLoteriaForm,
  type SeasonalLoteriaInput,
} from '../../../utils/seasonalLoteria';

export type DraftSaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'invalid' }
  | { kind: 'failed' };

/** Lo que el asistente sabe de la lotería: lo último guardado, o null si aún no existe. */
export type DraftRecord = AdminSeasonalLoteria | null;

function withInput(record: DraftRecord, id: string, input: SeasonalLoteriaInput): AdminSeasonalLoteria {
  return {
    ...input,
    id,
    is_published: record?.is_published ?? false,
    cover_path: record?.cover_path ?? null,
    sample_paths: record?.sample_paths ?? [],
    pdf: record?.pdf ?? null,
  };
}

/**
 * La ficha que se va llenando en el asistente (FEAT-48, decisiones 9 y 20). `save` la guarda como borrador
 * si cambió; una lotería publicada solo se guarda con `force` («Guardar cambios»). Devuelve su id, o null
 * si no se pudo guardar.
 */
export function useWizardDraft(initial: DraftRecord, seasons: readonly Season[]) {
  const [form, setForm] = useState<SeasonalLoteriaForm>(() => seasonalFormFromLoteria(initial, seasons));
  const [errors, setErrors] = useState<SeasonalFormErrors>({});
  const [record, setRecord] = useState<DraftRecord>(initial);
  const [saveState, setSaveState] = useState<DraftSaveState>({ kind: 'idle' });
  const lastSaved = useRef(initial ? JSON.stringify(validateSeasonalLoteriaForm(seasonalFormFromLoteria(initial, seasons)).input) : null);
  // Lo último escrito, para poder guardar al salir aunque el componente ya no exista.
  const latest = useRef({ form, record });
  latest.current = { form, record };

  // Se actualiza también lo último escrito: un guardado justo después ya debe llevar el cambio.
  const setField = useCallback(<K extends keyof SeasonalLoteriaForm>(field: K, value: SeasonalLoteriaForm[K]) => {
    const next = { ...latest.current.form, [field]: value };
    latest.current = { ...latest.current, form: next };
    setForm(next);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  /** Lo que cambió fuera de la ficha (el PDF, la portada) sin pasar por el guardado. */
  const patchRecord = useCallback((patch: Partial<AdminSeasonalLoteria>) => {
    const saved = latest.current.record;
    if (!saved) return;
    const updated = { ...saved, ...patch };
    latest.current = { ...latest.current, record: updated };
    setRecord(updated);
  }, []);

  const saveNow = useCallback(async (force: boolean): Promise<string | null> => {
    const { form: current, record: saved } = latest.current;
    if (saved?.is_published && !force) return saved.id;
    const { errors: found, input } = validateSeasonalLoteriaForm(current);
    if (!input) {
      setErrors(found);
      setSaveState({ kind: 'invalid' });
      return null;
    }
    const snapshot = JSON.stringify(input);
    if (saved && snapshot === lastSaved.current) return saved.id;

    setSaveState({ kind: 'saving' });
    const id = await SeasonalRepository.saveLoteria(saved?.id ?? null, input);
    if (!id) {
      setSaveState({ kind: 'failed' });
      return null;
    }
    lastSaved.current = snapshot;
    const updated = withInput(saved, id, input);
    // El siguiente guardado de la cola ya debe actualizar esta, aunque aún no se vuelva a pintar.
    latest.current = { ...latest.current, record: updated };
    setRecord(updated);
    setSaveState({ kind: 'saved', at: new Date() });
    return id;
  }, []);

  // De uno en uno: dos guardados seguidos de una lotería nueva crearían dos.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const save = useCallback(
    (force = false): Promise<string | null> => {
      const next = queue.current.then(() => saveNow(force));
      queue.current = next.catch(() => null);
      return next;
    },
    [saveNow],
  );

  /** Nada que guardar: sin cambios desde el último guardado (o una nueva todavía vacía). */
  const isClean = () => {
    const { form: current, record: saved } = latest.current;
    const { input } = validateSeasonalLoteriaForm(current);
    if (!saved) return current.nameEs.trim() === '' && current.descriptionEs.trim() === '';
    return input !== null && JSON.stringify(input) === lastSaved.current;
  };

  return { form, errors, record, saveState, setField, patchRecord, save, isClean };
}
