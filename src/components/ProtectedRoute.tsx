import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

type UserRole = 'candidate' | 'recruiter';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, userRole, profileComplete } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not logged in → go to auth
  if (!user) return <Navigate to="/auth" replace />;

  // Profile incomplete → send to onboarding (unless already there)
  if (!profileComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Role-gated route
  if (requiredRole && userRole && userRole !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
