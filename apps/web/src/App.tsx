import { RouterProvider } from 'react-router-dom';
import { GlobalErrorBoundary } from './app/GlobalErrorBoundary';
import { router } from './app/router';

export default function App() {
  return (
    <GlobalErrorBoundary>
      <RouterProvider router={router} />
    </GlobalErrorBoundary>
  );
}
