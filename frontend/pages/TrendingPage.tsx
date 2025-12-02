import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticlesWithMeta, fetchCategories } from '../services/api';
import { Article, Category } from '../types';
import { Eye, Flame } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TrendingPage: React.FC = () => {
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchArticlesWithMeta({ sortBy: 'views', sortOrder: 'desc' }), // Fetch-all capped, then client sorts
      fetchCategories()
    ]).then(([articleData, categoryData]) => {
      // Manual sort on client as mock backend doesn't support it yet
      const sorted = [...articleData.items].sort((a,b) => b.views - a.views);
      setTrendingArticles(sorted);
      setCategories(categoryData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading trending articles..." className="container mx-auto px-4" />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="border-b-2 border-[#d32f2f] pb-2 mb-6 flex items-center">
        <Flame className="h-8 w-8 mr-3 text-[#d32f2f]" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Trending Articles</h1>
          <p className="text-gray-500 mt-1">Our most read stories right now.</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="space-y-6">
          {trendingArticles.map((article, index) => {
            const category = categories.find(c => c.id === article.categoryId);
            return (
              <div key={article.id} className="grid grid-cols-12 gap-4 items-center border-b pb-6 last:border-b-0 last:pb-0">
                <span className="col-span-1 text-3xl md:text-4xl font-bold text-gray-300 text-center">
                  {index + 1}
                </span>
                <div className="col-span-3 md:col-span-2">
                  <Link to={`/article/${article.slug}`}>
                    <img src={article.coverImageUrl} alt={article.title} className="w-full h-24 object-cover rounded-md" />
                  </Link>
                </div>
                <div className="col-span-8 md:col-span-9">
                  {category && (
                    <Link to={`/category/${category.slug}`} className="text-xs font-bold text-blue-700 uppercase hover:underline">
                      {category.name}
                    </Link>
                  )}
                  <h3 className="text-lg font-bold mt-1 leading-tight">
                    <Link to={`/article/${article.slug}`} className="text-gray-800 hover:text-blue-700 transition-colors">
                      {article.title}
                    </Link>
                  </h3>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <Eye size={16} className="mr-1.5" />
                    <span>{article.views.toLocaleString()} views</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrendingPage;
