/** Preguntas frecuentes de una página pública y sus datos estructurados `FAQPage` (FEAT-33). */

export interface FaqItem {
  question: string;
  answer: string;
  /** Texto de un enlace que cierra la respuesta: «…Consulta el [Aviso de privacidad].» */
  linkLabel?: string;
  linkTo?: string;
}

/** El texto de la respuesta tal como se lee en pantalla, con el enlace incluido. */
export function faqAnswerText(item: FaqItem): string {
  return item.linkLabel ? `${item.answer} ${item.linkLabel}.` : item.answer;
}

export function faqJsonLd(items: readonly FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(item) },
    })),
  };
}
