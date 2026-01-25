import { Link } from 'react-router-dom';
import {
  FaGamepad,
  FaBook,
  FaHeart,
  FaArrowRight,
  FaStar,
  FaImage,
  FaPalette,
  FaBullseye,
  FaFilePdf,
  FaCamera,
  FaDice,
  FaDownload,
  FaBaby,
  FaUsers,
  FaBriefcase,
  FaSmile,
  FaBirthdayCake,
  FaChild
} from 'react-icons/fa';
import './LandingPage.css';
import logoImage from '../../img/logo.png';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage = ({ onStart }: LandingPageProps) => {
  return (
    <div className="landing-page">
      {/* Hero Section - Full Width con Imagen de Fondo */}
      <section className="landing-page__hero">
        <div className="landing-page__hero-overlay"></div>
        <div className="landing-page__hero-content">
          <div className="landing-page__hero-badge">
            <FaStar />
            <span>Gratis y Sin Registro</span>
          </div>
          <h1 className="landing-page__hero-title">
            Lotería Mexicana<br />
            <span className="landing-page__hero-title--highlight">Personalizada</span>
          </h1>
          <p className="landing-page__hero-description">
            Crea tableros únicos con tus propias imágenes para cualquier celebración
          </p>
          <button
            onClick={onStart}
            className="landing-page__cta-button landing-page__cta-button--hero"
          >
            Crear Ahora
            <FaArrowRight />
          </button>
        </div>
        <div className="landing-page__hero-logo">
          <img src={logoImage} alt="chorroybuenas.com.mx" />
        </div>
        <div className="landing-page__hero-visual">
          <div className="landing-page__hero-card landing-page__hero-card--1"></div>
          <div className="landing-page__hero-card landing-page__hero-card--2"></div>
          <div className="landing-page__hero-card landing-page__hero-card--3"></div>
        </div>
      </section>

      <main className="landing-page__main">
        {/* Features Section */}
        <section className="landing-page__features">
          <div className="landing-page__features-container">
            <div className="landing-page__features-image">
              <img src="/amigos.png" alt="Celebra con tus amigos" />
            </div>
            <div className="landing-page__features-content">
              <div className="landing-page__section-header">
                <h2 className="landing-page__section-title">¿Por qué elegirnos?</h2>
                <p className="landing-page__section-subtitle">
                  Todo lo que necesitas para crear tu lotería personalizada en un solo lugar
                </p>
              </div>
              <div className="landing-page__features-list">
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaImage />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>100% Personalizable</h3>
                    <p>Usa tus propias imágenes para crear cartas únicas y originales que reflejen tu estilo</p>
                  </div>
                </div>
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaPalette />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>Editor Integrado</h3>
                    <p>Recorta y ajusta tus imágenes fácilmente con nuestra herramienta intuitiva</p>
                  </div>
                </div>
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaBullseye />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>Múltiples Tableros</h3>
                    <p>Genera todos los tableros que necesites para tu evento o celebración</p>
                  </div>
                </div>
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaFilePdf />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>PDF Profesional</h3>
                    <p>Descarga tus tableros en formato PDF listo para imprimir</p>
                  </div>
                </div>
                <div className="landing-page__feature-item">
                  <div className="landing-page__feature-icon">
                    <FaChild />
                  </div>
                  <div className="landing-page__feature-text">
                    <h3>Nuevo: Modo Kids</h3>
                    <p>Tableros de 3x3 con cartas grandes, ideales para niños pequeños y preescolar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Steps - Horizontal Bar */}
        <section className="landing-page__steps">
          <div className="landing-page__steps-header">
            <h2 className="landing-page__steps-title">Crea y Juega Fácilmente</h2>
            <p className="landing-page__steps-subtitle">
              En solo 3 simples pasos tendrás tu lotería personalizada lista para imprimir
            </p>
          </div>
          <div className="landing-page__steps-decorative"></div>
          <div className="landing-page__steps-container">
            <div className="landing-page__step">
              <div className="landing-page__step-number">1</div>
              <div className="landing-page__step-icon">
                <FaCamera />
              </div>
              <div className="landing-page__step-content">
                <h3>Sube Imágenes</h3>
                <p>Mínimo 20 cartas para empezar</p>
              </div>
              <div className="landing-page__step-arrow">→</div>
            </div>
            <div className="landing-page__step">
              <div className="landing-page__step-number">2</div>
              <div className="landing-page__step-icon">
                <FaDice />
              </div>
              <div className="landing-page__step-content">
                <h3>Genera Tableros</h3>
                <p>Mínimo 8 tableros únicos</p>
              </div>
              <div className="landing-page__step-arrow">→</div>
            </div>
            <div className="landing-page__step">
              <div className="landing-page__step-number">3</div>
              <div className="landing-page__step-icon">
                <FaDownload />
              </div>
              <div className="landing-page__step-content">
                <h3>Descarga PDF</h3>
                <p>Listo para imprimir y jugar</p>
              </div>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section className="landing-page__events">
          <div className="landing-page__section-header">
            <h2 className="landing-page__section-title">Perfecta para cualquier ocasión</h2>
            <p className="landing-page__section-subtitle">
              Celebra tus momentos especiales con un toque de tradición mexicana
            </p>
          </div>
          <div className="landing-page__events-grid">
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBaby />
              </div>
              <div className="landing-page__event-content">
                <h3>Baby Showers</h3>
                <p>Crea una lotería temática con fotos del futuro bebé</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaUsers />
              </div>
              <div className="landing-page__event-content">
                <h3>Eventos Familiares</h3>
                <p>Reuniones, cumpleaños y aniversarios</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBriefcase />
              </div>
              <div className="landing-page__event-content">
                <h3>Eventos Corporativos</h3>
                <p>Team building y fiestas de oficina</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaSmile />
              </div>
              <div className="landing-page__event-content">
                <h3>Fiestas con Amigos</h3>
                <p>Haz más divertidas tus reuniones</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBirthdayCake />
              </div>
              <div className="landing-page__event-content">
                <h3>Para Niños</h3>
                <p>Con sus personajes favoritos y cartas grandes (3x3)</p>
              </div>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBirthdayCake />
              </div>
              <div className="landing-page__event-content">
                <h3>Otras Celebraciones</h3>
                <p>Bodas, graduaciones y más</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-page__cta">
          <div className="landing-page__cta-decorative"></div>
          <div className="landing-page__cta-content">
            <div className="landing-page__cta-badge">
              <FaStar />
              <span>Sin costo, sin registro</span>
            </div>
            <h2>¿Listo para comenzar?</h2>
            <p>Crea recuerdos inolvidables en minutos. ¡Empieza ahora y diviértete con tu lotería personalizada!</p>
            <button
              onClick={onStart}
              className="landing-page__cta-button landing-page__cta-button--primary"
            >
              Crear mi Lotería
              <FaArrowRight />
            </button>
          </div>
        </section>

        {/* Info Links */}
        <section className="landing-page__info">
          <Link to="/como-se-juega" className="landing-page__info-link">
            <FaGamepad />
            <span>¿Cómo se juega?</span>
          </Link>
          <Link to="/que-es-la-loteria" className="landing-page__info-link">
            <FaBook />
            <span>¿Qué es la Lotería?</span>
          </Link>
        </section>
      </main>

      <footer className="landing-page__footer">
        <p>chorroybuenas.com.mx</p>
        <p>Hecho con <FaHeart /> para mantener viva la tradición mexicana</p>
      </footer>
    </div>
  );
};
