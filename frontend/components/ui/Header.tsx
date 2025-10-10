import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchCategories } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import {
  LogIn,
  LogOut,
  LayoutDashboard,
  Menu,
  Facebook,
  Twitter,
  Youtube,
  Flame,
  Search,
} from 'lucide-react';
import Button from './Button';
import { Category } from '../../types';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetchCategories()
      .then((response) => {
        if (!isMounted) return;

        if (Array.isArray(response)) {
          setCategories(response);
          return;
        }

        const maybeWrapped = response as { categories?: Category[] };
        if (maybeWrapped?.categories && Array.isArray(maybeWrapped.categories)) {
          setCategories(maybeWrapped.categories);
        }
      })
      .catch((error) => {
        console.error('Failed to load categories', error);
        if (isMounted) {
          setCategories([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') ?? '';
    setSearchTerm(query);
  }, [location.search]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchTerm.trim();

    if (!nextQuery) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(nextQuery)}`);
    setIsMenuOpen(false);
  };

  const today = new Date().toLocaleDateString('ta-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-white text-gray-800 sticky top-0 z-50 shadow-lg">
      {/* Utility Bar */}
      <div className="bg-[#0c1a3a] text-blue-100 border-b border-blue-900">
        <div className="container mx-auto px-4 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs md:text-sm">
          <div className="flex items-center gap-3">
            <span className="uppercase tracking-wider font-semibold text-blue-200">{today}</span>
            <span className="hidden sm:inline-flex items-center gap-2 text-blue">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Live | Tamil Edition
            </span>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 text-blue-100">
            <span className="hidden md:inline uppercase tracking-[0.2em] text-[11px] text-blue-200/80">
              Follow Vadali Media
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="transition-colors hover:text-white"
              >
                <Facebook size={16} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className="transition-colors hover:text-white"
              >
                <Twitter size={16} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="transition-colors hover:text-white"
              >
                <Youtube size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 shadow-md group-hover:scale-105 transition-transform duration-200">
                <Flame className="h-7 w-7 text-white" />
                <span className="absolute -bottom-2 text-[10px] uppercase text-white tracking-[0.4em]">
                  Live
                </span>
              </div>
              <div className="leading-tight">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0c1a3a] uppercase">
                  Vadali <span className="text-red-600">Media</span>
                </h1>
                <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-gray-500">
                  Trusted Tamil Newsroom
                </p>
              </div>
            </Link>

         

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <Link to="/dashboard/admin">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-500 hover:text-red-600"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    onClick={handleLogout}
                    size="sm"
                    className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button
                    size="sm"
                    className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center gap-3 md:hidden">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-red-500"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-red-500"
                >
                  Login
                </Link>
              )}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-[#0c1a3a] shadow-sm transition hover:border-red-500 hover:text-red-600"
                aria-label="Toggle navigation"
                aria-expanded={isMenuOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="bg-[#112b6f] text-white shadow-inner">
        <div className="container mx-auto px-4">
          <div className="hidden md:flex items-center gap-4 overflow-x-auto py-3 text-sm font-semibold uppercase tracking-[0.2em]">
            <Link
              to="/trending"
              className="flex items-center gap-2 rounded-full border border-red-500 bg-red-600 px-4 py-2 text-yellow-200 transition hover:bg-red-500"
            >
              <Flame size={16} className="text-yellow-200" />
              Breaking
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className="rounded-full px-4 py-2 transition hover:bg-white hover:text-[#112b6f]"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="container mx-auto px-4 py-5 md:hidden">
         

          <nav className="flex flex-col gap-2">
            <Link
              to="/trending"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-[#112b6f] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#0c1a3a]"
            >
              <Flame size={16} className="text-yellow-300" />
              Breaking
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-700 transition hover:border-red-500 hover:text-red-600"
              >
                {category.name}
              </Link>
            ))}
          </nav>
          <div className="mt-5 border-t border-gray-200 pt-5">
            {user ? (
              <div className="flex flex-col gap-2">
                <Link to="/dashboard/admin" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="flex w-full items-center justify-start gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  variant="secondary"
                  className="flex w-full items-center justify-start gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="primary" className="flex w-full items-center justify-start gap-2">
                  <LogIn className="h-4 w-4" />
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
