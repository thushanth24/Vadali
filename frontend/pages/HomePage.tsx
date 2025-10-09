
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ArticleCard from '../components/ui/ArticleCard';
import { fetchArticles, fetchCategories } from '../services/api';
import { Article, Category } from '../types';
import { Clock } from 'lucide-react';

// Inline component for the breaking news ticker
const BreakingNewsTicker: React.FC<{ articles: Article[] }> = ({ articles }) => {
  const breakingNews = articles.slice(0, 5).map(a => a.title).join('  ***  ');
  return (
    <div className="bg-[#d32f2f] text-white py-2 overflow-hidden">
      <div className="container mx-auto px-4 flex items-center">
        <span className="font-bold text-sm uppercase bg-white text-[#d32f2f] px-2 py-1 rounded-sm mr-4 flex-shrink-0">BREAKING</span>
        <div className="w-full relative overflow-hidden h-6">
          <p className="animate-marquee absolute whitespace-nowrap">
            {breakingNews}
          </p>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
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
    <>
      <BreakingNewsTicker articles={articlesForFeed} />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Featured Section */}
            {mainFeaturedArticle && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="group">
                  <div className="overflow-hidden relative">
                    <Link to={`/article/${mainFeaturedArticle.slug}`}>
                        <img src={mainFeaturedArticle.coverImageUrl} alt={mainFeaturedArticle.title} className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-300"/>
                    </Link>
                  </div>
                   <h1 className="text-2xl font-bold my-2 text-gray-900 leading-tight">
                      <Link to={`/article/${mainFeaturedArticle.slug}`} className="hover:text-blue-700 transition-colors">
                          {mainFeaturedArticle.title}
                      </Link>
                  </h1>
                  <p className="text-gray-600 text-sm">{mainFeaturedArticle.summary}</p>
                </div>
                <div className="space-y-4">
                    {topStories.map(article => (
                        <div key={article.id} className="flex items-start gap-4 group">
                            <div className="w-28 flex-shrink-0">
                                <Link to={`/article/${article.slug}`}>
                                    <img src={article.coverImageUrl} alt={article.title} className="w-full h-20 object-cover" />
                                </Link>
                            </div>
                            <div>
                               <h3 className="font-bold text-base text-gray-800 leading-tight">
                                   <Link to={`/article/${article.slug}`} className="group-hover:text-blue-700">{article.title}</Link>
                               </h3>
                               <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <Clock size={12} className="mr-1" />
                                    <span>{new Date(article.publishedAt!).toLocaleDateString()}</span>
                                </div>
                           </div>
                        </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* Latest News Section */}
             <section className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold border-b-2 border-[#d32f2f] pb-2 mb-6 text-gray-800">Latest News</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestArticles.map(article => (
                    <ArticleCard 
                    key={article.id} 
                    article={article}
                    category={categories.find(c => c.id === article.categoryId)}
                    />
                ))}
                </div>
            </section>

            {/* Advertisement Section */}
            {advertisementArticles.length > 0 && (
                <section className="bg-gray-50 p-6 rounded-lg shadow mt-8">
                    <h2 className="text-xl font-bold border-b-2 border-[#d32f2f] pb-2 mb-6 text-gray-800">Advertisements</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {advertisementArticles.map(article => (
                        <ArticleCard 
                        key={article.id} 
                        article={article}
                        category={categories.find(c => c.id === article.categoryId)}
                        isAdvertisement={true}
                        />
                    ))}
                    </div>
                </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-8">
             <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold border-b-2 border-[#d32f2f] pb-2 mb-6 text-gray-800">Popular News</h2>
                <div className="space-y-4">
                    {trendingArticles.map((article, index) => {
                        return (
                            <div key={article.id} className="flex gap-4 items-start group">
                                <span className="text-3xl font-bold text-gray-300">{index + 1}</span>
                                <div>
                                    <h3 className="font-bold text-base text-gray-800 leading-tight">
                                        <Link to={`/article/${article.slug}`} className="group-hover:text-blue-700">{article.title}</Link>
                                    </h3>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
             <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold border-b-2 border-[#d32f2f] pb-2 mb-6 text-gray-800">Categories</h2>
                <div className="space-y-2">
                    {categories.map(category => (
                        <Link key={category.id} to={`/category/${category.slug}`} className="block bg-gray-100 p-3 hover:bg-gray-200 transition-all rounded-md">
                            <span className="font-semibold text-gray-700">{category.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default HomePage;
