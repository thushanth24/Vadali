
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ArticleCard, { ArticleCardProps } from '../components/ui/ArticleCard';
import { fetchArticles, fetchArticlesWithMeta, fetchCategories } from '../services/api';
import { Article, Category } from '../types';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { formatArticleDate } from '../lib/articleDate';
import { getImageUrl } from '../utils/imageUrl';

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

const getArticlePublishedTimestamp = (article: Article): number => {
  return article.publishedAt ? new Date(article.publishedAt).getTime() : 0;
};

const getArticleUpdatedTimestamp = (article: Article): number => {
  if (article.updatedAt) {
    return new Date(article.updatedAt).getTime();
  }
  return article.createdAt ? new Date(article.createdAt).getTime() : 0;
};

const getArticleReleaseTimestamp = (article: Article): number => {
  const dateString = article.createdAt || article.updatedAt;
  return dateString ? new Date(dateString).getTime() : 0;
};

const dedupeArticlesById = (articles: Article[]): Article[] => {
  const seen = new Set<string>();
  return articles.filter(article => {
    if (seen.has(article.id)) {
      return false;
    }
    seen.add(article.id);
    return true;
  });
};

const compareByLatestUpdate = (a: Article, b: Article): number => {
  const updatedDiff = getArticleUpdatedTimestamp(b) - getArticleUpdatedTimestamp(a);
  if (updatedDiff !== 0) {
    return updatedDiff;
  }
  const publishedDiff = getArticlePublishedTimestamp(b) - getArticlePublishedTimestamp(a);
  if (publishedDiff !== 0) {
    return publishedDiff;
  }
  return getArticleReleaseTimestamp(b) - getArticleReleaseTimestamp(a);
};

const compareByPublishedDate = (a: Article, b: Article): number => {
  const publishedDiff = getArticlePublishedTimestamp(b) - getArticlePublishedTimestamp(a);
  if (publishedDiff !== 0) {
    return publishedDiff;
  }
  return getArticleReleaseTimestamp(b) - getArticleReleaseTimestamp(a);
};


const HomePage: React.FC = () => {
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [advertisements, setAdvertisements] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [releaseOrderedArticles, setReleaseOrderedArticles] = useState<Article[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(true);
  const [isRefreshingLatest, setIsRefreshingLatest] = useState(false);
  const [trendingStartIndex, setTrendingStartIndex] = useState(0);
  const [trendingDirection, setTrendingDirection] = useState<'up' | 'down'>('up');
  const [isTrendingAnimating, setIsTrendingAnimating] = useState(false);
  const trendingAnimationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const BASE_TITLE = 'Vadali Media';

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoadingHome(true);
        const [
          { items: articlesData = [] } = { items: [] },
          categoriesData = [],
          advertisementsData = [],
        ] = await Promise.all([
            fetchArticlesWithMeta({
              status: 'published',
              sortBy: 'createdAt',
              sortOrder: 'desc',
              limit: 20,
            }),
            fetchCategories(),
            fetchArticles({ isAdvertisement: true, limit: 12 })
        ]);
        if (!isMounted) return;

        const initialOrdered = dedupeArticlesById(
          articlesData
            .filter(article => !article.isAdvertisement)
            .sort(compareByLatestUpdate)
        );

        setPublishedArticles(articlesData);
        setReleaseOrderedArticles(initialOrdered);
        setCategories(categoriesData);
        setAdvertisements(advertisementsData.filter(article => article.isAdvertisement));
      } catch (error) {
        console.error("Failed to load homepage data", error);
      } finally {
        if (isMounted) {
          setIsLoadingHome(false);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const refreshLatestUpdates = async () => {
      try {
        setIsRefreshingLatest(true);
        const { items: latest = [] } = await fetchArticlesWithMeta({
          status: 'published',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        const sortedByReleaseTime = dedupeArticlesById(latest.filter(article => !article.isAdvertisement).sort(compareByLatestUpdate));
        if (isMounted) {
          setReleaseOrderedArticles(sortedByReleaseTime);
        }
      } catch (error) {
        console.error('Failed to refresh latest updates', error);
      } finally {
        if (isMounted) {
          setIsRefreshingLatest(false);
        }
      }
    };

    refreshLatestUpdates();
    const intervalId = setInterval(refreshLatestUpdates, 60000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    document.title = BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, []);

  const articlesForFeed = useMemo(
    () => publishedArticles.filter(a => !a.isAdvertisement),
    [publishedArticles]
  );

  const advertisementArticles = useMemo(() => advertisements, [advertisements]);
  const adsWithImages = useMemo(
    () => advertisementArticles.filter(ad => ad.coverImageUrl?.trim()),
    [advertisementArticles]
  );
  const adsWithoutImages = useMemo(
    () => advertisementArticles.filter(ad => !ad.coverImageUrl?.trim()),
    [advertisementArticles]
  );
  const topAdvertisements = useMemo(
    () => [...adsWithImages, ...adsWithoutImages].slice(0, 2),
    [adsWithImages, adsWithoutImages]
  );
  
  const featuredArticles = useMemo(
    () => articlesForFeed.filter(a => a.isFeatured),
    [articlesForFeed]
  );
  const nonFeaturedArticles = useMemo(
    () => articlesForFeed.filter(a => !a.isFeatured),
    [articlesForFeed]
  );

  const mainFeaturedArticle = useMemo(
    () => featuredArticles[0] || nonFeaturedArticles[0],
    [featuredArticles, nonFeaturedArticles]
  );

  const releaseSortedFeed = useMemo(() => {
    const baseArticles = releaseOrderedArticles.length > 0
      ? releaseOrderedArticles
      : articlesForFeed;

    return dedupeArticlesById([...baseArticles].sort(compareByLatestUpdate));
  }, [articlesForFeed, releaseOrderedArticles]);

  const latestArticles = useMemo(
    () => releaseSortedFeed.filter(article => !article.isFeatured).slice(0, 5),
    [releaseSortedFeed]
  );
  const trendingArticles = useMemo(
    () => releaseSortedFeed.slice(0, 5),
    [releaseSortedFeed]
  );
  const trendingHighlights = useMemo(
    () => trendingArticles.slice(0, 5),
    [trendingArticles]
  );
  const sidebarLatestArticles = useMemo(
    () => releaseSortedFeed.slice(0, 5),
    [releaseSortedFeed]
  );
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

  // Group articles by category (memoized to avoid rework on each render)
  const articlesByCategory = useMemo(
    () =>
      categories
        .map(category => ({
          ...category,
          articles: releaseSortedFeed
            .filter(article => article.categoryId === category.id)
            .sort(compareByLatestUpdate)
            .slice(0, 4),
        }))
        .filter(category => category.articles.length > 0),
    [categories, releaseSortedFeed]
  );

  const isInitialLoading = isLoadingHome && releaseSortedFeed.length === 0 && publishedArticles.length === 0;
  const showLoadingShell = isInitialLoading || (isRefreshingLatest && releaseSortedFeed.length === 0);

  const renderListSkeleton = (count: number) => (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg bg-white shadow-sm animate-pulse"
        >
          <div className="w-20 h-16 bg-gray-200 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderCardSkeletonGrid = (count: number, className: string) => (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse h-full flex flex-col"
        >
          <div className="aspect-video bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );

  const heroSkeleton = (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse h-full flex flex-col">
      <div className="h-80 md:h-96 bg-gray-200" />
      <div className="p-6 space-y-4">
        <div className="inline-block bg-gray-200 h-6 w-20 rounded-full" />
        <div className="h-10 bg-gray-200 rounded w-5/6" />
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
          <div className="h-4 bg-gray-200 rounded w-3/5" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-150 min-h-screen">
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slide-down {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-trending-up > * {
          animation: slide-up 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }

        .animate-trending-down > * {
          animation: slide-down 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }

        /* Staggered animation for items */
        .animate-trending-up > *:nth-child(1) { animation-delay: 0.05s; }
        .animate-trending-up > *:nth-child(2) { animation-delay: 0.1s; }
        .animate-trending-up > *:nth-child(3) { animation-delay: 0.15s; }
        .animate-trending-up > *:nth-child(4) { animation-delay: 0.2s; }

        .animate-trending-down > *:nth-child(1) { animation-delay: 0.05s; }
        .animate-trending-down > *:nth-child(2) { animation-delay: 0.1s; }
        .animate-trending-down > *:nth-child(3) { animation-delay: 0.15s; }
        .animate-trending-down > *:nth-child(4) { animation-delay: 0.2s; }
      `}</style>
      <BreakingNewsTicker articles={articlesForFeed} />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-10">
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <aside className="lg:col-span-3 h-full space-y-6">
              {/* Trending Now Section */}
              <div className="bg-gray-100 border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                      Trending Now
                    </h2>
                    <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => handleTrendingStep('up')}
                        className="p-1.5 rounded-md bg-white text-red-600 hover:bg-red-50 transition-all duration-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Previous story"
                        disabled={!canManuallyCycleTrending}
                      >
                        <ChevronUp size={16} strokeWidth={2.5} />
                      </button>
                      <div className="h-4 w-px bg-white/30"></div>
                      <button
                        type="button"
                        onClick={() => handleTrendingStep('down')}
                        className="p-1.5 rounded-md bg-white text-red-600 hover:bg-red-50 transition-all duration-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Next story"
                        disabled={!canManuallyCycleTrending}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                 
                </div>

                <div className="p-4">
                  {visibleTrending.length === 0 && showLoadingShell ? (
                    renderListSkeleton(4)
                  ) : visibleTrending.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No trending stories available.</p>
                  ) : (
                    <div 
                      className={`space-y-4 ${trendingAnimationClass}`}
                      style={{
                        perspective: '1000px',
                        transformStyle: 'preserve-3d'
                      }}
                    >
                      {visibleTrending.map((article, index) => {
                        const formattedDate = formatArticleDate(article, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const displayTitle = article.title.length > MAX_TRENDING_TITLE_LENGTH
                          ? `${article.title.slice(0, MAX_TRENDING_TITLE_LENGTH - 3)}...`
                          : article.title;

                        return (
                          <article 
                            key={article.id}
                            className="group relative overflow-hidden rounded-lg bg-gray-50 hover:bg-white hover:shadow-md transition-all duration-300 border border-gray-100 transform hover:-translate-y-0.5"
                            style={{
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              willChange: 'transform, box-shadow'
                            }}
                          >
                            <Link to={`/article/${article.slug}`} className="block">
                              <div className="flex items-start p-3">
                                {article.coverImageUrl ? (
                                  <div className="w-20 h-16 flex-shrink-0 rounded-md overflow-hidden bg-white shadow-sm">
                                    <img
                                      src={getImageUrl(article.coverImageUrl)}
                                      alt={article.title}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-16 flex-shrink-0 rounded-md bg-white shadow-sm flex items-center justify-center text-xs text-gray-400">
                                    No Image
                                  </div>
                                )}
                                <div className="ml-3 flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-red-600 transition-colors line-clamp-2">
                                    {displayTitle}
                                  </h3>
                                  {formattedDate && (
                                    <div className="mt-1.5 flex items-center text-xs text-gray-500">
                                      <Clock size={12} className="mr-1 flex-shrink-0" />
                                      <span className="truncate">{formattedDate}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Link>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-100 via-red-400 to-red-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <div className="lg:col-span-6 h-full">
              {mainFeaturedArticle ? (
                <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                  <div className="group relative">
                    <div className="overflow-hidden h-80 md:h-96">
                      <Link to={`/article/${mainFeaturedArticle.slug}`}>
                        {mainFeaturedArticle.coverImageUrl?.trim() ? (
                            <img
                              src={getImageUrl(mainFeaturedArticle.coverImageUrl)}
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
              ) : showLoadingShell ? (
                heroSkeleton
              ) : null}
            </div>

            <aside className="lg:col-span-3 h-full space-y-6">
              {/* Latest Updates Section */}
              <div className="bg-gray-100 border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-6 py-4 border-b border-blue-800">
                  <h2 className="text-lg font-bold text-white">
                    Latest Updates
                  </h2>
                </div>
                <div className="p-4">
                  {sidebarLatestArticles.length === 0 && showLoadingShell ? (
                    renderListSkeleton(4)
                  ) : sidebarLatestArticles.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No latest updates available.</p>
                  ) : (
                    <div className="space-y-4">
                      {sidebarLatestArticles.map((article) => {
                        const formattedDate = formatArticleDate(article, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const categoryName = categories.find(c => c.id === article.categoryId)?.name;
                        const displayTitle = article.title.length > MAX_TRENDING_TITLE_LENGTH
                          ? `${article.title.slice(0, MAX_TRENDING_TITLE_LENGTH - 3)}...`
                          : article.title;

                        return (
                          <article 
                            key={article.id}
                            className="group relative overflow-hidden rounded-lg bg-gray-50 hover:bg-white hover:shadow-md transition-all duration-300 border border-gray-100 transform hover:-translate-y-0.5"
                            style={{
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              willChange: 'transform, box-shadow'
                            }}
                          >
                            <Link to={`/article/${article.slug}`} className="block">
                              <div className="flex items-start p-3">
                                {article.coverImageUrl ? (
                                  <div className="w-20 h-16 flex-shrink-0 rounded-md overflow-hidden bg-white shadow-sm">
                                    <img
                                      src={getImageUrl(article.coverImageUrl)}
                                      alt={article.title}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-16 flex-shrink-0 rounded-md bg-white shadow-sm flex items-center justify-center text-xs text-gray-400">
                                    No Image
                                  </div>
                                )}
                                <div className="ml-3 flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                                    {displayTitle}
                                  </h3>
                                  <div className="mt-1.5 flex items-center justify-between">
                                    <div className="flex items-center text-xs text-gray-500">
                                      <Clock size={12} className="mr-1 flex-shrink-0" />
                                      <span className="truncate">{formattedDate}</span>
                                    </div>
                                    {categoryName && (
                                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                        {categoryName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Link>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-100 via-blue-400 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </section>

          <div className="space-y-6">
            {/* Latest News Section */}
            <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 relative inline-block">
                      Latest News
                      <span className="absolute bottom-0 left-0 w-12 h-1 bg-gradient-to-r from-red-600 to-orange-500 rounded-full"></span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Stay updated with the most recent stories</p>
                  </div>
                  <Link 
                    to="/trending" 
                    className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline flex items-center transition-colors duration-200 group"
                  >
                    View All
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 ml-1.5 transform group-hover:translate-x-1 transition-transform duration-200" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                {showLoadingShell && latestArticles.length === 0 ? (
                  renderCardSkeletonGrid(6, "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6")
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {latestArticles.map((article, index) => (
                      <div 
                        key={article.id} 
                        className={`relative group ${index < 3 ? 'md:first:col-span-2 lg:first:col-span-1' : ''}`}
                      >
                        <ArticleCardWrapper
                          article={article}
                          category={categories.find(c => c.id === article.categoryId)}
                          className={`bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gray-200 transition-all duration-300 h-full flex flex-col group-hover:shadow-lg ${
                            index < 3 ? 'md:first:flex-row md:first:h-64' : ''
                          }`}
                        />
                        {index < 3 && (
                          <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                            {index === 0 ? 'Latest' : `#${index + 1}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Category-wise News Sections - Full Width */}
            <div className="space-y-8">
              {articlesByCategory.length === 0 && showLoadingShell ? (
                Array.from({ length: 2 }).map((_, sectionIndex) => (
                  <section key={`category-skeleton-${sectionIndex}`} className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6 space-y-4 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-32" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {Array.from({ length: 4 }).map((_, cardIndex) => (
                          <div
                            key={cardIndex}
                            className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm h-full"
                          >
                            <div className="aspect-video bg-gray-200 rounded-t-2xl" />
                            <div className="p-4 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-5/6" />
                              <div className="h-3 bg-gray-200 rounded w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                ))
              ) : (
                articlesByCategory.map(category => (
                  <section key={category.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 relative">
                          {category.name}
                          <span className="absolute bottom-0 left-0 w-12 h-1 bg-blue-600 rounded-full"></span>
                        </h2>
                        <Link 
                          to={`/category/${category.slug}`}
                          className="text-sm font-medium text-blue-600 hover:underline flex items-center"
                        >
                          View All
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {category.articles.map(article => (
                          <ArticleCardWrapper
                            key={article.id}
                            article={article}
                            category={category}
                            className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 h-full"
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                ))
              )}
            </div>

            {/* Full Width Sponsored Content Section - Responsive */}
            <div className="w-full">
              {topAdvertisements.length > 0 ? (
                <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-md overflow-hidden border border-amber-100 mb-8">
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Sponsored Content</h2>
                      <div className="flex items-center flex-wrap gap-2 sm:gap-4">
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            alert('View All clicked! This will show all advertisements.');
                            // TODO: Add navigation to advertisements page
                          }}
                          className="text-sm font-medium text-blue-600 hover:underline flex items-center cursor-pointer whitespace-nowrap"
                        >
                          View All
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Advertisement</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {topAdvertisements.slice(0, 4).map((article) => (
                        <div
                          key={article.id}
                          className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full flex flex-col"
                        >
                          <Link to={`/ads/${article.slug}`} className="block group h-full flex flex-col">
                            <div className="aspect-video overflow-hidden">
                              {article.coverImageUrl?.trim() ? (
                                <img
                                  src={getImageUrl(article.coverImageUrl)}
                                  alt={article.title}
                                  className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm p-4">
                                  No image available
                                </div>
                              )}
                            </div>
                            <div className="p-3 sm:p-4 flex-1 flex flex-col">
                              <div className="flex items-center justify-between mb-1 sm:mb-2 gap-2">
                                <span className="text-[10px] xs:text-xs uppercase tracking-wide text-amber-600 font-semibold">Sponsored</span>
                                <span className="text-[10px] xs:text-xs text-gray-400 whitespace-nowrap">
                                  {formatArticleDate(article, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <h3 className="text-sm sm:text-base font-semibold text-gray-800 group-hover:text-red-600 transition-colors line-clamp-2">
                                {article.title}
                              </h3>
                              {article.summary && (
                                <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2 line-clamp-2">
                                  {article.summary}
                                </p>
                              )}
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : showLoadingShell ? (
                <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-md overflow-hidden border border-amber-100 mb-8">
                  <div className="p-4 sm:p-6 space-y-6 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-7 bg-gray-200 rounded w-48" />
                      <div className="h-6 bg-gray-200 rounded w-24" />
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="bg-white rounded-lg overflow-hidden shadow-sm h-full flex flex-col">
                          <div className="aspect-video bg-gray-200" />
                          <div className="p-4 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-5/6" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}
            </div>

            {/* Main Content and Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
              <div className="lg:col-span-8">
                {/* Main content can go here */}
              </div>
              <aside className="lg:col-span-4 space-y-8">
                {/* Sidebar content */}
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
