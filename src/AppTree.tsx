import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { SetProvider } from './contexts/SetContext';
import { TokenProvider } from './contexts/TokenContext';

/** El sitio sin enrutador: el navegador y la pre-generación le ponen cada uno el suyo. */
export const AppTree = () => (
  <AuthProvider>
    <SetProvider>
      <TokenProvider>
        <App />
      </TokenProvider>
    </SetProvider>
  </AuthProvider>
);
