import React, { useState, useEffect, useMemo } from 'react';
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
  Home,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import Button from './Button';
import { Category } from '../../types';
import logoUrl from '@/assets/logo.jpg';

type CategoryNode = Category & { children: CategoryNode[] };

const buildCategoryTree = (items: Category[]): CategoryNode[] => {
  if (!items || items.length === 0) {
    return [];
  }

  const nodeMap = new Map<string, CategoryNode>();
  items.forEach((item) => {
    nodeMap.set(item.id, { ...item, children: [] });
  });

  const roots: CategoryNode[] = [];
  items.forEach((item) => {
    const node = nodeMap.get(item.id);
    if (!node) {
      return;
    }

    const parentId = item.parentCategoryId ?? null;
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const visibleRootCategories = useMemo(
    () => categoryTree.filter((category) => category.showInHeader ?? true),
    [categoryTree]
  );

  const handleParentToggle = (event: React.MouseEvent | React.KeyboardEvent, categoryId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenDropdownId(prev => (prev === categoryId ? null : categoryId));
  };

  useEffect(() => {
    let isMounted = true;

    const normalizeCategories = (response: unknown): Category[] => {
      if (Array.isArray(response)) {
        return response as Category[];
      }

      const maybeWrapped = response as { categories?: Category[] };
      if (maybeWrapped?.categories && Array.isArray(maybeWrapped.categories)) {
        return maybeWrapped.categories;
      }

      return [];
    };

    const loadCategories = async () => {
      try {
        const response = await fetchCategories();
        const resolvedCategories = normalizeCategories(response);

        if (isMounted) {
          setCategories(resolvedCategories);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
        if (isMounted) {
          setCategories([]);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = () => setOpenDropdownId(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') ?? '';
    setSearchTerm(query);
  }, [location.search]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 50;
      
      setVisible(isVisible);
      setScrolled(currentScrollPos > 50);
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
    if ((e as React.KeyboardEvent).key === 'Enter' || e.type === 'click') {
      if (searchTerm.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
        setSearchTerm('');
      }
    }
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

  const renderDropdownLinks = (nodes: CategoryNode[], depth = 0): React.ReactNode =>
    nodes.map((child) => {
      const isActive = location.pathname.startsWith(`/category/${child.slug}`);
      const paddingLeft = 16 + depth * 12;
      const hasChildren = child.children.length > 0;
      const dropdownVisible = openDropdownId === child.id;

      return (
        <React.Fragment key={child.id}>
          {hasChildren ? (
            <button
              type="button"
              onClick={(event) => handleParentToggle(event, child.id)}
              className={`flex w-full items-center justify-between rounded-lg border border-transparent pr-4 py-2 text-[0.82rem] font-semibold uppercase tracking-[0.2em] transition-colors ${
                dropdownVisible
                  ? 'bg-blue-50 text-blue-900 border-blue-200 shadow-inner'
                  : 'bg-white/90 text-gray-700 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-100 shadow-sm'
              }`}
              style={{ paddingLeft }}
              aria-haspopup="true"
              aria-expanded={dropdownVisible ? 'true' : 'false'}
            >
              <span>{child.name}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${dropdownVisible ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <Link
              to={`/category/${child.slug}`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center justify-between rounded-lg border border-transparent pr-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/10 text-blue-900 border-blue-200'
                  : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-100'
              }`}
              style={{ paddingLeft }}
              onClick={() => setOpenDropdownId(null)}
            >
              <span>{child.name}</span>
              <ChevronRight className="h-4 w-4 text-blue-500/70" />
            </Link>
          )}
          {hasChildren && dropdownVisible && renderDropdownLinks(child.children, depth + 1)}
        </React.Fragment>
      );
    });

  const renderMobileCategories = (nodes: CategoryNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      const isActive = location.pathname.startsWith(`/category/${node.slug}`);
      const hasChildren = node.children.length > 0;
      const spacing = { marginLeft: depth * 12 };

      if (hasChildren) {
        return (
          <div key={node.id} className="flex flex-col gap-2">
            <button
              type="button"
              className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.2em] transition ${
                'border-gray-200 text-gray-700'
              }`}
              style={spacing}
            >
              {node.name}
            </button>
            {renderMobileCategories(node.children, depth + 1)}
          </div>
        );
      }

      return (
        <Link
          key={node.id}
          to={`/category/${node.slug}`}
          onClick={() => setIsMenuOpen(false)}
          aria-current={isActive ? 'page' : undefined}
          className={`rounded-lg border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
            isActive
              ? 'border-blue-700 bg-blue-900/80 text-yellow-200 shadow'
              : 'border-gray-200 text-gray-700 hover:border-red-500 hover:text-red-600'
          }`}
          style={spacing}
        >
          {node.name}
        </Link>
      );
    });

  const today = new Date().toLocaleDateString('ta-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-white text-gray-800 sticky top-0 z-50 shadow-lg border-b border-gray-100">
      {/* Main Header */}
      <div className={`bg-white transition-all duration-300 ${scrolled ? 'shadow-sm' : ''} ${visible ? 'translate-y-0' : '-translate-y-16'}`}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Logo Section - Left */}
            <div className="flex-shrink-0">
              <Link
                to="/"
                className="flex items-center gap-4 group transition-transform duration-200 hover:scale-[1.02]"
              >
                <img
                  src={logoUrl}
                  alt="Vadali Media"
                  className="h-14 w-auto drop-shadow-md transition-transform duration-300 group-hover:scale-[1.03]"
                />
            
                <div className="leading-tight">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                    <span className="text-[#0c1a3a]">Vadali</span> <span className="text-red-600">Media</span>
                  </h1>
                  <p className="text-xs md:text-sm uppercase tracking-[0.4em] text-gray-500 font-medium mt-0.5">
                    Trusted Tamil Newsroom
                  </p>
                </div>
              </Link>
            </div>

            {/* Date and Live Badge - Center */}
            <div className="hidden md:flex items-center justify-center flex-1 max-w-2xl mx-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">{today}</span>
                <span className="h-4 w-px bg-gray-300"></span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  Live | Tamil Edition
                </span>
              </div>
            </div>
            
            {/* Social Icons - Right */}
            <div className="hidden lg:flex items-center gap-2 ml-auto">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="p-2 rounded-full bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
              >
                <Facebook size={18} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className="p-2 rounded-full bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-400 transition-all duration-200"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="p-2 rounded-full bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              >
                <Youtube size={18} />
              </a>
            </div>

         

            {user && (
              <div className="hidden md:flex items-center gap-3">
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
              </div>
            )}

            {/* Mobile menu button */}
            <div className="flex items-center gap-3 md:hidden">
              {user && (
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-red-500"
                >
                  Logout
                </button>
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
      <nav className="bg-gradient-to-r from-blue-900 to-blue-700 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="hidden md:flex items-center justify-between py-0">
            <div className="flex items-center gap-1">
              {/* Breaking News Button */}
              <Link
                to="/trending"
                aria-current={location.pathname.startsWith('/trending') ? 'page' : undefined}
                className={`group relative flex items-center gap-2 rounded-none px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all duration-200 ${
                  location.pathname.startsWith('/trending')
                    ? 'bg-gradient-to-r from-red-500 to-red-400 shadow-lg ring-2 ring-yellow-300/80'
                    : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 hover:shadow-lg hover:scale-105 hover:bg-opacity-90'
                }`}
              >
                <Flame size={16} className="text-yellow-300 animate-pulse" />
                Breaking News
              </Link>

              {/* Home Link */}
              <Link
                to="/"
                aria-current={location.pathname === '/' ? 'page' : undefined}
                className={`group relative px-5 py-3.5 text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
                  location.pathname === '/' ? 'text-yellow-300 shadow-inner bg-blue-900/60' : 'text-white hover:text-yellow-200 hover:bg-blue-800/50'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Home size={16} className="transition-transform duration-200 group-hover:scale-110" />
                  Home
                </span>
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 transform transition-transform duration-300 ${
                    location.pathname === '/' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                ></span>
              </Link>
              
              {/* Category Links */}
              <div className="flex items-center gap-1">
                {visibleRootCategories.map((category, index) => {
                  const isActive = location.pathname.startsWith(`/category/${category.slug}`);
                  const hasChildren = category.children.length > 0;
                  const baseClass = `group relative px-5 py-3.5 text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
                    index === 0 ? 'ml-1' : ''
                  } ${
                    isActive
                      ? 'text-yellow-300 shadow-inner bg-blue-900/60'
                      : 'text-white hover:text-yellow-200 hover:bg-blue-800/50'
                  }`;

                  if (!hasChildren) {
                    return (
                      <Link
                        key={category.id}
                        to={`/category/${category.slug}`}
                        aria-current={isActive ? 'page' : undefined}
                        className={baseClass}
                      >
                        <span className="relative z-10">{category.name}</span>
                        <span
                          className={`absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 transform transition-transform duration-300 ${
                            isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                          }`}
                        />
                      </Link>
                    );
                  }

                  const dropdownVisible = openDropdownId === category.id;

                  return (
                    <div key={category.id} className="relative group">
                      <button
                        type="button"
                        className={`${baseClass} flex items-center gap-2 pr-4`}
                        aria-haspopup="true"
                        aria-expanded={dropdownVisible ? 'true' : 'false'}
                        onClick={(event) => handleParentToggle(event, category.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            handleParentToggle(event, category.id);
                          }
                        }}
                      >
                        <span className="relative z-10">{category.name}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            dropdownVisible ? 'rotate-180' : 'group-hover:rotate-180'
                          }`}
                        />
                        <span
                          className={`absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 transform transition-transform duration-300 ${
                            isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                          }`}
                        />
                      </button>
                      <div
                        className={`absolute left-0 top-full z-30 mt-2 min-w-[280px] rounded-2xl border border-white/70 bg-white text-gray-900 shadow-2xl ring-1 ring-blue-900/10 transition ${
                          dropdownVisible
                            ? 'visible opacity-100'
                            : 'invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100'
                        }`}
                      >
                        <div className="py-3 px-3 flex flex-col gap-1">{renderDropdownLinks(category.children)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
          
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="container mx-auto px-4 py-8 md:hidden">
         

          <nav className="flex flex-col gap-2 pb-4">
            <Link
              to="/trending"
              onClick={() => setIsMenuOpen(false)}
              aria-current={location.pathname.startsWith('/trending') ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                location.pathname.startsWith('/trending')
                  ? 'bg-blue-900 text-yellow-200 shadow'
                  : 'bg-[#112b6f] text-white hover:bg-[#0c1a3a]'
              }`}
            >
              <Flame size={16} className="text-yellow-300" />
              Breaking
            </Link>
            <Link
              to="/"
              onClick={() => setIsMenuOpen(false)}
              aria-current={location.pathname === '/' ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                location.pathname === '/'
                  ? 'border-blue-700 bg-blue-900/80 text-yellow-200 shadow'
                  : 'border-gray-200 text-gray-700 hover:border-red-500 hover:text-red-600'
              }`}
            >
              <Home size={16} className="text-yellow-300" />
              Home
            </Link>
            {renderMobileCategories(visibleRootCategories)}
          </nav>
          <div className="mt-5 border-t border-gray-200 pt-5">
            {user && (
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
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
