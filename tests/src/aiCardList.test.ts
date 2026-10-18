import { describe, expect, it } from 'vitest';
import { defaultInputSource, parseCardList, parseSceneList, traditionalCardList } from '../../src/utils/aiCardList';

describe('lista de cartas para generar con IA (FEAT-50, US A2)', () => {
  it('lee un renglón por carta: número | NOMBRE | escena', () => {
    const { cards, errors } = parseCardList(
      '1 | EL GALLO | un gallo con bufanda roja\n\n6 | LA SIRENA | una sirena con gorro de Santa | y cola verde\n',
    );
    expect(errors).toEqual([]);
    expect(cards).toEqual([
      { number: 1, name: 'EL GALLO', scene: 'un gallo con bufanda roja' },
      // Una barra dentro de la escena se conserva.
      { number: 6, name: 'LA SIRENA', scene: 'una sirena con gorro de Santa | y cola verde' },
    ]);
  });

  it('la escena es opcional', () => {
    expect(parseCardList('7 | LA ESCALERA').cards).toEqual([{ number: 7, name: 'LA ESCALERA', scene: '' }]);
  });

  it('señala los renglones mal escritos sin perder los demás', () => {
    const { cards, errors } = parseCardList('1 | EL GALLO | ok\nLA DAMA | sin número\n0 | CERO\n2 |  | sin nombre\n1 | OTRA VEZ');
    expect(cards).toEqual([{ number: 1, name: 'EL GALLO', scene: 'ok' }]);
    expect(errors.map((e) => [e.line, e.reason])).toEqual([
      [2, 'empieza sin número'],
      [3, 'el número va del 1 al 999'],
      [4, 'le falta el nombre'],
      [5, 'el número 1 ya está en la lista'],
    ]);
  });

  it('la baraja tradicional trae las 54 con número y nombre en mayúsculas, sin escena', () => {
    const list = traditionalCardList();
    expect(list).toHaveLength(54);
    expect(list[5]).toEqual({ number: 6, name: 'LA SIRENA', scene: '' });
    expect(list[3].name).toBe('EL CATRÍN');
  });

  it('parte de la baraja base solo si todos los números caben en ella', () => {
    expect(defaultInputSource([{ number: 1 }, { number: 54 }])).toBe('base');
    expect(defaultInputSource([{ number: 1 }, { number: 60 }])).toBe('none');
  });
});

describe('escenas pegadas sobre la lista ya cargada (FEAT-50, decisión 11)', () => {
  const cards = [
    { number: 1, name: 'EL GALLO' },
    { number: 6, name: 'LA SIRENA' },
  ];

  it('acepta «número | escena» y «número | NOMBRE | escena»', () => {
    const { scenes, errors } = parseSceneList('1 | un gallo con bufanda\n6 | la sirena | una sirena con gorro de Santa', cards);
    expect(errors).toEqual([]);
    expect([...scenes]).toEqual([
      [1, 'un gallo con bufanda'],
      [6, 'una sirena con gorro de Santa'],
    ]);
  });

  it('si el segundo trozo no es el nombre de la carta, todo es la escena', () => {
    const { scenes } = parseSceneList('6 | una sirena | con cola verde', cards);
    expect(scenes.get(6)).toBe('una sirena | con cola verde');
  });

  it('señala números que no están en la lista, renglones sin número o sin escena, y repetidos', () => {
    const { scenes, errors } = parseSceneList('1 | ok\n9 | no existe\nsin número\n6 |   \n1 | otra', cards);
    expect([...scenes]).toEqual([[1, 'ok']]);
    expect(errors.map((e) => [e.line, e.reason])).toEqual([
      [2, 'no hay carta 9 en la lista'],
      [3, 'empieza sin número'],
      [4, 'le falta la escena'],
      [5, 'el número 1 ya está en la lista'],
    ]);
  });
});
