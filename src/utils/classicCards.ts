/**
 * Las doce cartas clásicas con ilustración propia que se muestran en ¿Qué es la lotería? (FEAT-33,
 * decisión 55). Son las primeras doce de la baraja tradicional, en su orden.
 */
import { TRADITIONAL_DECK } from './traditionalDeck';

const SLUGS = [
  'el-gallo', 'el-diablito', 'la-dama', 'el-catrin', 'el-paraguas', 'la-sirena',
  'la-escalera', 'la-botella', 'el-barril', 'el-arbol', 'el-melon', 'el-valiente',
];

export interface ClassicCard {
  /** Número de la carta en la baraja, desde 1. */
  number: number;
  name: string;
  src: string;
}

export const CLASSIC_CARDS: readonly ClassicCard[] = SLUGS.map((slug, index) => ({
  number: index + 1,
  name: TRADITIONAL_DECK[index],
  src: `/media/que-es-la-loteria/carta-${String(index + 1).padStart(2, '0')}-${slug}.jpg`,
}));

/** Las cartas con esos números, en el orden pedido. */
export function classicCardsByNumber(numbers: readonly number[]): ClassicCard[] {
  return numbers.map((number) => CLASSIC_CARDS[number - 1]);
}
