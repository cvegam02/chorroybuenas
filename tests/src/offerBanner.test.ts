import { describe, expect, it } from 'vitest';
import {
  BANNER_TARGET_PATHS,
  bannerDraftFromOffer,
  bannerFieldsFromDraft,
  bannerPlacesLabel,
  isBannerMinimized,
  minimizeBanner,
  restoreBanner,
  formatMiniCountdown,
  shouldShowBanner,
  bannerFilePath,
  bannerTexts,
  checkBannerImage,
  checkBannerVideo,
  formatCountdown,
  shouldRevealToast,
  timeLeft,
  validateBannerForm,
  type BannerForm,
} from '../../src/utils/offerBanner';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';

const MB = 1024 * 1024;

describe('checkBannerVideo (decisión 10: MP4, máximo 15 s y 8 MB)', () => {
  it('acepta el video de la maqueta', () => {
    expect(checkBannerVideo({ type: 'video/mp4', size: 5.4 * MB, duration: 12 })).toBe(null);
  });

  it.each([
    ['otro formato', { type: 'video/webm', size: MB, duration: 5 }, 'El video tiene que ser MP4.'],
    ['muy pesado', { type: 'video/mp4', size: 8 * MB + 1, duration: 5 }, 'El video pesa más de 8 MB.'],
    ['muy largo', { type: 'video/mp4', size: MB, duration: 15.6 }, 'El video dura más de 15 segundos.'],
    ['sin duración legible', { type: 'video/mp4', size: MB, duration: Number.NaN }, 'No se pudo leer el video. Prueba con otro MP4.'],
  ])('rechaza: %s', (_name, file, message) => {
    expect(checkBannerVideo(file)).toBe(message);
  });

  it('15 segundos exactos (con el redondeo de los codificadores) sí pasan', () => {
    expect(checkBannerVideo({ type: 'video/mp4', size: MB, duration: 15.04 })).toBe(null);
  });
});

describe('checkBannerImage', () => {
  it('acepta JPG, PNG y WebP de hasta 8 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(checkBannerImage({ type, size: MB })).toBe(null);
    }
  });

  it('rechaza otros formatos y las muy pesadas', () => {
    expect(checkBannerImage({ type: 'image/gif', size: MB })).toBe('La imagen tiene que ser JPG, PNG o WebP.');
    expect(checkBannerImage({ type: 'image/jpeg', size: 9 * MB })).toBe('La imagen pesa más de 8 MB.');
  });
});

describe('validateBannerForm', () => {
  const form: BannerForm = {
    enabled: true,
    hasVideo: true,
    hasImage: true,
    titleEs: '¡Buen Fin! Tokens a $1.50',
    textEs: '25% de descuento en todos los paquetes.',
    buttonEs: 'Aprovechar oferta',
    titleEn: '',
    textEn: '',
    buttonEn: '',
    target: 'buy_tokens',
    onHome: true,
    onDashboard: true,
    countdown: true,
  };

  it('acepta el banner de la maqueta', () => {
    expect(validateBannerForm(form)).toEqual({});
  });

  it('encendido, pide video, imagen, título, botón y una pantalla', () => {
    expect(validateBannerForm({ ...form, hasVideo: false, hasImage: false, titleEs: ' ', buttonEs: '', onHome: false, onDashboard: false })).toEqual({
      video: 'Sube el video.',
      image: 'Falta la imagen para celular.',
      titleEs: 'Escribe el título.',
      buttonEs: 'Escribe el texto del botón.',
      screens: 'Elige al menos una pantalla.',
    });
  });

  it('apagado, no pide nada más que respetar los largos', () => {
    expect(validateBannerForm({ ...form, enabled: false, hasVideo: false, titleEs: '' })).toEqual({});
    expect(validateBannerForm({ ...form, enabled: false, titleEn: 'x'.repeat(81) })).toEqual({
      titleEn: 'Hasta 80 caracteres.',
    });
  });

  it('largos máximos: título 80, texto 200, botón 40', () => {
    expect(validateBannerForm({ ...form, titleEs: 'x'.repeat(81), textEs: 'x'.repeat(201), buttonEn: 'x'.repeat(41) })).toEqual({
      titleEs: 'Hasta 80 caracteres.',
      textEs: 'Hasta 200 caracteres.',
      buttonEn: 'Hasta 40 caracteres.',
    });
  });
});

describe('bannerTexts (decisión 15)', () => {
  const banner = {
    banner_title_es: 'Título', banner_text_es: 'Texto', banner_button_es: 'Botón',
    banner_title_en: 'Title', banner_text_en: null, banner_button_en: '  ',
  };

  it('en español, los de español', () => {
    expect(bannerTexts(banner, 'es')).toEqual({ title: 'Título', text: 'Texto', button: 'Botón' });
  });

  it('en inglés, los capturados en inglés y, si falta alguno, el de español', () => {
    expect(bannerTexts(banner, 'en')).toEqual({ title: 'Title', text: 'Texto', button: 'Botón' });
    expect(bannerTexts(banner, 'en-US').title).toBe('Title');
  });
});

describe('a dónde lleva el botón', () => {
  it('Comprar tokens, Crear lotería o Temáticas', () => {
    expect(BANNER_TARGET_PATHS).toEqual({ buy_tokens: '/comprar-tokens', create: '/cards', themed: '/tematicas' });
  });
});

describe('timeLeft (cuenta regresiva)', () => {
  const ends = '2026-11-18T06:59:59Z';
  const starts = '2026-11-13T07:00:00Z';

  it('días, horas y minutos que faltan', () => {
    expect(timeLeft(ends, starts, new Date('2026-11-15T20:00:00Z'))).toEqual({ days: 2, hours: 10, minutes: 59 });
  });

  it('antes de empezar (vista previa), cuenta desde el inicio', () => {
    expect(timeLeft(ends, starts, new Date('2026-10-16T00:00:00Z'))).toEqual({ days: 4, hours: 23, minutes: 59 });
  });

  it('terminada, nada', () => {
    expect(timeLeft(ends, starts, new Date('2026-11-19T00:00:00Z'))).toBe(null);
  });
});

describe('formatCountdown (contador del aviso, US A6)', () => {
  it('con un día o más: días y horas', () => {
    expect(formatCountdown({ days: 31, hours: 23, minutes: 40 })).toBe('31d 23h');
    expect(formatCountdown({ days: 1, hours: 0, minutes: 5 })).toBe('1d 0h');
  });

  it('con menos de un día: horas y minutos', () => {
    expect(formatCountdown({ days: 0, hours: 23, minutes: 15 })).toBe('23h 15m');
    expect(formatCountdown({ days: 0, hours: 0, minutes: 7 })).toBe('0h 7m');
  });

  it('en el último minuto no dice 0m', () => {
    expect(formatCountdown({ days: 0, hours: 0, minutes: 0 })).toBe('0h 1m');
  });
});

describe('shouldRevealToast (cuándo aparece el aviso, US A6)', () => {
  it('a los 3 segundos de cargar', () => {
    expect(shouldRevealToast(2999, 0)).toBe(false);
    expect(shouldRevealToast(3000, 0)).toBe(true);
  });

  it('o al bajar más de 300 px, lo que pase primero', () => {
    expect(shouldRevealToast(500, 300)).toBe(false);
    expect(shouldRevealToast(500, 301)).toBe(true);
  });
});

describe('textos del banner en el sitio', () => {
  it('existen en español y en inglés', () => {
    for (const locale of [es, en]) {
      expect(locale.offerBanner.endsIn).toContain('{{time}}');
      for (const key of ['close', 'watchVideo', 'playVideo', 'closeVideo', 'label', 'reopen', 'stillHere', 'see'] as const) {
        expect(locale.offerBanner[key]).toBeTruthy();
      }
    }
  });

  it('la ✕ se anuncia como «Cerrar promoción»', () => {
    expect(es.offerBanner.close).toBe('Cerrar promoción');
  });

  it('el indicador se anuncia como «Ver promoción <título>»', () => {
    for (const locale of [es, en]) expect(locale.offerBanner.reopen).toContain('{{title}}');
    expect(es.offerBanner.reopen).toBe('Ver promoción {{title}}');
  });
});

describe('bannerFilePath', () => {
  it('<id de la oferta>/<tipo>-<momento>.<extensión>', () => {
    expect(bannerFilePath('o1', 'video', 'video/mp4', 1700000000000)).toBe('o1/video-1700000000000.mp4');
    expect(bannerFilePath('o1', 'image', 'image/jpeg', 1)).toBe('o1/image-1.jpg');
    expect(bannerFilePath('o1', 'image', 'image/webp', 1)).toBe('o1/image-1.webp');
  });
});

describe('formulario del banner ↔ oferta guardada', () => {
  it('una oferta sin banner abre el formulario apagado, a Comprar tokens, en las dos pantallas y con cuenta regresiva', () => {
    expect(bannerDraftFromOffer(null)).toEqual({
      enabled: false, titleEs: '', textEs: '', buttonEs: '', titleEn: '', textEn: '', buttonEn: '',
      target: 'buy_tokens', onHome: true, onDashboard: true, countdown: true,
    });
  });

  it('guarda los textos sin espacios de más, y vacíos como nulos', () => {
    const draft = { ...bannerDraftFromOffer(null), enabled: true, titleEs: ' Buen Fin ', buttonEs: 'Ir', textEn: '  ' };
    expect(bannerFieldsFromDraft(draft, { video: 'o1/video-1.mp4', image: 'o1/image-1.jpg' })).toEqual({
      banner_enabled: true,
      banner_video_path: 'o1/video-1.mp4',
      banner_image_path: 'o1/image-1.jpg',
      banner_title_es: 'Buen Fin', banner_text_es: null, banner_button_es: 'Ir',
      banner_title_en: null, banner_text_en: null, banner_button_en: null,
      banner_target: 'buy_tokens', banner_on_home: true, banner_on_dashboard: true, banner_countdown: true,
    });
  });

  it('lo guardado regresa al formulario', () => {
    const fields = bannerFieldsFromDraft({ ...bannerDraftFromOffer(null), titleEs: 'Hola', target: 'themed', onHome: false }, { video: null, image: null });
    expect(bannerDraftFromOffer(fields)).toMatchObject({ titleEs: 'Hola', target: 'themed', onHome: false, onDashboard: true });
  });
});

describe('bannerPlacesLabel (tarjeta de Precios y promos)', () => {
  const on = { banner_enabled: true, banner_on_home: true, banner_on_dashboard: true };
  it.each([
    [on, 'banner en Inicio y Mi cuenta'],
    [{ ...on, banner_on_dashboard: false }, 'banner en Inicio'],
    [{ ...on, banner_on_home: false }, 'banner en Mi cuenta'],
    [{ ...on, banner_enabled: false }, 'sin banner'],
  ])('%o → %s', (fields, label) => {
    expect(bannerPlacesLabel(fields)).toBe(label);
  });
});

describe('cuándo sale el banner (US A5)', () => {
  const offer = { id: 'o1', banner_enabled: true, banner_on_home: true, banner_on_dashboard: false };

  it('solo encendido, en las pantallas elegidas y si no se cerró', () => {
    expect(shouldShowBanner(offer, 'home')).toBe(true);
    expect(shouldShowBanner(offer, 'dashboard')).toBe(false);
    expect(shouldShowBanner({ ...offer, banner_enabled: false }, 'home')).toBe(false);
    expect(shouldShowBanner(null, 'home')).toBe(false);
  });
});

describe('cerrar minimiza y se recuerda en el navegador, por oferta (decisión 13, US A7)', () => {
  const memoryStorage = () => {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    };
  };

  it('minimizada en esa oferta; la siguiente sale completa', () => {
    const storage = memoryStorage();
    expect(isBannerMinimized(storage, 'o1')).toBe(false);
    minimizeBanner(storage, 'o1');
    expect(isBannerMinimized(storage, 'o1')).toBe(true);
    expect(isBannerMinimized(storage, 'o2')).toBe(false);
  });

  it('reabrirla desde el indicador borra la marca', () => {
    const storage = memoryStorage();
    minimizeBanner(storage, 'o1');
    restoreBanner(storage, 'o1');
    expect(isBannerMinimized(storage, 'o1')).toBe(false);
  });

  it('la marca lleva el id de la oferta', () => {
    const storage = memoryStorage();
    minimizeBanner(storage, 'o1');
    expect(storage.getItem('offer-banner-minimized:o1')).toBe('1');
  });

  it('sin almacenamiento del navegador (modo privado, bloqueado), sale completa y nada falla', () => {
    const broken = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
      removeItem: () => { throw new Error('bloqueado'); },
    };
    expect(isBannerMinimized(broken, 'o1')).toBe(false);
    expect(() => minimizeBanner(broken, 'o1')).not.toThrow();
    expect(() => restoreBanner(broken, 'o1')).not.toThrow();
    expect(isBannerMinimized(null, 'o1')).toBe(false);
  });
});

describe('formatMiniCountdown (indicador minimizado, US A7)', () => {
  it('con un día o más, solo días', () => {
    expect(formatMiniCountdown({ days: 31, hours: 23, minutes: 5 })).toBe('31d');
  });

  it('con menos de un día, horas', () => {
    expect(formatMiniCountdown({ days: 0, hours: 23, minutes: 59 })).toBe('23h');
  });

  it('en la última hora, minutos (nunca 0)', () => {
    expect(formatMiniCountdown({ days: 0, hours: 0, minutes: 12 })).toBe('12m');
    expect(formatMiniCountdown({ days: 0, hours: 0, minutes: 0 })).toBe('1m');
  });
});
