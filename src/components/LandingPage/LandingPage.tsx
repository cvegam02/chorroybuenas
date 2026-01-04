import './LandingPage.css';
import heroImage from '../../img/Gemini_Generated_Image_35qv4s35qv4s35qv.png';
import logoImage from '../../img/logo.png';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage = ({ onStart }: LandingPageProps) => {
  return (
    <div className="landing-page">
      <header className="landing-page__header">
        <div 
          className="landing-page__header-background"
          style={{ backgroundImage: `url(${logoImage})` }}
        ></div>
        <div className="landing-page__header-content">
          <div className="landing-page__logo">
            <img 
              src={logoImage} 
              alt="chorroybuenas.mx - Lotería Personalizada" 
              className="landing-page__logo-image"
            />
          </div>
          <div className="landing-page__header-text">
            <h1 className="landing-page__title">chorroybuenas.mx</h1>
            <p className="landing-page__tagline">Crea tu propia Lotería Mexicana única</p>
          </div>
        </div>
      </header>

      <main className="landing-page__main">
        <section className="landing-page__hero">
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
              className="landing-page__cta-button"
            >
              Crear mi Lotería
            </button>
          </div>
          <div className="landing-page__hero-image">
            <img 
              src={heroImage} 
              alt="Juego de Lotería Mexicana personalizada" 
              className="landing-page__hero-image-img"
            />
          </div>
        </section>

        <section className="landing-page__how-it-works">
          <h2 className="landing-page__section-title">¿Cómo funciona nuestra app?</h2>
          <div className="landing-page__steps">
            <div className="landing-page__step">
              <div className="landing-page__step-number">1</div>
              <div className="landing-page__step-content">
                <h3>Prepara tus cartas</h3>
                <p>
                  Sube tus propias imágenes y asígnales un título. Puedes usar fotos familiares, 
                  memes, mascotas, o cualquier imagen que quieras. Necesitas mínimo 30 cartas 
                  (recomendamos 54 para una experiencia completa).
                </p>
              </div>
            </div>
            <div className="landing-page__step">
              <div className="landing-page__step-number">2</div>
              <div className="landing-page__step-content">
                <h3>Genera los tableros</h3>
                <p>
                  Elige cuántos tableros necesitas (mínimo 8). Cada tablero tendrá 16 cartas 
                  únicas seleccionadas aleatoriamente de tu baraja personalizada.
                </p>
              </div>
            </div>
            <div className="landing-page__step">
              <div className="landing-page__step-number">3</div>
              <div className="landing-page__step-content">
                <h3>Descarga y juega</h3>
                <p>
                  Descarga el PDF con todos los tableros y la baraja completa. Imprime los 
                  tableros, repártelos entre los jugadores, y ¡a disfrutar!
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-page__events">
          <h2 className="landing-page__section-title">Perfecta para cualquier ocasión</h2>
          <p className="landing-page__events-intro">
            Personaliza tu Lotería Mexicana para hacer cualquier evento más memorable y divertido
          </p>
          <div className="landing-page__events-grid">
            <div className="landing-page__event">
              <span className="landing-page__event-icon">👶</span>
              <h3>Baby Showers</h3>
              <p>Crea una lotería temática con fotos del futuro bebé, ecografías o elementos relacionados con la llegada del nuevo miembro de la familia</p>
            </div>
            <div className="landing-page__event">
              <span className="landing-page__event-icon">👨‍👩‍👧‍👦</span>
              <h3>Eventos Familiares</h3>
              <p>Úsala en reuniones familiares, cumpleaños, aniversarios o cualquier celebración especial con fotos de la familia</p>
            </div>
            <div className="landing-page__event">
              <span className="landing-page__event-icon">💼</span>
              <h3>Eventos del Trabajo</h3>
              <p>Ideal para team building, fiestas de oficina o eventos corporativos. Incluye memes del trabajo, fotos del equipo o eventos de la empresa</p>
            </div>
            <div className="landing-page__event">
              <span className="landing-page__event-icon">🎉</span>
              <h3>Convivencias con Amigos</h3>
              <p>Haz más divertidas tus fiestas y reuniones con amigos usando fotos divertidas, memes compartidos o momentos especiales juntos</p>
            </div>
            <div className="landing-page__event">
              <span className="landing-page__event-icon">🧒</span>
              <h3>Para Niños</h3>
              <p>Versión especial para los más pequeños con sus personajes favoritos, animales, juguetes o cualquier tema que les encante</p>
            </div>
            <div className="landing-page__event">
              <span className="landing-page__event-icon">🎊</span>
              <h3>Otras Celebraciones</h3>
              <p>Bodas, graduaciones, despedidas de soltero/a, o cualquier otra celebración donde quieras agregar un toque único y divertido</p>
            </div>
          </div>
        </section>

        <section className="landing-page__features">
          <h2 className="landing-page__section-title">Características</h2>
          <div className="landing-page__features-grid">
            <div className="landing-page__feature">
              <span className="landing-page__feature-icon">📸</span>
              <h3>Personaliza</h3>
              <p>Usa tus propias imágenes para crear cartas únicas</p>
            </div>
            <div className="landing-page__feature">
              <span className="landing-page__feature-icon">🎨</span>
              <h3>Editor de Imágenes</h3>
              <p>Recorta y ajusta tus imágenes con zoom y pan</p>
            </div>
            <div className="landing-page__feature">
              <span className="landing-page__feature-icon">🎯</span>
              <h3>Múltiples Tableros</h3>
              <p>Genera tantos tableros como necesites para tu evento</p>
            </div>
            <div className="landing-page__feature">
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

        <section className="landing-page__how-to-play">
          <h2 className="landing-page__section-title">¿Cómo se juega la Lotería Mexicana?</h2>
          <div className="landing-page__game-instructions">
            <div className="landing-page__instruction-item">
              <div className="landing-page__instruction-number">1</div>
              <div className="landing-page__instruction-content">
                <h3>Prepara el juego</h3>
                <p>
                  Cada jugador recibe un tablero con 16 imágenes únicas dispuestas en una cuadrícula de 4x4. 
                  Designa a una persona como el "cantor" que se encargará de sacar y cantar las cartas.
                </p>
              </div>
            </div>
            <div className="landing-page__instruction-item">
              <div className="landing-page__instruction-number">2</div>
              <div className="landing-page__instruction-content">
                <h3>Comienza el juego</h3>
                <p>
                  El cantor va sacando cartas de la baraja una por una y las canta de manera divertida y rítmica, 
                  anunciando el nombre o descripción de la imagen. Los jugadores marcan las cartas que aparecen 
                  en su tablero usando frijoles, monedas o cualquier marcador.
                </p>
              </div>
            </div>
            <div className="landing-page__instruction-item">
              <div className="landing-page__instruction-number">3</div>
              <div className="landing-page__instruction-content">
                <h3>Gana el primero en completar</h3>
                <p>
                  El objetivo es completar una línea (horizontal, vertical o diagonal) o llenar todo el tablero. 
                  Cuando un jugador completa una línea, grita "¡Lotería!" y gana. Si nadie gana con una línea, 
                  el juego continúa hasta que alguien llene todo el tablero.
                </p>
              </div>
            </div>
            <div className="landing-page__instruction-item">
              <div className="landing-page__instruction-number">4</div>
              <div className="landing-page__instruction-content">
                <h3>Verifica y celebra</h3>
                <p>
                  El ganador debe mostrar su tablero para verificar que las cartas marcadas corresponden con 
                  las que fueron cantadas. Una vez verificado, ¡todos celebran y se puede empezar una nueva ronda!
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-page__about landing-page__about--secondary">
          <h2 className="landing-page__about-title-secondary">¿Qué es la Lotería Mexicana?</h2>
          <div className="landing-page__about-content-secondary">
            <p>
              La Lotería es un juego de azar tradicional mexicano, similar al bingo, que forma parte de la 
              cultura popular de México. Es un juego que ha unido a familias y comunidades por generaciones, 
              especialmente durante fiestas y celebraciones. Con nuestra app, puedes mantener viva esta 
              tradición creando loterías personalizadas para cualquier ocasión especial.
            </p>
          </div>
        </section>
      </main>

      <footer className="landing-page__footer">
        <p>chorroybuenas.mx - Hecho con ❤️ para mantener viva la tradición mexicana</p>
      </footer>
    </div>
  );
};

