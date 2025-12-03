
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { fetchArticlesWithMeta, fetchCategories } from '../services/api';
import ArticleCard from '../components/ui/ArticleCard';
import { Article, Category } from '../types';

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null | undefined>(undefined);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextKey, setNextKey] = useState<string | undefined>(undefined);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const BASE_TITLE = 'Vadali Media';

  // Keep a single, globally sorted list so pagination chunks don't reorder when appended
  const mergeAndSortArticles = (items: Article[]) => {
    const deduped = new Map<string, Article>();
    for (const article of items) {
      if (article.id) {
        deduped.set(article.id, article);
      }
    }
    return Array.from(deduped.values()).sort((a, b) => {
      const toTs = (value?: string | null) => {
        const ts = value ? Date.parse(value) : NaN;
        return Number.isFinite(ts) ? ts : 0;
      };
      return toTs(b.createdAt) - toTs(a.createdAt);
    });
  };
  
  useEffect(() => {
    const loadData = async () => {
      if (!slug) {
        setCategory(null);
        setLoading(false);
        setInitialLoadComplete(true);
        return;
      }
      try {
        setLoading(true);
        const allCategories = await fetchCategories();
        const currentCategory = allCategories.find(c => c.slug === slug);
        setCategory(currentCategory);

        if (currentCategory) {
          const { items, lastEvaluatedKey, hasMore } = await fetchArticlesWithMeta({
            categoryId: currentCategory.id,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 20,
          });
          setArticles(mergeAndSortArticles(items));
          setNextKey(hasMore && lastEvaluatedKey ? lastEvaluatedKey : undefined);
        }
      } catch (error) {
        console.error("Failed to load category data", error);
        setCategory(null);
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };
    loadData();
  }, [slug]);

  const loadMore = async () => {
    if (!category || !nextKey) return;
    try {
      setLoadingMore(true);
      const { items, lastEvaluatedKey, hasMore } = await fetchArticlesWithMeta({
        categoryId: category.id,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 20,
        lastEvaluatedKey: nextKey,
      });
      setArticles(prev => mergeAndSortArticles([...prev, ...items]));
      setNextKey(hasMore && lastEvaluatedKey ? lastEvaluatedKey : undefined);
    } catch (error) {
      console.error('Failed to load more category articles', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (category) {
      document.title = `${category.name} | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [category, BASE_TITLE]);

  const showEmptyState = initialLoadComplete && !loading && category && articles.length === 0;

  if (initialLoadComplete && !loading && !category) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="border-b-2 border-[#d32f2f] pb-2 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          {category ? category.name : 'Loading category...'}
        </h1>
        <p className="text-gray-500 mt-1">
          {category
            ? `Showing all articles in the "${category.name}" category.`
            : 'Fetching the latest articles...'}
        </p>
      </div>
      
      {articles.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {articles.map(article => (
              <ArticleCard 
                key={article.id}
                article={article}
                category={category}
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
      ) : showEmptyState ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-gray-700">No Articles Found</h2>
          <p className="text-gray-500 mt-2">There are no published articles in this category at the moment.</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-gray-700">Loading articles...</h2>
          <p className="text-gray-500 mt-2">Please wait while we fetch the latest stories.</p>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
