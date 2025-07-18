import React, { useState } from 'react';
import { Menu, Sun, Moon, Bell, Search, ChevronDown } from 'lucide-react';
import { useAuth, useTheme, useNotification } from '../../context';
import { userManager } from '../../utils';
import { Avatar } from '../ui';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { state, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addNotification } = useNotification();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      addNotification({
        type: 'success',
        title: 'Logged Out',
        message: 'You have been successfully logged out.',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Logout Error',
        message: 'There was an error logging out. Please try again.',
      });
    }
  };

  if (!state.user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Navigation */}
        <nav className="bg-base-100 shadow-sm border-b border-base-300">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left Side */}
              <div className="flex items-center">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md text-base-content/70 hover:text-base-content hover:bg-base-200"
                >
                  <Menu className="w-6 h-6" />
                </button>

                {/* Search Bar */}
                <div className="hidden md:block ml-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-5 h-5 text-base-content/40" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search..."
                      className="input input-bordered w-64 pl-10 pr-4 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Right Side */}
              <div className="flex items-center space-x-4">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="btn btn-ghost btn-circle"
                  title="Toggle theme"
                >
                  {theme === 'emerald' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </button>

                {/* Notifications */}
                <div className="dropdown dropdown-end">
                  <button
                    tabIndex={0}
                    className="btn btn-ghost btn-circle"
                    title="Notifications"
                  >
                    <div className="indicator">
                      <Bell className="w-5 h-5" />
                      <span className="badge badge-xs badge-primary indicator-item">2</span>
                    </div>
                  </button>
                  <div
                    tabIndex={0}
                    className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-80"
                  >
                    <div className="p-3 border-b border-base-300">
                      <h3 className="font-semibold">Notifications</h3>
                    </div>
                    <div className="p-2 space-y-2">
                      <div className="p-2 hover:bg-base-200 rounded">
                        <p className="text-sm font-medium">System Update</p>
                        <p className="text-xs text-base-content/70">New security features available</p>
                      </div>
                      <div className="p-2 hover:bg-base-200 rounded">
                        <p className="text-sm font-medium">New User Registered</p>
                        <p className="text-xs text-base-content/70">john@example.com joined</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Menu */}
                <div className="dropdown dropdown-end">
                  <div
                    tabIndex={0}
                    role="button"
                    className="btn btn-ghost p-1 rounded-full"
                  >
                    <div className="flex items-center space-x-2">
                      <Avatar 
                        firstName={state.user.first_name} 
                        lastName={state.user.last_name} 
                        size="sm"
                      />
                      <div className="hidden md:block text-left">
                        <p className="text-sm font-medium">
                          {userManager.getUserFullName(state.user)}
                        </p>
                        <p className="text-xs text-base-content/70">
                          {state.user.email}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-base-content/70" />
                    </div>
                  </div>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                  >
                    <li>
                      <a className="p-2">
                        <span>Profile</span>
                      </a>
                    </li>
                    <li>
                      <a className="p-2">
                        <span>Settings</span>
                      </a>
                    </li>
                    <li>
                      <a className="p-2">
                        <span>Help</span>
                      </a>
                    </li>
                    <div className="divider my-1"></div>
                    <li>
                      <a className="p-2 text-error" onClick={handleLogout}>
                        <span>Sign Out</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;