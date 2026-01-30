import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AboutLoteria.css';

export const AboutLoteria = () => {
  useEffect(() => {
    document.title = '¿Qué es la Lotería Mexicana? Historia y Tradición | chorroybuenas.com.mx';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Descubre la historia, cultura y tradición detrás de la Lotería Mexicana. Conoce sus orígenes y cómo ha unido comunidades por generaciones.');
    }
  }, []);

  return (
    <div className="about-loteria">
      <div className="about-loteria__container">
        <header className="about-loteria__header">
          <div className="about-loteria__header-image">
            <img src="/quees.jpg" alt="Lotería Mexicana" />
          </div>
          <h1 className="about-loteria__title">¿Qué es la Lotería Mexicana?</h1>
          <p className="about-loteria__subtitle">
            Conoce más sobre este juego tradicional que forma parte de la cultura mexicana
          </p>
        </header>

        <main className="about-loteria__content">
          <div className="about-loteria__section">
            <h2 className="about-loteria__section-title">Historia y Origen</h2>
            <p className="about-loteria__text">
              La Lotería es un juego de azar tradicional mexicano, similar al bingo, que forma parte de la
              cultura popular de México. Este juego tiene sus raíces en Europa, donde se conocía como "Lotto",
              y llegó a México durante la época colonial. Con el tiempo, se adaptó a la cultura mexicana,
              incorporando elementos locales y convirtiéndose en un juego característico de las fiestas y
              celebraciones mexicanas.
            </p>
          </div>

          <div className="about-loteria__section">
            <h2 className="about-loteria__section-title">Cultura y Tradición</h2>
            <p className="about-loteria__text">
              Es un juego que ha unido a familias y comunidades por generaciones, especialmente durante fiestas
              y celebraciones. La Lotería Mexicana no es solo un juego, es una tradición que se transmite de
              padres a hijos, creando momentos de convivencia y diversión que quedan en la memoria de quienes
              participan.
            </p>
          </div>

          <div className="about-loteria__section">
            <h2 className="about-loteria__section-title">El Juego Tradicional</h2>
            <p className="about-loteria__text">
              Tradicionalmente, la Lotería Mexicana utiliza una baraja con 54 cartas, cada una con imágenes
              características como "El Gallo", "El Diablito", "La Dama", entre otras. Los tableros tienen
              16 imágenes distribuidas en una cuadrícula de 4x4, y el objetivo es completar líneas o llenar
              todo el tablero mientras el "cantor" va sacando y anunciando las cartas de manera rítmica y divertida.
            </p>
          </div>

          <div className="about-loteria__section">
            <h2 className="about-loteria__section-title">Lotería Personalizada</h2>
            <p className="about-loteria__text">
              Con nuestra app, puedes mantener viva esta tradición creando loterías personalizadas para cualquier
              ocasión especial. Ya sea para un baby shower, una fiesta de cumpleaños, un evento familiar o cualquier
              celebración, puedes crear una lotería única con tus propias imágenes y temas, haciendo que cada juego
              sea especial y memorable.
            </p>
          </div>

          <div className="about-loteria__cta">
            <h2 className="about-loteria__cta-title">¿Listo para crear tu propia Lotería?</h2>
            <p className="about-loteria__cta-text">
              Personaliza tu juego con tus propias imágenes y disfruta de esta tradición mexicana
            </p>
            <div className="about-loteria__cta-buttons">
              <Link to="/" className="about-loteria__cta-button about-loteria__cta-button--primary">
                Crear mi Lotería
              </Link>
              <Link to="/como-se-juega" className="about-loteria__cta-button about-loteria__cta-button--secondary">
                Aprende a jugar
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
