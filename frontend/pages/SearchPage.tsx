import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchArticlesWithMeta, fetchCategories } from '../services/api';
import ArticleCard from '../components/ui/ArticleCard';
import { Article, Category } from '../types';
import { Search } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextKey, setNextKey] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (query) {
      setLoading(true);
      Promise.all([
        fetchArticlesWithMeta({ query, sortBy: 'createdAt', sortOrder: 'desc', limit: 20 }),
        fetchCategories()
      ]).then(([articleData, categoryData]) => {
        setSearchResults(articleData.items);
        setNextKey(articleData.hasMore && articleData.lastEvaluatedKey ? articleData.lastEvaluatedKey : undefined);
        setCategories(categoryData);
      }).finally(() => setLoading(false));
    } else {
      setSearchResults([]);
      setNextKey(undefined);
    }
  }, [query]);

  const loadMore = async () => {
    if (!query || !nextKey) return;
    try {
      setLoadingMore(true);
      const { items, hasMore, lastEvaluatedKey } = await fetchArticlesWithMeta({
        query,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 20,
        lastEvaluatedKey: nextKey,
      });
      setSearchResults(prev => [...prev, ...items]);
      setNextKey(hasMore && lastEvaluatedKey ? lastEvaluatedKey : undefined);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="border-b-2 border-[#d32f2f] pb-2 mb-6 flex items-center">
        <Search className="h-8 w-8 mr-3 text-gray-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Search Results</h1>
          {query && <p className="text-gray-500 mt-1">Showing results for: "{query}"</p>}
        </div>
      </div>
      
      {loading ? (
        <LoadingSpinner label="Searching articles..." className="py-16" />
      ) : query ? (
        searchResults.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {searchResults.map(article => (
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
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-gray-700">No Results Found</h2>
            <p className="text-gray-500 mt-2">Sorry, we couldn't find any articles matching your search.</p>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Return to Homepage</Link>
          </div>
        )
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-gray-700">What are you looking for?</h2>
          <p className="text-gray-500 mt-2">Use the search bar in the header to find articles.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
