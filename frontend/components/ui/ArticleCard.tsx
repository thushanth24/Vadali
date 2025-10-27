import React from 'react';
import { Link } from 'react-router-dom';
import { Article, Category } from '../../types';
import { formatArticleDate } from '../../lib/articleDate';
import { Clock } from 'lucide-react';

export interface ArticleCardProps {
  article: Article;
  category?: Category;
  hideImage?: boolean; 
  isAdvertisement?: boolean;
  className?: string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ 
  article, 
  category, 
  hideImage = false, 
  isAdvertisement = false,
  className = ''
}) => {
  const isAd = isAdvertisement || article.isAdvertisement;
  const targetPath = isAd ? `/ads/${article.slug}` : `/article/${article.slug}`;

  const publishedDate = formatArticleDate(article, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={`bg-white group overflow-hidden relative ${className}`}>
      {isAd && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded z-10">
          Ad
        </div>
      )}
      {!hideImage && (
        <div className="overflow-hidden">
            <Link to={targetPath}>
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
          <Link to={targetPath} className="text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
            {article.title}
          </Link>
        </h3>
        {publishedDate && (
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <Clock size={14} className="mr-1.5" />
            <span>{publishedDate}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleCard;
