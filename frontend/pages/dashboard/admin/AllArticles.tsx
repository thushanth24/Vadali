import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticles, fetchUsers, fetchCategories, deleteArticle } from '../../../services/api';
import { Article, ArticleStatus, User, Category } from '../../../types';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Edit, Trash2, Eye } from 'lucide-react';

const AllArticles: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            fetchArticles({ status: 'ALL' }),
            fetchUsers(),
            fetchCategories()
        ]).then(([articleData, userData, categoryData]) => {
            setArticles(articleData);
            setUsers(userData);
            setCategories(categoryData);
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (articleId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this article?')) {
            try {
                await deleteArticle(articleId);
                setArticles(prev => prev.filter(a => a.id !== articleId));
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
                       {loading ? (
                           <tr><td colSpan={6} className="p-8"><LoadingSpinner label="Loading articles..." className="py-0" /></td></tr>
                       ) : articles.map(article => {
                            const author = users.find(u => u.id === article.authorId);
                            const category = categories.find(c => c.id === article.categoryId);
                            return (
                                <tr key={article.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{article.title}</td>
                                    <td className="p-4 text-gray-600">{author?.name || 'N/A'}</td>
                                    <td className="p-4 text-gray-600">{category?.name || 'N/A'}</td>
                                    <td className="p-4">{getStatusChip(article.status)}</td>
                                    <td className="p-4 text-gray-600">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'N/A'}</td>
                                    <td className="p-4 space-x-2">
                                        <Link to={`/article/${article.slug}`} target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" variant="ghost" className="text-gray-600 hover:bg-gray-100">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Link to={`/dashboard/admin/articles/edit/${article.id}`}>
                                            <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(article.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AllArticles;
