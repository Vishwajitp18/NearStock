import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useLocationStore } from '../store/locationStore';
import { Button } from '../components/ui/Button';
import {
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Navigation,
  Plus,
  ShieldCheck,
  User as UserIcon,
  Store,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export const Header: React.FC<{ onOpenAddItem?: () => void }> = ({ onOpenAddItem }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { detectLocation, isDetecting } = useLocationStore();

  const role = user?.role || 'customer';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleUseMyLocation = async () => {
    await detectLocation();
    toast.success('Updated current GPS location');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-border bg-brand-bg/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Tagline */}
        <NavLink to="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-teal group-hover:border-brand-teal transition-all shadow-sm">
            <Store className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-brand-heading">
              Near<span className="text-brand-teal">Stock</span>
            </div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-brand-muted -mt-0.5">
              Local Inventory Intelligence
            </div>
          </div>
        </NavLink>

        {/* Center: Role-based Pill Nav Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-brand-surface/70 border border-brand-border rounded-full p-1.5 shadow-inner">
          {role === 'customer' && (
            <>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Explore
              </NavLink>
              <NavLink
                to="/favourites"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Favourites
              </NavLink>
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Orders
              </NavLink>
            </>
          )}

          {role === 'shopkeeper' && (
            <>
              <NavLink
                to="/shopkeeper/inventory"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                My Inventory
              </NavLink>
              <NavLink
                to="/shopkeeper/alerts"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Alerts
              </NavLink>
              <NavLink
                to="/shopkeeper/analytics"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Analytics
              </NavLink>
              <NavLink
                to="/shopkeeper/profile"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Shop Profile
              </NavLink>
            </>
          )}

          {role === 'admin' && (
            <>
              <NavLink
                to="/admin/shops"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Shops
              </NavLink>
              <NavLink
                to="/admin/catalog"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Catalog
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Users
              </NavLink>
              <NavLink
                to="/admin/analytics"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-body hover:text-brand-heading hover:bg-brand-surface-hover'
                  }`
                }
              >
                Analytics
              </NavLink>
            </>
          )}

          <div className="w-[1px] h-4 bg-brand-border mx-1" />

          <NavLink
            to="/security"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-brand-border text-brand-heading font-semibold'
                  : 'text-brand-muted hover:text-brand-body'
              }`
            }
          >
            Sessions
          </NavLink>

          <a
            href="http://localhost:4000/docs"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-full text-xs font-medium text-brand-muted hover:text-brand-teal transition-all"
          >
            Swagger
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-body hover:text-brand-heading hover:border-brand-teal/40 transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-brand-teal" />}
          </button>

          {/* Role-Specific Primary CTA */}
          {role === 'customer' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleUseMyLocation}
              isLoading={isDetecting}
              className="hidden sm:inline-flex"
            >
              <Navigation className="w-3.5 h-3.5 fill-current" />
              Use my location
            </Button>
          )}

          {role === 'shopkeeper' && onOpenAddItem && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddItem}
              className="hidden sm:inline-flex"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          )}

          {role === 'admin' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/catalog')}
              className="hidden sm:inline-flex"
            >
              <Layers className="w-4 h-4" />
              Add Product
            </Button>
          )}

          {/* User Chip or Login Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-brand-surface border border-brand-border rounded-full text-xs">
                <div className="w-6 h-6 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="font-semibold text-brand-heading truncate max-w-[100px] leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] uppercase font-mono text-brand-teal leading-none">
                    {user.role}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-muted hover:text-rose-400 hover:border-rose-500/30 transition-all"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth')}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

