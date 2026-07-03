import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import App from './App';

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
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: '#171a2b', color: '#fff' } }} />
    </ThemeProvider>
  </React.StrictMode>
);
