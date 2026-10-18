import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types/auth';

// Lazy loaded routes for optimal code splitting
const ExplorePage = lazy(() =>
  import('../features/search/ExplorePage').then((m) => ({ default: m.ExplorePage }))
);
const ShopDetailPage = lazy(() =>
  import('../features/shops/ShopDetailPage').then((m) => ({ default: m.ShopDetailPage }))
);
const AuthPage = lazy(() =>
  import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const FavouritesPage = lazy(() =>
  import('../features/customer/FavouritesPage').then((m) => ({ default: m.FavouritesPage }))
);
const OrdersPage = lazy(() =>
  import('../features/customer/OrdersPage').then((m) => ({ default: m.OrdersPage }))
);
const SecurityPage = lazy(() =>
  import('../features/sessions/SecurityPage').then((m) => ({ default: m.SecurityPage }))
);

// Shopkeeper Pages
const MyInventoryPage = lazy(() =>
  import('../features/inventory/MyInventoryPage').then((m) => ({ default: m.MyInventoryPage }))
);
const AlertsPage = lazy(() =>
  import('../features/inventory/AlertsPage').then((m) => ({ default: m.AlertsPage }))
);
const AnalyticsPage = lazy(() =>
  import('../features/inventory/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const ShopProfilePage = lazy(() =>
  import('../features/shops/ShopProfilePage').then((m) => ({ default: m.ShopProfilePage }))
);

// Admin Pages
const AdminShopsPage = lazy(() =>
  import('../features/admin/AdminShopsPage').then((m) => ({ default: m.AdminShopsPage }))
);
const AdminCatalogPage = lazy(() =>
  import('../features/admin/AdminCatalogPage').then((m) => ({ default: m.AdminCatalogPage }))
);
const AdminUsersPage = lazy(() =>
  import('../features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminAnalyticsPage = lazy(() =>
  import('../features/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage }))
);

// Common Error Pages
const NotFoundPage = lazy(() =>
  import('../features/common/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);
const ForbiddenPage = lazy(() =>
  import('../features/common/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage }))
);

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();

  if (!accessToken || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
};

const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-brand-teal/20 border-t-brand-teal animate-spin" />
    <span className="text-xs font-mono text-brand-muted">Loading NearStock...</span>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Customer & Public Routes */}
          <Route index element={<ExplorePage />} />
          <Route path="shops/:id" element={<ShopDetailPage />} />
          <Route path="auth" element={<AuthPage />} />

          {/* Authenticated Customer Routes */}
          <Route
            path="favourites"
            element={
              <ProtectedRoute allowedRoles={['customer', 'shopkeeper', 'admin']}>
                <FavouritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute allowedRoles={['customer', 'shopkeeper', 'admin']}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="security"
            element={
              <ProtectedRoute allowedRoles={['customer', 'shopkeeper', 'admin']}>
                <SecurityPage />
              </ProtectedRoute>
            }
          />

          {/* Shopkeeper Routes */}
          <Route
            path="shopkeeper/inventory"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper', 'admin']}>
                <MyInventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="shopkeeper/alerts"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper', 'admin']}>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="shopkeeper/analytics"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper', 'admin']}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="shopkeeper/profile"
            element={
              <ProtectedRoute allowedRoles={['shopkeeper', 'admin']}>
                <ShopProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Moderation & Catalog Routes */}
          <Route
            path="admin/shops"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminShopsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/catalog"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Error Fallbacks */}
          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
export default AppRoutes;

