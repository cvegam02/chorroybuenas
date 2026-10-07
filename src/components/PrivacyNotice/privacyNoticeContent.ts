/**
 * Texto del aviso de privacidad. Vive aquí y no en los archivos de traducción
 * porque es un texto legal: la versión en español es la única que vale.
 */

export const PRIVACY_CONTACT_EMAIL = 'carlos.tests01@gmail.com';
export const PRIVACY_LAST_UPDATED = '6 de octubre de 2026';

export interface PrivacySection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  closing?: string;
}

export const PRIVACY_INTRO =
  'Este aviso explica qué datos personales se recaban en chorroybuenas.com.mx, para qué se usan y cómo puedes ejercer tus derechos sobre ellos, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.';

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: '1. Quién es el responsable',
    paragraphs: [
      'El responsable del tratamiento de tus datos personales es Carlos Vega, con domicilio en Hermosillo, Sonora, México.',
      `Para cualquier asunto relacionado con tus datos personales puedes escribir a ${PRIVACY_CONTACT_EMAIL}.`,
    ],
  },
  {
    title: '2. Qué datos se recaban',
    paragraphs: ['Según cómo uses el sitio, se recaban estos datos:'],
    items: [
      'Datos de tu cuenta: tu correo electrónico y, si lo proporcionas, tu nombre. Si creas la cuenta con correo, tu contraseña se guarda cifrada y nadie puede leerla.',
      'Si entras con Google: el nombre, el correo y la foto de perfil de tu cuenta de Google. El sitio nunca recibe tu contraseña de Google.',
      'El contenido que subes: las fotos y los nombres de tus cartas, tus tableros y tu foto de perfil.',
      'Tu actividad en el sitio: tu saldo de tokens, las transformaciones con inteligencia artificial que solicitas y tus compras (qué compraste, cuánto pagaste, la fecha y el estado del pago).',
      'Datos técnicos: los que cualquier servidor web registra al atender una visita, como la dirección IP, el tipo de navegador y la fecha y hora.',
    ],
    closing:
      'El sitio no solicita datos personales sensibles. Aun así, tus fotos pueden mostrar a personas: al subirlas, te haces responsable de contar con la autorización de quienes aparecen en ellas, en especial si son menores de edad.',
  },
  {
    title: '3. Para qué se usan',
    paragraphs: ['Tus datos se usan únicamente para las finalidades necesarias para darte el servicio:'],
    items: [
      'Crear y administrar tu cuenta, y permitirte iniciar sesión.',
      'Guardar tus loterías, cartas y tableros para que puedas volver a ellas y descargarlas en PDF.',
      'Transformar con inteligencia artificial las fotos que tú elijas.',
      'Llevar tu saldo de tokens y procesar tus compras de tokens y de loterías de temporada.',
      'Enviarte los correos necesarios para el funcionamiento de tu cuenta, como la confirmación de registro y la recuperación de contraseña.',
      'Atender tus dudas o solicitudes, prevenir abusos y cumplir obligaciones legales.',
    ],
    closing:
      'Tus datos no se usan para publicidad ni se venden a nadie. El sitio no te envía correos promocionales.',
  },
  {
    title: '4. Si usas el sitio sin cuenta',
    paragraphs: [
      'Puedes crear cartas y tableros y descargar tu PDF sin registrarte. En ese caso, tus fotos y tu lotería se guardan solo en tu propio navegador y no se envían a los servidores del sitio. Si borras los datos de tu navegador, se pierden.',
      'Si después creas una cuenta o inicias sesión, lo que tenías guardado en el navegador se pasa a tu cuenta.',
    ],
  },
  {
    title: '5. Con quién se comparten',
    paragraphs: [
      'Para funcionar, el sitio se apoya en proveedores que tratan tus datos por encargo y solo para prestar su servicio. Algunos están fuera de México:',
    ],
    items: [
      'Supabase: guarda las cuentas, la base de datos y las imágenes que subes.',
      'Vercel: aloja y entrega el sitio web.',
      'Google: solo si eliges entrar con tu cuenta de Google.',
      'Replicate: recibe las fotos que tú decides transformar con inteligencia artificial, para generar la imagen resultante.',
      'Mercado Pago: procesa los pagos. Los datos de tu tarjeta o de tu medio de pago los capturas directamente con Mercado Pago; el sitio nunca los ve ni los guarda.',
    ],
    closing:
      'Fuera de estos casos, tus datos no se transfieren a terceros, salvo que una autoridad competente lo requiera conforme a la ley.',
  },
  {
    title: '6. Cookies y almacenamiento en tu navegador',
    paragraphs: [
      'El sitio guarda información en tu navegador solo para funcionar: mantener tu sesión iniciada, recordar tu idioma y conservar la lotería que estás armando. No usa cookies de publicidad ni herramientas de seguimiento o analítica de terceros.',
    ],
  },
  {
    title: '7. Cuánto tiempo se conservan',
    paragraphs: [
      'Tus datos y tu contenido se conservan mientras tu cuenta exista. Si pides que se elimine tu cuenta, se borran tus datos y tu contenido, salvo los registros de compras que deban conservarse por obligaciones legales o para aclarar pagos.',
    ],
  },
  {
    title: '8. Tus derechos (acceso, rectificación, cancelación y oposición)',
    paragraphs: [
      'Tienes derecho a conocer qué datos tuyos se tienen y para qué se usan, a pedir que se corrijan si son inexactos, a que se eliminen cuando ya no sean necesarios y a oponerte a su uso para fines específicos. También puedes revocar el consentimiento que hayas dado.',
      `Para ejercer cualquiera de estos derechos, escribe a ${PRIVACY_CONTACT_EMAIL} desde el correo con el que te registraste, indicando:`,
    ],
    items: [
      'Tu nombre y el correo de tu cuenta.',
      'Qué derecho quieres ejercer y sobre qué datos.',
      'Cualquier información que ayude a localizar tus datos.',
    ],
    closing:
      'Recibirás respuesta en un plazo máximo de 20 días hábiles. Si tu solicitud procede, se hará efectiva dentro de los 15 días hábiles siguientes. Si consideras que tu derecho no fue atendido, puedes acudir a la autoridad competente en materia de protección de datos personales.',
  },
  {
    title: '9. Cambios a este aviso',
    paragraphs: [
      'Este aviso puede cambiar si cambia el sitio o la ley. La versión vigente estará siempre en esta página, con su fecha de última actualización.',
    ],
  },
];
