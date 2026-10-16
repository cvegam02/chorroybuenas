import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { moveItem } from '../utils/seasonalPreview';

interface DragState<T> {
  key: string;
  order: T[];
}

/**
 * Reordenar arrastrando desde una agarradera, con ratón o con el dedo, en lista o en cuadrícula: el
 * elemento se acomoda junto al que tenga el centro más cerca. Con la agarradera enfocada, las flechas lo
 * mueven un lugar. `onCommit` recibe el orden nuevo solo si cambió.
 */
export function useDragReorder<T>(items: readonly T[], getKey: (item: T) => string, onCommit: (next: T[]) => void) {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());

  const register = (key: string) => (node: HTMLElement | null) => {
    if (node) nodes.current.set(key, node);
    else nodes.current.delete(key);
  };

  const nearestIndex = (order: readonly T[], x: number, y: number): number => {
    let best = -1;
    let bestDistance = Infinity;
    order.forEach((item, index) => {
      const rect = nodes.current.get(getKey(item))?.getBoundingClientRect();
      if (!rect) return;
      const distance = Math.hypot(rect.left + rect.width / 2 - x, rect.top + rect.height / 2 - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  };

  const finish = () => {
    if (!drag) return;
    setDrag(null);
    if (drag.order.some((item, index) => getKey(item) !== getKey(items[index]))) onCommit(drag.order);
  };

  const handleProps = (item: T) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ key: getKey(item), order: [...items] });
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const { clientX, clientY } = event;
      setDrag((current) => {
        if (!current) return current;
        const from = current.order.findIndex((candidate) => getKey(candidate) === current.key);
        const to = nearestIndex(current.order, clientX, clientY);
        return to < 0 || to === from ? current : { ...current, order: moveItem(current.order, from, to) };
      });
    },
    onPointerUp: finish,
    onPointerCancel: () => setDrag(null),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const step = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
      if (step === undefined) return;
      event.preventDefault();
      const from = items.findIndex((candidate) => getKey(candidate) === getKey(item));
      const to = from + step;
      if (to >= 0 && to < items.length) onCommit(moveItem(items, from, to));
    },
  });

  return {
    /** Los elementos en el orden que se ve: el del arrastre mientras dura. */
    shown: drag?.order ?? items,
    draggingKey: drag?.key ?? null,
    register,
    handleProps,
  };
}
