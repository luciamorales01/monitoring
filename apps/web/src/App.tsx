import { RouterProvider } from 'react-router-dom';
import { GlobalErrorBoundary } from './app/GlobalErrorBoundary';
import { router } from './app/router';
import { I18nProvider } from './shared/i18n';

export default function App() {
  return (
    <GlobalErrorBoundary>
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>
    </GlobalErrorBoundary>
  );
}
