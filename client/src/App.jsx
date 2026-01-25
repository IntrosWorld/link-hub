import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import PublicHub from './pages/PublicHub';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route path="/h/:handle" element={<PublicHub />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
