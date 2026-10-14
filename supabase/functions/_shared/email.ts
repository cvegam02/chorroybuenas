/** Remitente de todos los correos del sitio (fase 3, decisión 7). */
export const EMAIL_FROM = 'Chorro y Buenas <avisos@chorroybuenas.com.mx>';

const RESEND_URL = 'https://api.resend.com/emails';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Marca única: Resend no entrega dos veces un correo con la misma marca. */
  idempotencyKey: string;
}

export type SendEmail = (message: EmailMessage) => Promise<void>;

/** Envía con Resend. Lanza si Resend responde con error. */
export function createResendSender(options: { apiKey: string; fetchFn?: typeof fetch }): SendEmail {
  const fetchFn = options.fetchFn ?? fetch;
  return async (message) => {
    const body: Record<string, unknown> = {
      from: EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    };
    if (message.replyTo) body.reply_to = message.replyTo;

    const response = await fetchFn(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Resend ${response.status}: ${detail.slice(0, 300)}`);
    }
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailContent {
  title: string;
  greeting: string;
  /** Texto plano; lo que va entre `**` sale en negritas. */
  paragraphs: string[];
  button?: { label: string; url: string };
}

const BOLD = /\*\*(.+?)\*\*/g;

const paragraphHtml = (text: string): string =>
  `<p style="margin: 0 0 20px 0; color: #431407; font-size: 16px; line-height: 1.6;">${
    escapeHtml(text).replace(BOLD, '<strong>$1</strong>')
  }</p>`;

const buttonHtml = (button: { label: string; url: string }): string => `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 8px auto 0 auto;">
                <tr>
                  <td style="border-radius: 12px; background-color: #ea580c; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);">
                    <a href="${escapeHtml(button.url)}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px;">${escapeHtml(button.label)}</a>
                  </td>
                </tr>
              </table>`;

/** Arma el correo con el mismo estilo que las plantillas de cuenta, más su versión en texto. */
export function renderEmail(content: EmailContent): { html: string; text: string } {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff7ed;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff7ed;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #fffbf7; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background-color: #ea580c; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${escapeHtml(content.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              ${paragraphHtml(content.greeting)}
              ${content.paragraphs.map(paragraphHtml).join('\n              ')}${content.button ? buttonHtml(content.button) : ''}
            </td>
          </tr>
          <tr>
            <td style="background-color: #fff7ed; padding: 24px 40px; text-align: center; border-top: 1px solid #ffedd5;">
              <p style="margin: 0; color: #78350f; font-size: 13px;">Chorro y Buenas</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    content.greeting,
    ...content.paragraphs.map((paragraph) => paragraph.replace(BOLD, '$1')),
    ...(content.button ? [`${content.button.label}: ${content.button.url}`] : []),
    'Chorro y Buenas',
  ].join('\n\n');

  return { html, text };
}
