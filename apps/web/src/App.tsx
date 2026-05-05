import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ForgotPasswordPage from './modules/auth/ForgotPasswordPage';
import LoginPage from './modules/auth/LoginPage';
import RegisterPage from './modules/auth/RegisterPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/register" element={<Navigate to="/registro" replace />} />
        <Route
          path="/recuperar-password"
          element={<ForgotPasswordPage />}
        />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
