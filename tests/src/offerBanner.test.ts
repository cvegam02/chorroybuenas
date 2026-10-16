import { describe, expect, it } from 'vitest';
import {
  BANNER_TARGET_PATHS,
  bannerDraftFromOffer,
  bannerFieldsFromDraft,
  bannerPlacesLabel,
  dismissBanner,
  isBannerDismissed,
  shouldShowBanner,
  bannerFilePath,
  bannerTexts,
  checkBannerImage,
  checkBannerVideo,
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

describe('textos del banner en el sitio', () => {
  it('existen en español y en inglés', () => {
    for (const locale of [es, en]) {
      expect(locale.offerBanner.endsIn).toContain('{{time}}');
      expect(locale.offerBanner.days_one).toContain('{{count}}');
      expect(locale.offerBanner.days_other).toContain('{{count}}');
      expect(locale.offerBanner.hours).toContain('{{count}}');
      expect(locale.offerBanner.minutes).toContain('{{count}}');
      for (const key of ['close', 'soundOn', 'soundOff', 'playVideo', 'label'] as const) {
        expect(locale.offerBanner[key]).toBeTruthy();
      }
    }
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
    expect(shouldShowBanner(offer, 'home', false)).toBe(true);
    expect(shouldShowBanner(offer, 'dashboard', false)).toBe(false);
    expect(shouldShowBanner({ ...offer, banner_enabled: false }, 'home', false)).toBe(false);
    expect(shouldShowBanner(offer, 'home', true)).toBe(false);
    expect(shouldShowBanner(null, 'home', false)).toBe(false);
  });
});

describe('cerrar el banner se recuerda en el navegador, por oferta (decisión 13)', () => {
  const memoryStorage = () => {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
  };

  it('quien lo cierra no lo vuelve a ver en esa oferta, pero sí en la siguiente', () => {
    const storage = memoryStorage();
    expect(isBannerDismissed(storage, 'o1')).toBe(false);
    dismissBanner(storage, 'o1');
    expect(isBannerDismissed(storage, 'o1')).toBe(true);
    expect(isBannerDismissed(storage, 'o2')).toBe(false);
  });

  it('sin almacenamiento del navegador (modo privado, bloqueado), se muestra y cerrar no falla', () => {
    const broken = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
    };
    expect(isBannerDismissed(broken, 'o1')).toBe(false);
    expect(() => dismissBanner(broken, 'o1')).not.toThrow();
    expect(isBannerDismissed(null, 'o1')).toBe(false);
  });
});
