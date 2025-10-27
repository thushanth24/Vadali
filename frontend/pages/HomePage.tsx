
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ArticleCard, { ArticleCardProps } from '../components/ui/ArticleCard';
import { fetchArticles, fetchCategories } from '../services/api';
import { Article, Category } from '../types';
import { Clock } from 'lucide-react';
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [articlesData, categoriesData, advertisementsData] = await Promise.all([
            fetchArticles(),
            fetchCategories(),
            fetchArticles({ isAdvertisement: true, status: 'ALL', limit: 12 })
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

  if (loading) {
    return <LoadingSpinner label="Loading homepage..." fullScreen />;
  }

  const articlesForFeed = publishedArticles.filter(a => !a.isAdvertisement);
  const advertisementArticles = advertisements;
  const adsWithImages = advertisementArticles.filter(ad => ad.coverImageUrl?.trim());
  const adsWithoutImages = advertisementArticles.filter(ad => !ad.coverImageUrl?.trim());
  const topAdvertisements = [...adsWithImages, ...adsWithoutImages].slice(0, 2);
  
  const featuredArticles = articlesForFeed.filter(a => a.isFeatured);
  const nonFeaturedArticles = articlesForFeed.filter(a => !a.isFeatured);

  const mainFeaturedArticle = featuredArticles[0] || nonFeaturedArticles[0];
  const topStories = [...featuredArticles.slice(1, 4), ...nonFeaturedArticles.slice(0, 1)];
  const latestArticles = nonFeaturedArticles.slice(0, 6);
  const trendingArticles = [...articlesForFeed].sort((a, b) => b.views - a.views).slice(0, 6);

  return (
    <div className="bg-gray-50 min-h-screen">
      <BreakingNewsTicker articles={articlesForFeed} />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Featured Section */}
            {mainFeaturedArticle && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
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
                  <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Top Stories</h2>
                  <div className="space-y-4">
                    {topStories.map((article, index) => {
                      const formattedDate = formatArticleDate(article, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                      const categoryName = categories.find(c => c.id === article.categoryId)?.name;

                      return (
                        <div
                          key={article.id}
                          className={`flex items-start gap-4 group p-3 rounded-lg transition-all duration-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                        >
                          <div className="w-24 h-20 flex-shrink-0 overflow-hidden rounded-md shadow-sm">
                            <Link to={`/article/${article.slug}`}>
                              {article.coverImageUrl?.trim() ? (
                                <img
                                  src={article.coverImageUrl}
                                  alt={article.title}
                                  className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                  No image
                                </div>
                              )}
                            </Link>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800 leading-tight group-hover:text-red-600 transition-colors">
                              <Link to={`/article/${article.slug}`} className="line-clamp-2">
                                {article.title}
                              </Link>
                            </h3>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              {formattedDate && (
                                <>
                                  <Clock size={12} className="mr-1 flex-shrink-0" />
                                  <span className="truncate">{formattedDate}</span>
                                  <span className="mx-2">•</span>
                                </>
                              )}
                              {categoryName && (
                                <span className="text-red-600 font-medium">{categoryName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
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
                          <div className="relative">
                            {article.coverImageUrl?.trim() ? (
                              <img 
                                src={article.coverImageUrl} 
                                alt={article.title} 
                                className="w-full h-48 object-cover"
                              />
                            ) : (
                              <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                                Advertisement
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <span className="inline-block bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded-full mb-2">
                              Sponsored
                            </span>
                            <h3 className="text-lg font-bold text-gray-800 line-clamp-2 hover:text-blue-600 transition-colors">
                              {article.title}
                            </h3>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <Link
                      to="/ads"
                      className="inline-flex items-center justify-center px-5 py-2.5 border border-blue-600 text-blue-600 font-semibold rounded-md hover:bg-blue-50 transition-colors"
                    >
                      View All Ads
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Popular News */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-100 relative">
                  Trending Now
                  <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-gradient-to-r from-red-500 to-orange-500"></span>
                </h2>
                <div className="space-y-4">
                    {trendingArticles.map((article, index) => {
                      const formattedDate = formatArticleDate(article, {
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <div
                          key={article.id}
                          className="flex items-start gap-4 group p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span
                            className={`text-2xl font-extrabold ${index < 3 ? 'bg-gradient-to-br from-red-600 to-orange-500 bg-clip-text text-transparent' : 'text-gray-200'} flex-shrink-0 w-8 h-8 flex items-center justify-center`}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="font-semibold text-gray-800 leading-tight group-hover:text-red-600 transition-colors">
                              <Link to={`/article/${article.slug}`} className="line-clamp-2">
                                {article.title}
                              </Link>
                            </h3>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              {formattedDate && (
                                <>
                                  <Clock size={12} className="mr-1" />
                                  <span>{formattedDate}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
        </div>
      </main>
    </div>
  );
};

export default HomePage;


