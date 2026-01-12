import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { 
    LayoutDashboard, Users, Tag, Newspaper, PenSquare, Home, LogOut, Bell, User as UserIcon, Star, MessageSquare, 
    BadgeDollarSign, Mails, BarChartBig, Clock
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const commonLinks = [
    { to: '/', icon: Home, text: 'Go to Site' },
  ];

  const adminLinks = [
    { to: '/dashboard/admin', icon: LayoutDashboard, text: 'Overview' },
    { to: '/dashboard/admin/users', icon: Users, text: 'User Management' },
    { to: '/dashboard/admin/articles', icon: Newspaper, text: 'All Articles' },
    { to: '/dashboard/admin/categories', icon: Tag, text: 'Categories' },
    { to: '/dashboard/admin/newsletter', icon: Mails, text: 'Newsletter' },
    { to: '/dashboard/admin/ads', icon: BadgeDollarSign, text: 'Advertisements' },
  ];

  const editorLinks = [
    { to: '/dashboard/editor', icon: LayoutDashboard, text: 'Overview' },
    { to: '/dashboard/editor/articles', icon: Newspaper, text: 'Manage Articles' },
    { to: '/dashboard/editor/pending', icon: Clock, text: 'Pending Articles' },
    { to: '/dashboard/editor/create', icon: PenSquare, text: 'New Article' },
    { to: '/dashboard/editor/featured', icon: Star, text: 'Featured Manager' },
  ];

  const authorLinks = [
    { to: '/dashboard/author', icon: Newspaper, text: 'My Articles' },
    { to: '/dashboard/author/create', icon: PenSquare, text: 'New Article' },
    { to: '/dashboard/author/notifications', icon: Bell, text: 'Notifications' },
    { to: '/dashboard/author/profile', icon: UserIcon, text: 'Profile Settings' },
  ];
  
  const getRoleLinks = () => {
    switch(user?.role) {
      case UserRole.ADMIN: return adminLinks;
      case UserRole.EDITOR: return editorLinks;
      case UserRole.AUTHOR: return authorLinks;
      default: return [];
    }
  }

  const roleLinks = getRoleLinks();

  const linkClass = "flex items-center px-4 py-2 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors";
  const activeLinkClass = "bg-gray-700 text-white";

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <Link to="/" className="text-2xl font-bold text-white">
          Vadali <span className="text-blue-400">Panel</span>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {roleLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to.split('/').length <= 3}
            className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}
          >
            <link.icon className="h-5 w-5 mr-3" />
            {link.text}
          </NavLink>
        ))}
      </nav>
      <div className="px-2 py-4 border-t border-gray-700">
        {commonLinks.map(link => (
            <Link key={link.to} to={link.to} className={linkClass}>
                <link.icon className="h-5 w-5 mr-3" />
                {link.text}
            </Link>
        ))}
         <button onClick={handleLogout} className={`${linkClass} w-full`}>
           <LogOut className="h-5 w-5 mr-3" />
           Logout
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
