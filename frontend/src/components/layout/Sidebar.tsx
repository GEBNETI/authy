import React from 'react';
import { 
  Home, 
  Users, 
  Building, 
  Shield, 
  FileText, 
  Settings,
  X,
  ChevronDown,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../context';
import { permissionUtils } from '../../utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
  permission?: {
    resource: string;
    action: string;
  };
  children?: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { state } = useAuth();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  // Navigation items
  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      current: true,
    },
    {
      name: 'Users',
      href: '/users',
      icon: Users,
      permission: { resource: 'users', action: 'read' },
    },
    {
      name: 'Applications',
      href: '/applications',
      icon: Building,
      permission: { resource: 'applications', action: 'read' },
    },
    {
      name: 'Permissions',
      href: '/permissions',
      icon: Shield,
      permission: { resource: 'permissions', action: 'list' },
    },
    {
      name: 'Audit Logs',
      href: '/audit',
      icon: FileText,
      permission: { resource: 'system', action: 'audit' },
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      permission: { resource: 'system', action: 'audit' },
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  // Check if user has permission for nav item
  const hasPermission = (item: NavItem): boolean => {
    if (!item.permission || !state.user) return true;
    return permissionUtils.hasPermission(
      state.user,
      item.permission.resource,
      item.permission.action
    );
  };

  // Toggle expanded state
  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-base-100 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-content"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">Authy</h2>
              <p className="text-xs text-base-content/70">Auth Service</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-base-content/70 hover:text-base-content hover:bg-base-200 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-2 space-y-1">
          {navigation.map((item) => {
            if (!hasPermission(item)) return null;

            const isExpanded = expandedItems.includes(item.name);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.name}>
                <a
                  href={item.href}
                  className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? 'bg-primary text-primary-content'
                      : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                  }`}
                  onClick={(e) => {
                    if (hasChildren) {
                      e.preventDefault();
                      toggleExpanded(item.name);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                  {hasChildren && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </a>

                {/* Submenu */}
                {hasChildren && isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children?.map((child) => {
                      if (!hasPermission(child)) return null;

                      return (
                        <a
                          key={child.name}
                          href={child.href}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                            child.current
                              ? 'bg-primary/10 text-primary'
                              : 'text-base-content/60 hover:bg-base-200 hover:text-base-content'
                          }`}
                        >
                          <child.icon className="w-4 h-4 mr-3" />
                          {child.name}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-base-300">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-base-300 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium">
                {state.user?.first_name?.charAt(0)}
                {state.user?.last_name?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-base-content truncate">
                {state.user?.first_name} {state.user?.last_name}
              </p>
              <p className="text-xs text-base-content/70 truncate">
                {state.user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;