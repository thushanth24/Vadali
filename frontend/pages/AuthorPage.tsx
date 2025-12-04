import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { fetchArticlesWithMeta, fetchUser, fetchCategories } from '../services/api';
import { Article, User, Category } from '../types';
import ArticleCard from '../components/ui/ArticleCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getImageUrl } from '../utils/imageUrl';

const AuthorPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>(); // Using slug as authorId
  const [author, setAuthor] = useState<User | undefined | null>(undefined);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextKey, setNextKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      Promise.all([
        fetchUser(slug),
        fetchArticlesWithMeta({ author: slug, sortBy: 'createdAt', sortOrder: 'desc', limit: 20 }),
        fetchCategories()
      ]).then(([authorData, articlesData, categoriesData]) => {
        setAuthor(authorData);
        setArticles(articlesData.items);
        setNextKey(articlesData.hasMore && articlesData.lastEvaluatedKey ? articlesData.lastEvaluatedKey : undefined);
        setCategories(categoriesData);
      }).catch(() => {
        setAuthor(null);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [slug]);

  const loadMore = async () => {
    if (!slug || !nextKey) return;
    try {
      setLoadingMore(true);
      const { items, hasMore, lastEvaluatedKey } = await fetchArticlesWithMeta({
        author: slug,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 20,
        lastEvaluatedKey: nextKey,
      });
      setArticles(prev => [...prev, ...items]);
      setNextKey(hasMore && lastEvaluatedKey ? lastEvaluatedKey : undefined);
    } catch (error) {
      console.error('Failed to load more author articles', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading author profile..." className="container mx-auto px-4" />;
  }

  if (!author) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-lg shadow-md mb-8 flex flex-col md:flex-row items-center gap-8">
          <img src={getImageUrl(author.avatarUrl)} alt={author.name} className="h-32 w-32 rounded-full ring-4 ring-blue-100" />
          <div>
            <h1 className="text-4xl font-bold text-gray-800">{author.name}</h1>
            <p className="text-lg text-gray-600 mt-1">{author.role}</p>
            <p className="text-gray-700 mt-4 max-w-2xl">{author.bio || 'This author has not provided a bio yet.'}</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-[#d32f2f] pb-2 mb-6">
          Articles by {author.name}
        </h2>

        {articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <ArticleCard 
                  key={article.id}
                  article={article}
                  category={categories.find(c => c.id === article.categoryId)}
                />
              ))}
            </div>
            {nextKey && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-700">{author.name} has not published any articles yet.</h3>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Return to Homepage</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorPage;
