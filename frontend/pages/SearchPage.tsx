import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchArticles, fetchCategories } from '../services/api';
import ArticleCard from '../components/ui/ArticleCard';
import { Article, Category } from '../types';
import { Search } from 'lucide-react';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      setLoading(true);
      Promise.all([
        fetchArticles({ query }),
        fetchCategories()
      ]).then(([articleData, categoryData]) => {
        setSearchResults(articleData);
        setCategories(categoryData);
      }).finally(() => setLoading(false));
    } else {
      setSearchResults([]);
    }
  }, [query]);

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
        <div className="text-center py-16">Loading...</div>
      ) : query ? (
        searchResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {searchResults.map(article => (
              <ArticleCard 
                key={article.id}
                article={article}
                category={categories.find(c => c.id === article.categoryId)}
              />
            ))}
          </div>
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