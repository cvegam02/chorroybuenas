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
