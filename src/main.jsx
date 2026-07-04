import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import ErrorBoundary from './ErrorBoundary';
import App from './App';

// Clear the one-shot reload guard once the app has loaded cleanly, so a FUTURE
// deploy's stale-bundle crash can also auto-recover (fires after first paint).
window.addEventListener('load', () => {
  setTimeout(() => sessionStorage.removeItem('owner_reloaded_after_error'), 4000);
});

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c4dff' },
    secondary: { main: '#ffb300' },
    background: { default: '#0e0f1a', paper: '#171a2b' },
  },
  shape: { borderRadius: 10 },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-right" toastOptions={{ style: { background: '#171a2b', color: '#fff' } }} />
    </ThemeProvider>
  </React.StrictMode>
);
