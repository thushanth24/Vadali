
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { fetchArticles, fetchCategories } from '../services/api';
import ArticleCard from '../components/ui/ArticleCard';
import { Article, Category } from '../types';

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null | undefined>(undefined);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const BASE_TITLE = 'Vadali Media';
  
  useEffect(() => {
    const loadData = async () => {
      if (!slug) {
        setCategory(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const allCategories = await fetchCategories();
        const currentCategory = allCategories.find(c => c.slug === slug);
        setCategory(currentCategory);

        if (currentCategory) {
          const articlesData = await fetchArticles({ categoryId: currentCategory.id });
          setArticles(articlesData);
        }
      } catch (error) {
        console.error("Failed to load category data", error);
        setCategory(null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [slug]);

  useEffect(() => {
    if (loading) {
      document.title = `⏳ ${BASE_TITLE}`;
      return;
    }

    if (category) {
      document.title = `${category.name} | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [loading, category, BASE_TITLE]);

  // While loading, don't render the empty state to avoid flicker; defer rendering until data arrives
  if (loading) return null;

  if (!category) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="border-b-2 border-[#d32f2f] pb-2 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{category.name}</h1>
        <p className="text-gray-500 mt-1">Showing all articles in the "{category.name}" category.</p>
      </div>
      
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.map(article => (
            <ArticleCard 
              key={article.id}
              article={article}
              category={category}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-gray-700">No Articles Found</h2>
          <p className="text-gray-500 mt-2">There are no published articles in this category at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
