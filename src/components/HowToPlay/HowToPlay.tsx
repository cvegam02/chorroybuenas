import { Link } from 'react-router-dom';
import './HowToPlay.css';

export const HowToPlay = () => {
  return (
    <div className="how-to-play">
      <div className="how-to-play__container">
        <header className="how-to-play__header">
          <div className="how-to-play__header-image">
            <img src="/comosejuega.png" alt="Cómo se juega la Lotería" />
          </div>
          <h1 className="how-to-play__title">¿Cómo se juega la Lotería Mexicana?</h1>
          <p className="how-to-play__subtitle">
            Aprende a jugar este divertido juego tradicional mexicano paso a paso
          </p>
        </header>

        <main className="how-to-play__content">
          <div className="how-to-play__instructions">
            <div className="how-to-play__instruction-item">
              <div className="how-to-play__instruction-number">1</div>
              <div className="how-to-play__instruction-content">
                <h3>Prepara el juego</h3>
                <p>
                  Cada jugador recibe un tablero con 16 imágenes únicas dispuestas en una cuadrícula de 4x4. 
                  Designa a una persona como el "cantor" que se encargará de sacar y cantar las cartas.
                </p>
              </div>
            </div>
            
            <div className="how-to-play__instruction-item">
              <div className="how-to-play__instruction-number">2</div>
              <div className="how-to-play__instruction-content">
                <h3>Comienza el juego</h3>
                <p>
                  El cantor va sacando cartas de la baraja una por una y las canta de manera divertida y rítmica, 
                  anunciando el nombre o descripción de la imagen. Los jugadores marcan las cartas que aparecen 
                  en su tablero usando frijoles, monedas o cualquier marcador.
                </p>
              </div>
            </div>
            
            <div className="how-to-play__instruction-item">
              <div className="how-to-play__instruction-number">3</div>
              <div className="how-to-play__instruction-content">
                <h3>Gana el primero en completar</h3>
                <p>
                  El objetivo es completar una línea (horizontal, vertical o diagonal) o llenar todo el tablero. 
                  Cuando un jugador completa una línea, grita "¡Lotería!" y gana. Si nadie gana con una línea, 
                  el juego continúa hasta que alguien llene todo el tablero.
                </p>
              </div>
            </div>
            
            <div className="how-to-play__instruction-item">
              <div className="how-to-play__instruction-number">4</div>
              <div className="how-to-play__instruction-content">
                <h3>Verifica y celebra</h3>
                <p>
                  El ganador debe mostrar su tablero para verificar que las cartas marcadas corresponden con 
                  las que fueron cantadas. Una vez verificado, ¡todos celebran y se puede empezar una nueva ronda!
                </p>
              </div>
            </div>
          </div>

          <div className="how-to-play__cta">
            <h2 className="how-to-play__cta-title">¿Listo para crear tu propia Lotería?</h2>
            <Link to="/" className="how-to-play__cta-button">
              Crear mi Lotería
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};
