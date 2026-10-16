import AppRouter from './AppRouter';
import { OfferPromoProvider } from './components/OfferBanner/OfferPromoContext';
import './App.css';

function App() {
  return (
    <div className="app">
      <OfferPromoProvider>
        <AppRouter />
      </OfferPromoProvider>
    </div>
  );
}

export default App;
