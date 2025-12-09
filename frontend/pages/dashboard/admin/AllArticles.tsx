import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticlesWithMeta, fetchUsers, fetchCategories, deleteArticle } from '../../../services/api';
import { Article, ArticleStatus, User, Category } from '../../../types';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Edit, Trash2, Eye } from 'lucide-react';
import { formatArticleDate } from '../../../lib/articleDate';

const AllArticles: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [articlesLoading, setArticlesLoading] = useState(true);
    const [metaLoading, setMetaLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const totalPages = Math.max(1, Math.ceil(articles.length / pageSize));
    const isLoading = articlesLoading || metaLoading;
    const getUploadTimestamp = (article: Article) => {
        const dateString = article.createdAt || article.publishedAt || article.updatedAt;
        return dateString ? new Date(dateString).getTime() : 0;
    };

    const handleDelete = async (articleId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this article?')) {
            try {
                await deleteArticle(articleId);
                await loadArticles();
                alert('Article deleted successfully.');
            } catch {
                alert('Failed to delete article.');
            }
        }
    };
    
    const getStatusChip = (status: ArticleStatus) => {
        const styles = {
            [ArticleStatus.PUBLISHED]: 'bg-green-100 text-green-800',
            [ArticleStatus.PENDING_REVIEW]: 'bg-yellow-100 text-yellow-800',
            [ArticleStatus.DRAFT]: 'bg-gray-100 text-gray-800',
            [ArticleStatus.REJECTED]: 'bg-red-100 text-red-800',
        };
        return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };

    const loadMetaData = async () => {
        try {
            const [userData, categoryData] = await Promise.all([
                fetchUsers(),
                fetchCategories()
            ]);
            setUsers(userData);
            setCategories(categoryData);
        } finally {
            setMetaLoading(false);
        }
    };

    const loadArticles = async (): Promise<Article[]> => {
        setArticlesLoading(true);
        try {
            // Fetch all articles across pages so we can sort globally.
            const { items } = await fetchArticlesWithMeta({
                status: 'ALL',
                fetchAllMax: 5000,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });

            // Ensure final ordering is by newest upload timestamp.
            const orderedItems = [...items].sort((a, b) => getUploadTimestamp(b) - getUploadTimestamp(a));
            setArticles(orderedItems);

            return items;
        } catch (error) {
            console.error('Failed to load articles', error);
            return [];
        } finally {
            setArticlesLoading(false);
        }
    };

    // Keep current page in bounds if the total number of items changes.
    useEffect(() => {
        setCurrentPage(prev => Math.min(prev, totalPages));
    }, [totalPages]);

    const paginatedArticles = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return articles.slice(startIndex, startIndex + pageSize);
    }, [articles, currentPage, pageSize]);

    const handlePageChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
        if (direction === 'next' && currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextSize = Number(event.target.value);
        if (Number.isNaN(nextSize) || nextSize <= 0) return;
        setPageSize(nextSize);
        setCurrentPage(1);
    };

    useEffect(() => {
        loadMetaData();
    }, []);

    useEffect(() => {
        loadArticles();
    }, []);
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">All Articles</h2>
                {/* Add filters here if needed */}
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Title</th>
                            <th className="p-4 font-semibold">Author</th>
                            <th className="p-4 font-semibold">Category</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Published</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                       {isLoading ? (
                           <tr><td colSpan={6} className="p-8"><LoadingSpinner label="Loading articles..." className="py-0" /></td></tr>
                         ) : paginatedArticles.length === 0 ? (
                             <tr><td colSpan={6} className="p-6 text-center text-gray-500">No articles found.</td></tr>
                         ) : paginatedArticles.map(article => {
                              const author = users.find(u => u.id === article.authorId);
                              const category = categories.find(c => c.id === article.categoryId);
                              const publishedLabel = formatArticleDate(article, {
                                 year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                              });
                              return (
                                  <tr key={article.id} className="border-b hover:bg-gray-50">
                                      <td className="p-4 font-medium text-gray-800">{article.title}</td>
                                      <td className="p-4 text-gray-600">{author?.name || 'N/A'}</td>
                                      <td className="p-4 text-gray-600">{category?.name || 'N/A'}</td>
                                      <td className="p-4">{getStatusChip(article.status)}</td>
                                      <td className="p-4 text-gray-600">{publishedLabel || 'N/A'}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Link to={`/article/${article.slug}`} target="_blank" rel="noopener noreferrer">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 w-9 rounded-full text-gray-700 border border-gray-200 hover:bg-gray-100"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link to={`/dashboard/admin/articles/edit/${article.id}`}>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 w-9 rounded-full text-blue-700 border border-blue-100 hover:bg-blue-50"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-9 w-9 rounded-full text-red-700 border border-red-100 hover:bg-red-50"
                                                onClick={() => handleDelete(article.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-lg shadow-sm mt-4 px-4 py-3 border border-gray-100">
                <div className="text-sm text-gray-700 mb-2 sm:mb-0">
                    Page {currentPage} of {totalPages} {isLoading ? '(loading...)' : ''}
                </div>
                <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-700 flex items-center space-x-2">
                        <span>Per page</span>
                        <select
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {[10, 20, 30, 50].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </label>
                    <div className="flex items-center space-x-2">
                        <Button size="sm" variant="secondary" disabled={isLoading || currentPage <= 1} onClick={() => handlePageChange('prev')}>
                            Previous
                        </Button>
                        <Button size="sm" variant="secondary" disabled={isLoading || currentPage >= totalPages} onClick={() => handlePageChange('next')}>
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AllArticles;
