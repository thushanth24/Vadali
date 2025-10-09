import React from 'react';
import { Link } from 'react-router-dom';
import { Article, Category } from '../../types';
import { Clock } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  category?: Category;
  hideImage?: boolean; 
  isAdvertisement?: boolean;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, category, hideImage = false, isAdvertisement = false }) => {
  const publishedDate = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('ta-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : '';

  return (
    <div className="bg-white group overflow-hidden relative">
      {isAdvertisement && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded z-10">
          Ad
        </div>
      )}
      {!hideImage && (
        <div className="overflow-hidden">
            <Link to={`/article/${article.slug}`}>
                <img src={article.coverImageUrl} alt={article.title} className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300" />
            </Link>
        </div>
      )}
      <div className="p-4">
        {category && (
          <Link to={`/category/${category.slug}`} className="text-sm font-bold text-blue-700 uppercase hover:underline">
            {category.name}
          </Link>
        )}
        <h3 className="text-lg font-bold mt-2 leading-tight">
          <Link to={`/article/${article.slug}`} className="text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
            {article.title}
          </Link>
        </h3>
        <div className="mt-3 flex items-center text-xs text-gray-500">
            <Clock size={14} className="mr-1.5" />
            <span>{publishedDate}</span>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;