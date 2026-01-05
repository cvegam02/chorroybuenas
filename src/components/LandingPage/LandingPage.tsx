import { Link } from 'react-router-dom';
import './LandingPage.css';
import heroImage from '../../img/Gemini_Generated_Image_35qv4s35qv4s35qv.png';
import logoImage from '../../img/logo.png';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage = ({ onStart }: LandingPageProps) => {
  return (
    <div className="landing-page">
      {/* Decoraciones flotantes */}
      <div className="landing-page__decorations">
        <div className="landing-page__decoration landing-page__decoration--1">🎴</div>
        <div className="landing-page__decoration landing-page__decoration--2">🎲</div>
        <div className="landing-page__decoration landing-page__decoration--3">🎯</div>
        <div className="landing-page__decoration landing-page__decoration--4">🎨</div>
        <div className="landing-page__decoration landing-page__decoration--5">🎉</div>
        <div className="landing-page__decoration landing-page__decoration--6">🌟</div>
        <div className="landing-page__decoration landing-page__decoration--7">🃏</div>
        <div className="landing-page__decoration landing-page__decoration--8">🀄</div>
        <div className="landing-page__decoration landing-page__decoration--9">🎰</div>
        <div className="landing-page__decoration landing-page__decoration--10">🎴</div>
        <div className="landing-page__decoration landing-page__decoration--11">🃏</div>
        <div className="landing-page__decoration landing-page__decoration--12">🎴</div>
      </div>
      <main className="landing-page__main">
        {/* Logo destacado al inicio */}
        <div className="landing-page__logo-showcase landing-page__section-animate">
          <img 
            src={logoImage} 
            alt="chorroybuenas.com.mx" 
            className="landing-page__logo-showcase-image"
          />
        </div>

        <section className="landing-page__hero landing-page__section-animate">
          <div className="landing-page__hero-content">
            <h2 className="landing-page__hero-title">
              ¡Diversión tradicional con un toque personal!
            </h2>
            <p className="landing-page__hero-description">
              Diseña tus propias cartas, crea tableros únicos y disfruta de la Lotería Mexicana 
              con tus imágenes y temas favoritos. Perfecta para baby showers, eventos familiares, 
              eventos del trabajo, convivencias con amigos o incluso para niños.
            </p>
            <button 
              onClick={onStart}
              className="landing-page__cta-button landing-page__cta-button--animated"
            >
              Crear mi Lotería
            </button>
          </div>
          <div className="landing-page__hero-image">
            <div className="landing-page__hero-image-decoration">🎴</div>
            <img 
              src={heroImage} 
              alt="Juego de Lotería Mexicana personalizada" 
              className="landing-page__hero-image-img"
            />
            <div className="landing-page__hero-image-decoration landing-page__hero-image-decoration--right">🎲</div>
          </div>
        </section>

        <section className="landing-page__how-it-works landing-page__section-animate">
          <h2 className="landing-page__section-title landing-page__title-animate">¿Cómo funciona nuestra app?</h2>
          <div className="landing-page__steps-v2">
            <div className="landing-page__step-v2 landing-page__step-animate" style={{ animationDelay: '0.1s' }}>
              <div className="landing-page__step-v2-icon-wrapper">
                <div className="landing-page__step-v2-number">1</div>
                <div className="landing-page__step-v2-icon">📸</div>
              </div>
              <div className="landing-page__step-v2-content">
                <h3>Prepara tus cartas</h3>
                <p>
                  Sube tus propias imágenes y asígnales un título. Puedes usar fotos familiares, 
                  memes, mascotas, o cualquier imagen que quieras. Necesitas mínimo 30 cartas 
                  (recomendamos 54 para una experiencia completa).
                </p>
              </div>
              <div className="landing-page__step-v2-arrow">→</div>
            </div>
            <div className="landing-page__step-v2 landing-page__step-animate" style={{ animationDelay: '0.2s' }}>
              <div className="landing-page__step-v2-icon-wrapper">
                <div className="landing-page__step-v2-number">2</div>
                <div className="landing-page__step-v2-icon">🎲</div>
              </div>
              <div className="landing-page__step-v2-content">
                <h3>Genera los tableros</h3>
                <p>
                  Elige cuántos tableros necesitas (mínimo 8). Cada tablero tendrá 16 cartas 
                  únicas seleccionadas aleatoriamente de tu baraja personalizada.
                </p>
              </div>
              <div className="landing-page__step-v2-arrow">→</div>
            </div>
            <div className="landing-page__step-v2 landing-page__step-animate" style={{ animationDelay: '0.3s' }}>
              <div className="landing-page__step-v2-icon-wrapper">
                <div className="landing-page__step-v2-number">3</div>
                <div className="landing-page__step-v2-icon">🎉</div>
              </div>
              <div className="landing-page__step-v2-content">
                <h3>Descarga y juega</h3>
                <p>
                  Descarga el PDF con todos los tableros y la baraja completa. Imprime los 
                  tableros, repártelos entre los jugadores, y ¡a disfrutar!
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-page__events landing-page__section-animate">
          <h2 className="landing-page__section-title landing-page__title-animate">Perfecta para cualquier ocasión</h2>
          <p className="landing-page__events-intro">
            Personaliza tu Lotería Mexicana para hacer cualquier evento más memorable y divertido
          </p>
          <div className="landing-page__events-grid">
            <div className="landing-page__event landing-page__event-animate" style={{ animationDelay: '0.1s' }}>
              <span className="landing-page__event-icon">👶</span>
              <h3>Baby Showers</h3>
              <p>Crea una lotería temática con fotos del futuro bebé, ecografías o elementos relacionados con la llegada del nuevo miembro de la familia</p>
            </div>
            <div className="landing-page__event landing-page__event-animate" style={{ animationDelay: '0.2s' }}>
              <span className="landing-page__event-icon">👨‍👩‍👧‍👦</span>
              <h3>Eventos Familiares</h3>
              <p>Úsala en reuniones familiares, cumpleaños, aniversarios o cualquier celebración especial con fotos de la familia</p>
            </div>
            <div className="landing-page__event landing-page__event-animate" style={{ animationDelay: '0.3s' }}>
              <span className="landing-page__event-icon">💼</span>
              <h3>Eventos del Trabajo</h3>
              <p>Ideal para team building, fiestas de oficina o eventos corporativos. Incluye memes del trabajo, fotos del equipo o eventos de la empresa</p>
            </div>
            <div className="landing-page__event landing-page__event-animate" style={{ animationDelay: '0.4s' }}>
              <span className="landing-page__event-icon">🎉</span>
              <h3>Convivencias con Amigos</h3>
              <p>Haz más divertidas tus fiestas y reuniones con amigos usando fotos divertidas, memes compartidos o momentos especiales juntos</p>
            </div>
            <div className="landing-page__event landing-page__event-animate" style={{ animationDelay: '0.5s' }}>
              <span className="landing-page__event-icon">🧒</span>
              <h3>Para Niños</h3>
              <p>Versión especial para los más pequeños con sus personajes favoritos, animales, juguetes o cualquier tema que les encante</p>
            </div>
            <div className="landing-page__event landing-page__event-animate" style={{ animationDelay: '0.6s' }}>
              <span className="landing-page__event-icon">🎊</span>
              <h3>Otras Celebraciones</h3>
              <p>Bodas, graduaciones, despedidas de soltero/a, o cualquier otra celebración donde quieras agregar un toque único y divertido</p>
            </div>
          </div>
        </section>

        <section className="landing-page__features landing-page__section-animate">
          <h2 className="landing-page__section-title landing-page__title-animate">Características</h2>
          <div className="landing-page__features-grid">
            <div className="landing-page__feature landing-page__feature-animate" style={{ animationDelay: '0.1s' }}>
              <span className="landing-page__feature-icon">📸</span>
              <h3>Personaliza</h3>
              <p>Usa tus propias imágenes para crear cartas únicas</p>
            </div>
            <div className="landing-page__feature landing-page__feature-animate" style={{ animationDelay: '0.2s' }}>
              <span className="landing-page__feature-icon">🎨</span>
              <h3>Editor de Imágenes</h3>
              <p>Recorta y ajusta tus imágenes con zoom y pan</p>
            </div>
            <div className="landing-page__feature landing-page__feature-animate" style={{ animationDelay: '0.3s' }}>
              <span className="landing-page__feature-icon">🎯</span>
              <h3>Múltiples Tableros</h3>
              <p>Genera tantos tableros como necesites para tu evento</p>
            </div>
            <div className="landing-page__feature landing-page__feature-animate" style={{ animationDelay: '0.4s' }}>
              <span className="landing-page__feature-icon">📄</span>
              <h3>PDF Listo</h3>
              <p>Descarga todo en un PDF profesional para imprimir</p>
            </div>
          </div>
        </section>

        <section className="landing-page__cta-section">
          <h2 className="landing-page__cta-title">¿Listo para crear tu Lotería?</h2>
          <p className="landing-page__cta-text">
            Empieza ahora y crea recuerdos inolvidables con tu familia y amigos
          </p>
          <button 
            onClick={onStart}
            className="landing-page__cta-button landing-page__cta-button--large"
          >
            ¡Empezar ahora! 🎉
          </button>
        </section>

        <section className="landing-page__info-links">
          <div className="landing-page__info-links-container">
            <Link to="/como-se-juega" className="landing-page__info-link">
              <span className="landing-page__info-link-icon">🎮</span>
              <h3>¿Cómo se juega?</h3>
              <p>Aprende a jugar la Lotería Mexicana paso a paso</p>
            </Link>
            <Link to="/que-es-la-loteria" className="landing-page__info-link">
              <span className="landing-page__info-link-icon">📚</span>
              <h3>¿Qué es la Lotería?</h3>
              <p>Conoce más sobre esta tradición mexicana</p>
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-page__footer">
        <p>chorroybuenas.com.mx - Hecho con ❤️ para mantener viva la tradición mexicana</p>
      </footer>
    </div>
  );
};

