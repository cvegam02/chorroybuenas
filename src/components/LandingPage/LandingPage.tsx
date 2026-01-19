import { Link } from 'react-router-dom';
import { 
  FaCamera, 
  FaDice, 
  FaDownload, 
  FaBaby, 
  FaUsers, 
  FaBriefcase, 
  FaLaugh, 
  FaChild, 
  FaBirthdayCake,
  FaImage,
  FaPaintBrush,
  FaBullseye,
  FaFilePdf,
  FaGamepad,
  FaBook,
  FaHeart,
  FaArrowRight,
  FaStar
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
        <div className="landing-page__hero-logo">
          <img src={logoImage} alt="chorroybuenas.com.mx" />
        </div>
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
        <div className="landing-page__hero-visual">
          <div className="landing-page__hero-card landing-page__hero-card--1"></div>
          <div className="landing-page__hero-card landing-page__hero-card--2"></div>
          <div className="landing-page__hero-card landing-page__hero-card--3"></div>
        </div>
      </section>

      <main className="landing-page__main">
        {/* Quick Steps - Horizontal Bar */}
        <section className="landing-page__steps">
          <div className="landing-page__step">
            <div className="landing-page__step-icon">
              <FaCamera />
            </div>
            <div className="landing-page__step-content">
              <h3>Sube Imágenes</h3>
              <p>Mínimo 20 cartas</p>
            </div>
          </div>
          <div className="landing-page__step">
            <div className="landing-page__step-icon">
              <FaDice />
            </div>
            <div className="landing-page__step-content">
              <h3>Genera Tableros</h3>
              <p>Mínimo 8 tableros</p>
            </div>
          </div>
          <div className="landing-page__step">
            <div className="landing-page__step-icon">
              <FaDownload />
            </div>
            <div className="landing-page__step-content">
              <h3>Descarga PDF</h3>
              <p>Listo para imprimir</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="landing-page__features">
          <h2 className="landing-page__section-title">¿Por qué elegirnos?</h2>
          <div className="landing-page__features-grid">
            <div className="landing-page__feature">
              <div className="landing-page__feature-icon">
                <FaImage />
              </div>
              <h3>100% Personalizable</h3>
              <p>Usa tus propias imágenes para crear cartas únicas y originales</p>
            </div>
            <div className="landing-page__feature">
              <div className="landing-page__feature-icon">
                <FaPaintBrush />
              </div>
              <h3>Editor Integrado</h3>
              <p>Recorta y ajusta tus imágenes fácilmente</p>
            </div>
            <div className="landing-page__feature">
              <div className="landing-page__feature-icon">
                <FaBullseye />
              </div>
              <h3>Múltiples Tableros</h3>
              <p>Genera todos los que necesites</p>
            </div>
            <div className="landing-page__feature">
              <div className="landing-page__feature-icon">
                <FaFilePdf />
              </div>
              <h3>PDF Profesional</h3>
              <p>Descarga listo para imprimir</p>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section className="landing-page__events">
          <h2 className="landing-page__section-title">Perfecta para cualquier ocasión</h2>
          <div className="landing-page__events-grid">
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBaby />
              </div>
              <h3>Baby Showers</h3>
              <p>Crea una lotería temática con fotos del futuro bebé</p>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaUsers />
              </div>
              <h3>Eventos Familiares</h3>
              <p>Reuniones, cumpleaños y aniversarios</p>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBriefcase />
              </div>
              <h3>Eventos Corporativos</h3>
              <p>Team building y fiestas de oficina</p>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaLaugh />
              </div>
              <h3>Fiestas con Amigos</h3>
              <p>Haz más divertidas tus reuniones</p>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaChild />
              </div>
              <h3>Para Niños</h3>
              <p>Con sus personajes favoritos</p>
            </div>
            <div className="landing-page__event">
              <div className="landing-page__event-icon">
                <FaBirthdayCake />
              </div>
              <h3>Otras Celebraciones</h3>
              <p>Bodas, graduaciones y más</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="landing-page__cta">
          <div className="landing-page__cta-content">
            <h2>¿Listo para comenzar?</h2>
            <p>Crea recuerdos inolvidables en minutos</p>
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
