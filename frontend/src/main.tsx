import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { queryClient } from './shared/queryClient';
import {
  applyThemePreference,
  getStoredThemePreference,
} from './theme/themePreferences';
import { ThemeProvider } from './theme/ThemeProvider';

applyThemePreference(getStoredThemePreference());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
