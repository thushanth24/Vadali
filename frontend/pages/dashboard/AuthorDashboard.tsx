
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticles } from '../../services/api';
import { Article, ArticleStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { PlusCircle, Edit, Eye } from 'lucide-react';

const AuthorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myArticles, setMyArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(true);
            fetchArticles({ authorId: user.id, status: 'ALL' })
                .then(setMyArticles)
                .finally(() => setLoading(false));
        }
    }, [user]);

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
                <h2 className="text-3xl font-bold text-gray-800">My Articles</h2>
                <Link to="/dashboard/author/create">
                    <Button variant="primary" className="flex items-center">
                        <PlusCircle className="h-5 w-5 mr-2" /> New Article
                    </Button>
                </Link>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Title</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Views</th>
                            <th className="p-4 font-semibold">Published Date</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan={5} className="p-8"><LoadingSpinner label="Loading articles..." className="py-0" /></td></tr>
                        ) : myArticles.length > 0 ? myArticles.map(article => {
                            const isEditable = article.status === ArticleStatus.DRAFT || article.status === ArticleStatus.REJECTED;
                            return (
                                <tr key={article.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{article.title}</td>
                                    <td className="p-4">{getStatusChip(article.status)}</td>
                                    <td className="p-4">{article.views.toLocaleString()}</td>
                                    <td className="p-4">{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'N/A'}</td>
                                    <td className="p-4 flex items-center space-x-2">
                                        <Link to={`/dashboard/author/preview/${article.id}`}>
                                            <Button size="sm" variant="ghost" className="text-gray-600 hover:bg-gray-100">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Link to={`/dashboard/author/edit/${article.id}`} className={!isEditable ? 'pointer-events-none' : ''}>
                                            <Button size="sm" variant="secondary" disabled={!isEditable}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-gray-500">You haven't written any articles yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuthorDashboard;
