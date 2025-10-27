
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ArticleCard, { ArticleCardProps } from '../components/ui/ArticleCard';
import { fetchArticles, fetchCategories } from '../services/api';
import { Article, Category } from '../types';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatArticleDate } from '../lib/articleDate';

// Extended ArticleCard component with additional props
interface ExtendedArticleCardProps extends Omit<ArticleCardProps, 'className'> {
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

const ArticleCardWrapper: React.FC<ExtendedArticleCardProps> = (props) => {
  const { variant = 'vertical', className = '', ...rest } = props;

  if (variant === 'horizontal') {
    const formattedDate = formatArticleDate(rest.article, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
        <div className="sm:w-1/3">
          <ArticleCard {...rest} className="h-full" />
        </div>
        <div className="sm:w-2/3 flex flex-col justify-center">
          <h3 className="text-xl font-bold mb-2">
            <Link to={`/article/${rest.article.slug}`} className="hover:text-red-600 transition-colors">
              {rest.article.title}
            </Link>
          </h3>
          {formattedDate && (
            <div className="flex items-center text-xs text-gray-500 mt-2">
              <Clock size={12} className="mr-1" />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <ArticleCard {...rest} className={className} />;
};

// Inline component for the breaking news ticker
const BreakingNewsTicker: React.FC<{ articles: Article[] }> = ({ articles }) => {
  const breakingNews = articles.slice(0, 5).map((a, i) => (
    <React.Fragment key={a.id}>
      <Link to={`/article/${a.slug}`} className="hover:text-gray-200 transition-colors">
        {a.title}
      </Link>
      {i < 4 && <span className="mx-6 text-gray-300">#</span>}
    </React.Fragment>
  ));
  
  return (
    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center">
          <span className="font-bold text-sm uppercase bg-white text-red-600 px-3 py-1 rounded-full mr-4 flex-shrink-0 shadow-sm">
            Breaking News
          </span>
          <div className="w-full relative overflow-hidden">
            <div className="animate-marquee whitespace-nowrap">
              {breakingNews}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 18s linear infinite;
          padding-left: 100%;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};


const HomePage: React.FC = () => {
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [advertisements, setAdvertisements] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingStartIndex, setTrendingStartIndex] = useState(0);
  const [trendingDirection, setTrendingDirection] = useState<'up' | 'down'>('up');
  const [isTrendingAnimating, setIsTrendingAnimating] = useState(false);
  const trendingAnimationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [articlesData, categoriesData, advertisementsData] = await Promise.all([
            fetchArticles(),
            fetchCategories(),
            fetchArticles({ isAdvertisement: true, limit: 12 })
        ]);
        setPublishedArticles(articlesData);
        setCategories(categoriesData);
        setAdvertisements(advertisementsData.filter(article => article.isAdvertisement));
      } catch (error) {
        console.error("Failed to load homepage data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const articlesForFeed = publishedArticles.filter(a => !a.isAdvertisement);
  const advertisementArticles = advertisements;
  const adsWithImages = advertisementArticles.filter(ad => ad.coverImageUrl?.trim());
  const adsWithoutImages = advertisementArticles.filter(ad => !ad.coverImageUrl?.trim());
  const topAdvertisements = [...adsWithImages, ...adsWithoutImages].slice(0, 2);
  
  const featuredArticles = articlesForFeed.filter(a => a.isFeatured);
  const nonFeaturedArticles = articlesForFeed.filter(a => !a.isFeatured);

  const mainFeaturedArticle = featuredArticles[0] || nonFeaturedArticles[0];
  const latestArticles = nonFeaturedArticles.slice(0, 6);
  const trendingArticles = [...articlesForFeed].sort((a, b) => b.views - a.views).slice(0, 6);
  const trendingHighlights = trendingArticles.slice(0, 5);
  const latestHighlights = latestArticles.slice(0, 5);
  const canCycleTrending = trendingHighlights.length > 4;
  const canManuallyCycleTrending = trendingHighlights.length > 1;

  const stepTrending = useCallback((direction: 'up' | 'down') => {
    if (trendingHighlights.length <= 1) {
      return;
    }

    setTrendingDirection(direction);
    setIsTrendingAnimating(true);

    setTrendingStartIndex(prev => {
      const length = trendingHighlights.length;
      const next = direction === 'up' ? prev + 1 : prev - 1;
      return (next + length) % length;
    });
  }, [trendingHighlights.length]);

  useEffect(() => {
    if (!canCycleTrending) {
      return;
    }

    const interval = setInterval(() => {
      stepTrending('up');
    }, 5000);

    return () => clearInterval(interval);
  }, [canCycleTrending, stepTrending]);

  useEffect(() => {
    if (trendingHighlights.length === 0) {
      setTrendingStartIndex(0);
      return;
    }

    setTrendingStartIndex(prev => prev % trendingHighlights.length);
  }, [trendingHighlights.length]);

  const handleTrendingStep = (direction: 'up' | 'down') => {
    stepTrending(direction);
  };

  useEffect(() => {
    if (!isTrendingAnimating) {
      return;
    }

    if (trendingAnimationTimeout.current) {
      clearTimeout(trendingAnimationTimeout.current);
    }

    trendingAnimationTimeout.current = setTimeout(() => {
      setIsTrendingAnimating(false);
      trendingAnimationTimeout.current = null;
    }, 450);

    return () => {
      if (trendingAnimationTimeout.current) {
        clearTimeout(trendingAnimationTimeout.current);
        trendingAnimationTimeout.current = null;
      }
    };
  }, [isTrendingAnimating]);

  useEffect(() => {
    return () => {
      if (trendingAnimationTimeout.current) {
        clearTimeout(trendingAnimationTimeout.current);
      }
    };
  }, []);

  const visibleTrending = trendingHighlights.length <= 4
    ? trendingHighlights
    : Array.from({ length: 4 }, (_, offset) => {
        const length = trendingHighlights.length;
        return trendingHighlights[(trendingStartIndex + offset) % length];
      });
  const trendingAnimationClass = isTrendingAnimating
    ? trendingDirection === 'up'
      ? 'animate-trending-up'
      : 'animate-trending-down'
    : '';
  const MAX_TRENDING_TITLE_LENGTH = 60;

  if (loading) {
    return <LoadingSpinner label="Loading homepage..." fullScreen />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <style>{`
        @keyframes trending-slide-up {
          0% {
            transform: translateY(16px);
            opacity: 0.35;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes trending-slide-down {
          0% {
            transform: translateY(-16px);
            opacity: 0.35;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-trending-up > * {
          animation: trending-slide-up 0.45s ease both;
        }

        .animate-trending-down > * {
          animation: trending-slide-down 0.45s ease both;
        }
      `}</style>
      <BreakingNewsTicker articles={articlesForFeed} />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-10">
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <aside className="lg:col-span-3 h-full">
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl h-full flex flex-col">
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-400">
                        Trending
                      </span>
                      <h2 className="text-lg font-semibold text-gray-900 mt-2">
                        Trending Now
                      </h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTrendingStep('up')}
                        className="p-2 rounded-md border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Show previous trending story"
                        disabled={!canManuallyCycleTrending}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTrendingStep('down')}
                        className="p-2 rounded-md border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Show next trending story"
                        disabled={!canManuallyCycleTrending}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-4">
                    Updated every 5 seconds
                  </p>
                  <div className="relative flex-1 overflow-hidden">
                    {visibleTrending.length === 0 ? (
                      <p className="text-sm text-gray-500">No trending stories available.</p>
                    ) : (
                      <div className={`space-y-3 transition-all duration-500 ease-in-out ${trendingAnimationClass}`}>
                        {visibleTrending.map((article, index) => {
                          const total = trendingHighlights.length;
                          const derivedIndex =
                            total <= 4
                              ? trendingHighlights.indexOf(article)
                              : (trendingStartIndex + index) % total;
                          const safeIndex = derivedIndex >= 0 ? derivedIndex : 0;
                          const articleRank = safeIndex + 1;
                          const formattedDate = formatArticleDate(article, {
                            month: 'short',
                            day: 'numeric',
                          });
                          const displayTitle =
                            article.title.length > MAX_TRENDING_TITLE_LENGTH
                              ? `${article.title.slice(0, MAX_TRENDING_TITLE_LENGTH - 3)}...`
                              : article.title;

                          return (
                            <div
                              key={article.id}
                              className="group border border-gray-200 rounded-xl p-3 hover:border-gray-300 hover:shadow-sm transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`flex-shrink-0 w-8 h-8 rounded-full font-semibold text-sm flex items-center justify-center ${
                                    articleRank <= 3
                                      ? 'bg-gray-900 text-white'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {articleRank}
                                </span>
                                {article.coverImageUrl ? (
                                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img
                                      src={article.coverImageUrl}
                                      alt={article.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-[11px] text-gray-400">
                                    No image
                                  </div>
                                )}
                                <div className="flex-1 border-l border-gray-200 pl-3">
                                  <h3 className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-gray-700 transition-colors line-clamp-2 min-h-[3.25rem]">
                                    <Link to={`/article/${article.slug}`}>
                                      {displayTitle}
                                    </Link>
                                  </h3>
                                  {formattedDate && (
                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock size={12} />
                                        {formattedDate}
                                      </span>
                                      <span className="font-medium text-gray-500">
                                        #{articleRank}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <div className="lg:col-span-6 h-full">
              {mainFeaturedArticle && (
                <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                  <div className="group relative">
                    <div className="overflow-hidden h-80 md:h-96">
                      <Link to={`/article/${mainFeaturedArticle.slug}`}>
                        {mainFeaturedArticle.coverImageUrl?.trim() ? (
                          <img
                            src={mainFeaturedArticle.coverImageUrl}
                            alt={mainFeaturedArticle.title}
                            className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                            No image available
                          </div>
                        )}
                      </Link>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="inline-block bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                      Featured
                    </div>
                    <h1 className="text-2xl md:text-xl font-bold text-gray-900 leading-tight mb-3">
                      <Link to={`/article/${mainFeaturedArticle.slug}`} className="hover:underline">
                        {mainFeaturedArticle.title}
                      </Link>
                    </h1>
                    <div className="flex items-center text-sm text-gray-600 mb-6">
                      <Clock size={14} className="mr-1" />
                      <span>
                        {mainFeaturedArticle
                          ? formatArticleDate(mainFeaturedArticle, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                    {mainFeaturedArticle.summary && (
                      <p className="text-gray-600 text-base leading-relaxed">
                        {mainFeaturedArticle.summary}
                      </p>
                    )}
                    <div className="mt-auto pt-6">
                      <Link
                        to={`/article/${mainFeaturedArticle.slug}`}
                        className="inline-flex items-center gap-2 text-red-600 font-semibold hover:underline"
                      >
                        Read full story
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="lg:col-span-3 h-full">
              <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col">
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-lg font-bold text-gray-800 mb-5 pb-2 border-b border-gray-100 relative">
                    Latest Updates
                    <span className="absolute bottom-0 left-0 w-10 h-0.5 bg-gradient-to-r from-red-500 to-orange-500"></span>
                  </h2>
                  <div className="space-y-4">
                    {latestHighlights.map(article => {
                      const formattedDate = formatArticleDate(article, {
                        month: 'short',
                        day: 'numeric',
                      });
                      const categoryName = categories.find(c => c.id === article.categoryId)?.name;

                      return (
                        <div key={article.id} className="flex items-start gap-3 group rounded-lg transition-colors hover:bg-gray-50 p-2">
                          <span className="mt-2 h-2 w-2 rounded-full bg-red-500 group-hover:bg-red-600 transition-colors"></span>
                          <div className="flex-1">
                            <Link to={`/article/${article.slug}`} className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-red-600 transition-colors line-clamp-2">
                              {article.title}
                            </Link>
                            <div className="flex items-center text-xs text-gray-500 mt-1 gap-2">
                              {formattedDate && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formattedDate}
                                </span>
                              )}
                              {categoryName && <span className="text-red-600 font-medium">{categoryName}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Latest News Section */}
              <section className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 relative">
                      Latest News
                      <span className="absolute bottom-0 left-0 w-12 h-1 bg-red-600 rounded-full"></span>
                    </h2>
                    <Link to="/trending" className="text-sm font-medium text-red-600 hover:underline flex items-center">
                      View All
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {latestArticles.map(article => (
                      <ArticleCardWrapper
                        key={article.id}
                        article={article}
                        category={categories.find(c => c.id === article.categoryId)}
                        className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 h-full"
                      />
                    ))}
                  </div>
                </div>
              </section>

              {/* Advertisement Section */}
              {topAdvertisements.length > 0 && (
                <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-md overflow-hidden border border-amber-100">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">Sponsored Content</h2>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Advertisement</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {topAdvertisements.map((article, index) => (
                        <div
                          key={article.id}
                          className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${index === 0 ? 'md:col-span-2' : ''}`}
                        >
                          <Link to={`/ads/${article.slug}`} className="block group">
                            <div className="h-48 overflow-hidden">
                              {article.coverImageUrl?.trim() ? (
                                <img
                                  src={article.coverImageUrl}
                                  alt={article.title}
                                  className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                                  No image available
                                </div>
                              )}
                            </div>
                            <div className="p-5">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs uppercase tracking-wide text-amber-600 font-semibold">Sponsored</span>
                                <span className="text-xs text-gray-400">{formatArticleDate(article, { month: 'short', day: 'numeric' })}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                                {article.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {article.summary}
                              </p>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-8">
              {/* Categories */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden h-full flex flex-col">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-100 relative">
                    Categories
                    <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600"></span>
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((category, index) => {
                      const colors = [
                        'bg-red-50 text-red-700 hover:bg-red-100',
                        'bg-blue-50 text-blue-700 hover:bg-blue-100',
                        'bg-green-50 text-green-700 hover:bg-green-100',
                        'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
                        'bg-purple-50 text-purple-700 hover:bg-purple-100',
                        'bg-pink-50 text-pink-700 hover:bg-pink-100',
                      ];
                      const colorClass = colors[index % colors.length];

                      return (
                        <Link
                          key={category.id}
                          to={`/category/${category.slug}`}
                          className={`${colorClass} text-sm font-medium px-4 py-3 rounded-lg transition-all flex items-center justify-between`}
                        >
                          <span>{category.name}</span>
                          <span className="text-xs bg-white/50 rounded-full w-5 h-5 flex items-center justify-center">
                            {articlesForFeed.filter(a => a.categoryId === category.id).length}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Newsletter */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 text-center">
                  <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Stay Updated</h3>
                  <p className="text-blue-100 text-sm mb-4">Subscribe to our newsletter for the latest news and updates.</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="Your email address"
                      className="flex-1 px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/20 bg-white/10 text-white placeholder-blue-200"
                    />
                    <button className="bg-white text-blue-700 hover:bg-blue-50 font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                      Subscribe
                    </button>
                  </div>
                  <p className="text-blue-200 text-xs mt-3">We respect your privacy. Unsubscribe at any time.</p>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomePage;



