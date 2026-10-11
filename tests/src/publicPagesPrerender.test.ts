import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import { render } from '../../src/entry-server';

/** Los datos FAQPage que trae la página pre-generada. */
function faqPageOf(html: string): { mainEntity: { name: string; acceptedAnswer: { text: string } }[] } {
  const match = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  if (!match) throw new Error('La página no trae datos FAQPage');
  return JSON.parse(match[1]);
}

const countOf = (html: string, tag: string) => html.split(`<${tag}`).length - 1;

describe('páginas públicas pre-generadas (FEAT-33)', () => {
  describe('Beneficios', () => {
    it('trae su texto completo y un solo título principal', async () => {
      const { html } = await render('/beneficios');
      const page = es.landing.benefitsPage;
      expect(countOf(html, 'h1')).toBe(1);
      expect(html).toContain(page.hero.titleHighlight);
      expect(html).toContain(page.beforeAfter.title);
      expect(html).toContain(page.how.step2.title);
      expect(html).toContain(page.gallery.title);
      expect(html).toContain(page.account.tokens.title);
      expect(html).toContain(page.faq.title);
    });

    it('sus datos FAQPage dicen lo mismo que las cinco preguntas visibles', async () => {
      const { html } = await render('/beneficios');
      const faq = es.landing.benefitsPage.faq;
      const data = faqPageOf(html);
      expect(data.mainEntity.map((entry) => entry.name)).toEqual([
        faq.needAi.question,
        faq.badResult.question,
        faq.pay.question,
        faq.privacy.question,
        faq.notAllowed.question,
      ]);
      expect(data.mainEntity[0].acceptedAnswer.text).toBe(faq.needAi.answer);
      expect(data.mainEntity[3].acceptedAnswer.text).toBe(`${faq.privacy.answer} ${faq.privacy.linkLabel}.`);
      for (const entry of data.mainEntity) {
        expect(html).toContain(entry.name);
      }
    });

    it('trae el recuadro «¿Cuánto cuesta?» y ya no las tarjetas de paquetes', async () => {
      const { html } = await render('/beneficios');
      const cost = es.landing.benefitsPage.cost;
      expect(html).toContain(cost.label);
      expect(html).toContain(cost.points.noExpiry);
      expect(html).toContain(cost.points.giftPacks);
      expect(html).toContain(cost.button);
      expect(html).toContain('href="/comprar-tokens"');
      expect(html).not.toContain('token-pack');
    });

    it('no menciona el bloque de estilos de IA que se quitó', async () => {
      const { html } = await render('/beneficios');
      expect(html).not.toMatch(/Simpson|Ghibli|Próximamente/);
    });
  });
});

describe('Temáticas pre-generada (FEAT-33, US A3)', () => {
  it('trae su texto, un solo título principal y el ancla del catálogo', async () => {
    const { html } = await render('/tematicas');
    const catalog = es.seasonal.catalog;
    expect(countOf(html, 'h1')).toBe(1);
    expect(html).toContain(catalog.heroHighlight);
    expect(html).toContain(catalog.steps.buy.text);
    expect(html).toContain(catalog.custom.title);
    expect(html).toContain('id="catalogo"');
    expect(html).not.toContain('Muy pronto');
  });

  it('sus datos FAQPage dicen lo mismo que las siete preguntas visibles', async () => {
    const { html } = await render('/tematicas');
    const faq = es.seasonal.catalog.faq;
    const data = faqPageOf(html);
    expect(data.mainEntity).toHaveLength(7);
    expect(data.mainEntity[0].name).toBe(faq.receive.q);
    expect(data.mainEntity[0].acceptedAnswer.text).toBe(faq.receive.a);
    expect(data.mainEntity[5].acceptedAnswer.text).toBe(`${faq.use.a} ${faq.use.link}.`);
  });
});

describe('¿Cómo se juega? pre-generada (FEAT-33, US A5)', () => {
  it('trae su texto completo y un solo título principal', async () => {
    const { html } = await render('/como-se-juega');
    const page = es.howToPlay;
    expect(countOf(html, 'h1')).toBe(1);
    expect(html).toContain(page.hero.title);
    expect(html).toContain(page.need.caller.title);
    expect(html).toContain(page.steps.mark.title);
    expect(html).toContain(page.calling.sirena.name);
    expect(html).toContain(page.plays.others);
    expect(html).toContain(page.bet.title);
    expect(html).toContain(page.cta.title);
  });

  it('los mínimos de cartas son los del generador de tableros: 15 en Modo Kids y 24 en Clásico', async () => {
    const { html } = await render('/como-se-juega');
    expect(html).toContain('al menos 15 cartas para hacer tableros de Modo Kids');
    expect(html).toContain('el Modo Clásico pide al menos 24 cartas');
    expect(html).not.toContain('{{');
  });

  it('dibuja los cuatro tableros de las jugadas sin imágenes, con su descripción', async () => {
    const { html } = await render('/como-se-juega');
    expect(html.split('role="img"').length - 1).toBe(4);
    expect(html).toContain(es.howToPlay.plays.esquinas.boardAlt);
    expect(html.split('how-to-play__cell--marked').length - 1).toBe(4 + 4 + 4 + 16);
  });

  it('enlaza a crear la lotería y a las temáticas', async () => {
    const { html } = await render('/como-se-juega');
    expect(html).toContain('href="/cards"');
    expect(html).toContain('href="/tematicas"');
  });

  it('sus datos FAQPage dicen lo mismo que las seis preguntas visibles', async () => {
    const { html } = await render('/como-se-juega');
    const data = faqPageOf(html);
    expect(data.mainEntity).toHaveLength(6);
    expect(data.mainEntity[0].name).toBe(es.howToPlay.faq.cards.question);
    expect(data.mainEntity[0].acceptedAnswer.text).toContain('el mínimo es 24 (15 en Modo Kids)');
    expect(data.mainEntity[5].acceptedAnswer.text).toBe(es.howToPlay.faq.markers.answer);
  });
});

describe('¿Qué es la lotería? pre-generada (FEAT-33, US A6)', () => {
  it('trae su texto completo y un solo título principal', async () => {
    const { html } = await render('/que-es-la-loteria');
    const page = es.about;
    expect(countOf(html, 'h1')).toBe(1);
    expect(html).toContain(page.hero.title);
    expect(html).toContain(page.stats.generations);
    expect(html).toContain(page.history.mexican.text);
    expect(html).toContain(page.history.today.text);
    expect(html).toContain(page.culture.title);
    expect(html).not.toContain('Tu propia lotería');
    expect(html).toContain(page.cta.title);
  });

  it('lista las 54 cartas como texto, en una lista numerada', async () => {
    const { html } = await render('/que-es-la-loteria');
    expect(html.split('about-loteria__deck-card').length - 1).toBe(54);
    expect(html).toContain('El Gallo');
    expect(html).toContain('El Violoncello');
    expect(html).toContain('La Rana');
    expect(html).toMatch(/<ol class="about-loteria__deck-list"/);
  });

  it('muestra las cartas clásicas con su nombre en el texto alternativo', async () => {
    const { html } = await render('/que-es-la-loteria');
    expect(html).toContain('alt="Carta El Gallo de la lotería tradicional"');
    expect(html).toContain('alt="Carta El Valiente de la lotería tradicional"');
    expect(html).toContain('/media/que-es-la-loteria/carta-06-la-sirena.jpg');
    // 4 en el abanico, 9 en la hoja y 12 en la fila
    expect(html.split('/media/que-es-la-loteria/').length - 1).toBe(4 + 9 + 12);
    expect(html).toContain('LOTERÍA');
  });

  it('enlaza a «¿Cómo se juega?» y a crear la lotería', async () => {
    const { html } = await render('/que-es-la-loteria');
    expect(html).toContain('href="/como-se-juega"');
    expect(html).toContain('href="/cards"');
  });

  it('sus datos FAQPage dicen lo mismo que las cinco preguntas visibles', async () => {
    const { html } = await render('/que-es-la-loteria');
    const data = faqPageOf(html);
    expect(data.mainEntity).toHaveLength(5);
    expect(data.mainEntity[1].name).toBe(es.about.faq.bingo.question);
    expect(data.mainEntity[4].acceptedAnswer.text).toBe(es.about.faq.own.answer);
  });
});

