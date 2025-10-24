import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { fetchArticleById, fetchUser, fetchCategories } from '../../../services/api';
import { Article, User, Category } from '../../../types';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Calendar, User as UserIcon, MessageSquare, Tag, ArrowLeft } from 'lucide-react';
import { formatArticleDate } from '../../../lib/articleDate';

const PreviewArticle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [article, setArticle] = useState<Article | undefined | null>(undefined);
  const [author, setAuthor] = useState<User | undefined>(undefined);
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      if (!id) {
          setLoading(false);
          setArticle(null);
          return;
      }
      setLoading(true);
      fetchArticleById(id).then(articleData => {
          setArticle(articleData);
          if (articleData) {
              Promise.all([
                  fetchUser(articleData.authorId),
                  fetchCategories(),
              ]).then(([userData, categoryData]) => {
                  setAuthor(userData);
                  setCategory(categoryData.find(c => c.id === articleData.categoryId));
              }).finally(() => setLoading(false));
          } else {
              setLoading(false);
          }
      });
  }, [id]);

  if (loading) {
      return <LoadingSpinner label="Loading preview..." className="py-16" />;
  }

  if (!article) {
    return <Navigate to="/dashboard/author" replace />;
  }

  const publishedLabel = formatArticleDate(article, { dateStyle: 'long' });

  return (
    <>
        <div className="sticky top-0 bg-yellow-300 text-yellow-900 text-center py-2 font-semibold z-50">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <span>PREVIEW MODE</span>
                <Link to="/dashboard/author" className="flex items-center text-sm hover:underline">
                    <ArrowLeft size={16} className="mr-1" />
                    Back to Dashboard
                </Link>
            </div>
        </div>
        <div className="bg-gray-100 py-8">
            <div className="container mx-auto px-4">
                <div className="lg:max-w-4xl mx-auto">
                <article className="bg-white p-8 shadow-sm">
                    {category && (
                    <span className="text-sm font-bold text-white bg-[#1a237e] px-3 py-1 rounded-sm uppercase">
                        {category.name}
                    </span>
                    )}
                    <h1 className="text-3xl md:text-4xl font-bold my-4 text-gray-800 leading-tight">
                    {article.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 border-t border-b py-3 mb-6">
                    <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2" />
                        {author ? author.name : 'Unknown Author'}
                    </div>
                      <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" /> 
                          {publishedLabel || 'Not yet published'}
                      </div>
                    <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" /> {article.comments.length} Comments
                    </div>
                    </div>
                    
                    <p className="text-lg text-gray-600 mb-8">{article.summary}</p>

                    <img src={article.coverImageUrl} alt={article.title} className="w-full mb-8 rounded-md" />

                    <div className="prose lg:prose-lg" dangerouslySetInnerHTML={{ __html: article.content }} />
                    
                    <div className="mt-8 border-t pt-6 flex flex-wrap gap-2">
                        {article.tags.map(tag => (
                            <span 
                            key={tag} 
                            className="bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center"
                            >
                            <Tag size={12} className="mr-1.5" /> {tag}
                            </span>
                        ))}
                    </div>
                </article>
                </div>
            </div>
        </div>
    </>
  );
};

export default PreviewArticle;
