import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Menu, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from './Button.jsx';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('You have been logged out.');
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline-block">
          Workspace
        </span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm shadow-xs border border-indigo-200">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">
                    {user.name}
                  </span>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3 text-amber-600" />
                      Admin
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 block truncate max-w-[180px]">
                  {user.email}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={LogOut}
              onClick={handleLogout}
              title="Logout"
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

