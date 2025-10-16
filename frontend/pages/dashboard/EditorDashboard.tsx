import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchArticles, fetchUsers, fetchCategories } from '../../services/api';
import { Article, ArticleStatus, User, Category } from '../../types';
import Button from '../../components/ui/Button';
import { FileCheck, Clock, CheckSquare, Star, FileText, ArrowRight } from 'lucide-react';

const StatCard: React.FC<{ 
    icon: React.ElementType, 
    title: string, 
    value: number | string, 
    color: string,
    onClick?: () => void,
    clickable?: boolean
}> = ({ icon: Icon, title, value, color, onClick, clickable = false }) => {
    const content = (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center w-full">
            <div className={`p-3 rounded-full mr-4 ${color}`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );

    if (clickable && onClick) {
        return (
            <button 
                onClick={onClick}
                className="w-full text-left transition-transform hover:scale-105 focus:outline-none"
                aria-label={`View ${title}`}
            >
                {content}
            </button>
        );
    }

    return content;
};

const EditorDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState<Article[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchArticles({}), // Fetch all articles without status filter
            fetchUsers(),
            fetchCategories()
        ]).then(([articleData, userData, categoryData]) => {
            setArticles(articleData);
            setUsers(userData);
            setCategories(categoryData);
        }).finally(() => setLoading(false));
    }, []);
    
    if (loading) return <div>Loading dashboard...</div>;

    const pendingArticles = articles.filter(a => a.status === ArticleStatus.PENDING_REVIEW);
    const publishedArticles = articles.filter(a => a.status === ArticleStatus.PUBLISHED).length;
    const featuredArticles = articles.filter(a => a.isFeatured).length;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Editor Overview</h2>
                <Button 
                    onClick={() => navigate('/dashboard/editor/articles')}
                    className="flex items-center gap-2"
                >
                    <FileText className="h-4 w-4" />
                    Manage Articles
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    icon={Clock} 
                    title="Pending Review" 
                    value={pendingArticles.length} 
                    color="bg-yellow-500" 
                    onClick={() => navigate('/dashboard/editor/articles?status=SUBMITTED')}
                    clickable
                />
                <StatCard 
                    icon={CheckSquare} 
                    title="Total Published" 
                    value={publishedArticles} 
                    color="bg-green-500"
                    onClick={() => navigate('/dashboard/editor/articles?status=PUBLISHED')}
                    clickable
                />
                <StatCard icon={Star} title="Featured Articles" value={featuredArticles} color="bg-blue-500" />
            </div>

            <h3 className="text-2xl font-bold text-gray-800 mb-4">Review Queue</h3>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Title</th>
                            <th className="p-4 font-semibold">Author</th>
                            <th className="p-4 font-semibold">Category</th>
                            <th className="p-4 font-semibold">Submitted</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingArticles.length > 0 ? pendingArticles.map(article => {
                            const author = users.find(u => u.id === article.authorId);
                            const category = categories.find(c => c.id === article.categoryId);
                            return (
                                <tr key={article.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-800">{article.title}</td>
                                    <td className="p-4">{author?.name || 'Unknown'}</td>
                                    <td className="p-4">{category?.name || 'N/A'}</td>
                                    <td className="p-4">{new Date().toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <Link to={`/dashboard/editor/review/${article.id}`}>
                                            <Button size="sm">
                                                Review
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    <FileCheck className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                    The review queue is empty. Great job!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EditorDashboard;