import { describe, expect, it, vi } from 'vitest';
import {
  EMAIL_FROM, createResendSender, escapeHtml, renderEmail,
} from '../../supabase/functions/_shared/email.ts';

const message = {
  to: 'ana@ejemplo.com',
  subject: 'Te regalamos tokens',
  html: '<p>Hola</p>',
  text: 'Hola',
  replyTo: 'contacto@ejemplo.com',
  idempotencyKey: 'token-gift-1',
};

const okResponse = () => new Response(JSON.stringify({ id: 'email-1' }), { status: 200 });

describe('createResendSender', () => {
  it('manda el correo a Resend con la clave, la marca contra repetidos y el remitente del sitio', async () => {
    const fetchFn = vi.fn(async () => okResponse());
    await createResendSender({ apiKey: 're_123', fetchFn })(message);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_123',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'token-gift-1',
    });
    expect(JSON.parse(init.body as string)).toEqual({
      from: EMAIL_FROM,
      to: ['ana@ejemplo.com'],
      subject: 'Te regalamos tokens',
      html: '<p>Hola</p>',
      text: 'Hola',
      reply_to: 'contacto@ejemplo.com',
    });
  });

  it('sin dirección de respuesta no manda reply_to', async () => {
    const fetchFn = vi.fn(async () => okResponse());
    await createResendSender({ apiKey: 're_123', fetchFn })({ ...message, replyTo: undefined });
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty('reply_to');
  });

  it('el remitente es Chorro y Buenas desde avisos@chorroybuenas.com.mx', () => {
    expect(EMAIL_FROM).toBe('Chorro y Buenas <avisos@chorroybuenas.com.mx>');
  });

  it('si Resend responde con error, falla con el código y el mensaje', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ message: 'invalid key' }), { status: 401 }));
    await expect(createResendSender({ apiKey: 'mala', fetchFn })(message)).rejects.toThrow(/401.*invalid key/);
  });
});

describe('escapeHtml', () => {
  it('escapa los caracteres que abren etiquetas o atributos', () => {
    expect(escapeHtml(`<b>"Ana" & 'Luis'</b>`)).toBe('&lt;b&gt;&quot;Ana&quot; &amp; &#39;Luis&#39;&lt;/b&gt;');
  });
});

describe('renderEmail', () => {
  it('arma el HTML con el título, los párrafos y el botón, y la versión de texto', () => {
    const email = renderEmail({
      title: 'Te regalamos tokens',
      greeting: 'Hola, Ana:',
      paragraphs: ['Te regalamos **3 tokens**.'],
      button: { label: 'Ir a mi cuenta', url: 'https://chorroybuenas.com.mx/dashboard' },
    });
    expect(email.html).toContain('<html lang="es">');
    expect(email.html).toContain('Hola, Ana:');
    expect(email.html).toContain('Te regalamos <strong>3 tokens</strong>.');
    expect(email.html).toContain('href="https://chorroybuenas.com.mx/dashboard"');
    expect(email.html).toContain('Ir a mi cuenta');
    expect(email.html).toContain('Chorro y Buenas');
    expect(email.text).toBe(
      'Hola, Ana:\n\nTe regalamos 3 tokens.\n\nIr a mi cuenta: https://chorroybuenas.com.mx/dashboard\n\nChorro y Buenas',
    );
  });

  it('escapa lo que viene de los datos para que no se cuele HTML', () => {
    const email = renderEmail({ title: 'T', greeting: 'Hola, <script>x</script>:', paragraphs: ['a & b'] });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('Hola, &lt;script&gt;x&lt;/script&gt;:');
    expect(email.html).toContain('a &amp; b');
  });

  it('sin botón no dibuja ningún enlace', () => {
    const email = renderEmail({ title: 'T', greeting: 'Hola:', paragraphs: ['Texto'] });
    expect(email.html).not.toContain('<a ');
  });
});
