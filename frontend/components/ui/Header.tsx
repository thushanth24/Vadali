import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCategories } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { LogIn, LogOut, LayoutDashboard, Menu, Facebook, Twitter, Youtube, Flame } from 'lucide-react';
import Button from './Button';
import { Category } from '../../types';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const today = new Date().toLocaleDateString('ta-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex justify-between items-center py-2 border-b text-sm text-gray-600">
          <div>{today}</div>
          <div className="flex items-center space-x-4">
              <a href="#" className="hover:text-blue-600"><Facebook size={16} /></a>
              <a href="#" className="hover:text-blue-400"><Twitter size={16} /></a>
              <a href="#" className="hover:text-red-600"><Youtube size={16} /></a>
          </div>
        </div>
        
        {/* Main Header */}
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-3xl font-extrabold text-gray-800 flex-shrink-0">
             வடலி <span className="text-[#1a237e]">மீடியா</span>
          </Link>

          <div className="hidden md:flex flex-grow justify-center px-8">
            {/* Search bar removed */}
          </div>

          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
             {user ? (
              <>
                <Link to="/dashboard/admin">
                   <Button variant="ghost" size="sm" className="flex items-center py-1.5">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="secondary" size="sm" className="flex items-center py-1.5">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm" className="flex items-center py-1.5">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>
           <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        </div>
      </div>
      {/* Navigation Bar */}
      <nav className="bg-[#1a237e] text-white">
        <div className="container mx-auto px-4 hidden md:flex justify-start items-center py-2 space-x-6">
           <Link to="/trending" className="hover:bg-blue-800 px-3 py-1 rounded font-medium transition-colors text-sm uppercase flex items-center text-yellow-300">
              <Flame size={16} className="mr-1.5" />
              Trending
            </Link>
           {categories.map(category => (
            <Link key={category.id} to={`/category/${category.slug}`} className="hover:bg-blue-800 px-3 py-1 rounded font-medium transition-colors text-sm uppercase">
              {category.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden py-4 container mx-auto px-4">
          <nav className="flex flex-col space-y-2">
            <Link to="/trending" onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-blue-600 font-medium p-2 rounded hover:bg-gray-100 flex items-center">
              <Flame size={16} className="mr-2 text-red-500" />
              Trending
            </Link>
            {categories.map(category => (
              <Link key={category.id} to={`/category/${category.slug}`} onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-blue-600 font-medium p-2 rounded hover:bg-gray-100">
                {category.name}
              </Link>
            ))}
          </nav>
          <div className="mt-4 pt-4 border-t">
            {user ? (
              <div className="flex flex-col space-y-2">
                 <Link to="/dashboard/admin" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start flex items-center">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button onClick={() => { handleLogout(); setIsMenuOpen(false); }} variant="secondary" className="w-full justify-start flex items-center">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="primary" className="w-full justify-start flex items-center">
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;