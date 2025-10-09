import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchArticles, fetchCategories } from '../services/api';
import ArticleCard from '../components/ui/ArticleCard';
import { Article, Category } from '../types';
import { Tag } from 'lucide-react';

const TagPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const tagName = slug ? decodeURIComponent(slug) : '';

  useEffect(() => {
    if (tagName) {
      setLoading(true);
      Promise.all([
        fetchArticles({ tag: tagName }),
        fetchCategories()
      ]).then(([articleData, categoryData]) => {
        setArticles(articleData);
        setCategories(categoryData);
      }).finally(() => setLoading(false));
    }
  }, [tagName]);
  
  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading articles...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="border-b-2 border-[#d32f2f] pb-2 mb-6 flex items-center">
        <Tag className="h-8 w-8 mr-3 text-gray-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">#{tagName}</h1>
          <p className="text-gray-500 mt-1">Showing all articles tagged with "{tagName}".</p>
        </div>
      </div>
      
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.map(article => (
            <ArticleCard 
              key={article.id}
              article={article}
              category={categories.find(c => c.id === article.categoryId)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-gray-700">No Articles Found</h2>
          <p className="text-gray-500 mt-2">There are no published articles with this tag at the moment.</p>
          <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Return to Homepage</Link>
        </div>
      )}
    </div>
  );
};

export default TagPage;