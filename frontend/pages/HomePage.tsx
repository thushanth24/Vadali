
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ArticleCard, { ArticleCardProps } from '../components/ui/ArticleCard';
import { fetchArticles, fetchCategories } from '../services/api';
import { Article, Category } from '../types';
import { Clock } from 'lucide-react';

// Extended ArticleCard component with additional props
interface ExtendedArticleCardProps extends Omit<ArticleCardProps, 'className'> {
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

const ArticleCardWrapper: React.FC<ExtendedArticleCardProps> = (props) => {
  const { variant = 'vertical', className = '', ...rest } = props;
  
  if (variant === 'horizontal') {
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
          <p className="text-gray-600 text-sm line-clamp-2">{rest.article.summary}</p>
          <div className="flex items-center text-xs text-gray-500 mt-2">
            <Clock size={12} className="mr-1" />
            <span>{
              rest.article.publishedAt ? 
              new Date(rest.article.publishedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              }) : ''
            }</span>
          </div>
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
      {i < 4 && <span className="mx-4 text-gray-300">•</span>}
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
          animation: marquee 60s linear infinite;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [articlesData, categoriesData] = await Promise.all([
            fetchArticles(),
            fetchCategories()
        ]);
        setPublishedArticles(articlesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Failed to load homepage data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const articlesForFeed = publishedArticles.filter(a => !a.isAdvertisement);
  const advertisementArticles = publishedArticles.filter(a => a.isAdvertisement);
  
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
                      <img 
                        src={mainFeaturedArticle.coverImageUrl} 
                        alt={mainFeaturedArticle.title} 
                        className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                      <div className="max-w-3xl">
                        <div className="inline-block bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                          Featured
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                          <Link to={`/article/${mainFeaturedArticle.slug}`} className="hover:underline">
                            {mainFeaturedArticle.title}
                          </Link>
                        </h1>
                        <p className="text-gray-200 text-sm line-clamp-2">{mainFeaturedArticle.summary}</p>
                        <div className="flex items-center mt-3 text-sm text-gray-300">
                          <Clock size={14} className="mr-1" />
                          <span>{new Date(mainFeaturedArticle.publishedAt!).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Top Stories</h2>
                  <div className="space-y-4">
                    {topStories.map((article, index) => (
                      <div 
                        key={article.id} 
                        className={`flex items-start gap-4 group p-3 rounded-lg transition-all duration-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                      >
                        <div className="w-24 h-20 flex-shrink-0 overflow-hidden rounded-md shadow-sm">
                          <Link to={`/article/${article.slug}`}>
                            <img 
                              src={article.coverImageUrl} 
                              alt={article.title} 
                              className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-110"
                            />
                          </Link>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 leading-tight group-hover:text-red-600 transition-colors">
                            <Link to={`/article/${article.slug}`} className="line-clamp-2">
                              {article.title}
                            </Link>
                          </h3>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Clock size={12} className="mr-1 flex-shrink-0" />
                            <span className="truncate">
                              {new Date(article.publishedAt!).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="mx-2">•</span>
                            <span className="text-red-600 font-medium">
                              {categories.find(c => c.id === article.categoryId)?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {latestArticles.map((article, index) => {
                    const category = categories.find(c => c.id === article.categoryId);
                    return (
                      <ArticleCardWrapper 
                        key={article.id}
                        article={article}
                        category={category}
                        variant={index === 0 ? 'horizontal' : 'vertical'}
                        className={index === 0 ? 'sm:col-span-2' : ''}
                      />
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Advertisement Section */}
            {advertisementArticles.length > 0 && (
              <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Sponsored Content</h2>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Advertisement</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {advertisementArticles.map((article, index) => (
                      <div 
                        key={article.id}
                        className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 ${index === 0 ? 'md:col-span-2' : ''}`}
                      >
                        <Link to={`/article/${article.slug}`} className="block group">
                          <div className="relative">
                            <img 
                              src={article.coverImageUrl} 
                              alt={article.title} 
                              className="w-full h-48 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                              <div>
                                <span className="inline-block bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded-full mb-2">
                                  Sponsored
                                </span>
                                <h3 className="text-lg font-bold text-white line-clamp-2">
                                  {article.title}
                                </h3>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
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
                  {trendingArticles.map((article, index) => (
                    <div 
                      key={article.id} 
                      className="flex items-start gap-4 group p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className={`text-2xl font-extrabold ${index < 3 ? 'bg-gradient-to-br from-red-600 to-orange-500 bg-clip-text text-transparent' : 'text-gray-200'} flex-shrink-0 w-8 h-8 flex items-center justify-center`}>
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-800 leading-tight group-hover:text-red-600 transition-colors">
                          <Link to={`/article/${article.slug}`} className="line-clamp-2">
                            {article.title}
                          </Link>
                        </h3>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock size={12} className="mr-1" />
                          <span>{new Date(article.publishedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
