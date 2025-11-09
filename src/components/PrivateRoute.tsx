import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

export default function PrivateRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    // TODO: Replace with proper loading UI
    return <div>Loading...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" />;
}