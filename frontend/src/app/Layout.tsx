import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Header } from './Header';
import { Toaster } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { Search, Heart, Package, Store, AlertTriangle, BarChart3, Shield } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role || 'customer';

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-body">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 mb-16 md:mb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-surface/95 backdrop-blur-lg border-t border-brand-border px-4 py-2 flex items-center justify-around">
        {role === 'customer' && (
          <>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <Search className="w-5 h-5" />
              Explore
            </NavLink>
            <NavLink
              to="/favourites"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <Heart className="w-5 h-5" />
              Saved
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <Package className="w-5 h-5" />
              Orders
            </NavLink>
          </>
        )}

        {role === 'shopkeeper' && (
          <>
            <NavLink
              to="/shopkeeper/inventory"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <Package className="w-5 h-5" />
              Inventory
            </NavLink>
            <NavLink
              to="/shopkeeper/alerts"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <AlertTriangle className="w-5 h-5" />
              Alerts
            </NavLink>
            <NavLink
              to="/shopkeeper/analytics"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </NavLink>
            <NavLink
              to="/shopkeeper/profile"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <Store className="w-5 h-5" />
              Profile
            </NavLink>
          </>
        )}

        {role === 'admin' && (
          <>
            <NavLink
              to="/admin/shops"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <Store className="w-5 h-5" />
              Shops
            </NavLink>
            <NavLink
              to="/admin/catalog"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <Package className="w-5 h-5" />
              Catalog
            </NavLink>
            <NavLink
              to="/admin/analytics"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-teal' : 'text-brand-muted hover:text-brand-body'
                }`
              }
            >
              <BarChart3 className="w-5 h-5" />
              Platform
            </NavLink>
          </>
        )}
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-heading)',
          },
        }}
      />
    </div>
  );
};

