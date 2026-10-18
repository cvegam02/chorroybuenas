import { useCallback, useEffect, useRef, useState } from 'react';
import { FaUpload } from 'react-icons/fa';
import { BaseDeckRepository } from '../../repositories/BaseDeckRepository';
import {
  assignBaseDeckFiles,
  BASE_DECK_ACCEPTED_MIME_TYPES,
  BASE_DECK_SIZE,
  BASE_DECK_SLOTS,
  type BaseDeckSlot,
} from '../../utils/baseDeck';
import { LoadingLine, ProgressBar } from './SeasonalWizard/WizardBusy';
import './AdminBaseDeck.css';

/** Subidas en paralelo: pocas, para no saturar la conexión con 54 imágenes. */
const PARALLEL_UPLOADS = 3;

type LoadState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; urls: Map<number, string> };

interface Progress {
  done: number;
  total: number;
}

const ACCEPT = BASE_DECK_ACCEPTED_MIME_TYPES.join(',');

/** Sube cada archivo a su número, unos cuantos a la vez; devuelve los números que fallaron. */
const uploadAll = async (byNumber: Map<number, File>, onDone: () => void): Promise<number[]> => {
  const queue = [...byNumber.entries()];
  const failed: number[] = [];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [number, file] = next;
      if (!(await BaseDeckRepository.uploadCard(number, file))) failed.push(number);
      onDone();
    }
  };
  await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));
  return failed.sort((a, b) => a - b);
};

interface SlotProps {
  slot: BaseDeckSlot;
  url: string | undefined;
  disabled: boolean;
  onReplace: (slot: BaseDeckSlot, file: File) => void;
}

const BaseDeckSlotView = ({ slot, url, disabled, onReplace }: SlotProps) => (
  <li className="admin-base-deck__slot">
    <div className={`admin-base-deck__image${url ? '' : ' admin-base-deck__image--empty'}`}>
      {url ? <img src={url} alt={`${slot.number}. ${slot.name}`} loading="lazy" /> : <span>Falta</span>}
    </div>
    <span className="admin-base-deck__label">
      <strong>{slot.number}</strong> {slot.name}
    </span>
    <label className={`admin-base-deck__replace${disabled ? ' admin-base-deck__replace--disabled' : ''}`}>
      {url ? 'Reemplazar' : 'Subir'}
      <input
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        aria-label={`${url ? 'Reemplazar' : 'Subir'} la carta ${slot.number}, ${slot.name}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onReplace(slot, file);
        }}
      />
    </label>
  </li>
);

/** «Baraja base» (FEAT-50, US A1): las 54 cartas tradicionales que se usan como imagen de entrada al generar con IA. */
export const AdminBaseDeck = () => {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const bulkInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const urls = await BaseDeckRepository.getCardUrls();
    setLoad(urls ? { status: 'ready', urls } : { status: 'failed' });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const upload = async (byNumber: Map<number, File>, problems: string[]) => {
    setMessages(problems);
    if (byNumber.size === 0) return;
    setProgress({ done: 0, total: byNumber.size });
    const failed = await uploadAll(byNumber, () => setProgress((p) => (p ? { ...p, done: p.done + 1 } : p)));
    if (failed.length > 0) problems.push(`No se pudieron subir las cartas ${failed.join(', ')}. Intenta de nuevo.`);
    setMessages([...problems]);
    setProgress(null);
    await reload();
  };

  const handleBulk = (files: File[]) => {
    const { byNumber, rejected } = assignBaseDeckFiles(files);
    upload(byNumber, rejected.map(({ file, reason }) => `«${file.name}» no se subió: ${reason}.`));
  };

  const handleReplace = (slot: BaseDeckSlot, file: File) => {
    const { byNumber, rejected } = assignBaseDeckFiles([file]);
    const chosen = byNumber.values().next().value;
    if (!chosen) {
      setMessages(rejected.map(({ reason }) => `La carta ${slot.number} no se subió: ${reason}.`));
      return;
    }
    upload(new Map([[slot.number, chosen]]), []);
  };

  const isBusy = progress !== null;
  const uploaded = load.status === 'ready' ? load.urls.size : 0;

  return (
    <section className="admin-themes__panel" aria-labelledby="admin-base-deck-title">
      <div className="admin-themes__panel-head">
        <h3 id="admin-base-deck-title" className="admin-themes__panel-title">
          Baraja base
        </h3>
        <span className="admin-pricing__muted">
          Las cartas tradicionales que se usan como imagen de partida al generar con IA. Solo las ves tú.
        </span>
      </div>

      <div className="admin-base-deck__toolbar">
        <span className="admin-base-deck__count">
          {uploaded} de {BASE_DECK_SIZE} cartas subidas
        </span>
        <button
          type="button"
          className="admin-pricing__btn admin-pricing__btn--primary"
          disabled={isBusy || load.status !== 'ready'}
          onClick={() => bulkInput.current?.click()}
        >
          <FaUpload aria-hidden="true" /> Subir cartas
        </button>
        <input
          ref={bulkInput}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            if (files.length > 0) handleBulk(files);
          }}
        />
      </div>
      <p className="admin-pricing__muted admin-base-deck__hint">
        Elige varias a la vez. Si el nombre del archivo empieza con el número de la carta («06-la-sirena.webp»), va a ese
        número; si no, se acomodan en orden de nombre desde la 1.
      </p>

      {progress && (
        <div className="admin-base-deck__progress">
          <ProgressBar label="Subiendo la baraja base" done={progress.done} total={progress.total} />
        </div>
      )}
      {messages.map((message) => (
        <p key={message} className="admin-pricing__error" role="alert">
          {message}
        </p>
      ))}

      {load.status === 'loading' && <LoadingLine text="Cargando la baraja base…" />}
      {load.status === 'failed' && (
        <div className="admin-seasonal__load-error">
          <p className="admin-packs__error">No se pudo cargar la baraja base.</p>
          <button type="button" className="admin-pricing__btn" onClick={() => { setLoad({ status: 'loading' }); reload(); }}>
            Reintentar
          </button>
        </div>
      )}
      {load.status === 'ready' && (
        <ul className="admin-base-deck__grid">
          {BASE_DECK_SLOTS.map((slot) => (
            <BaseDeckSlotView
              key={slot.number}
              slot={slot}
              url={load.urls.get(slot.number)}
              disabled={isBusy}
              onReplace={handleReplace}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
