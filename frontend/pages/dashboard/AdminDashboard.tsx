import React, { useState, useEffect } from 'react';
import { Article, User, Category, ArticleStatus, UserRole } from '../../types';
import { fetchArticles, fetchUsers, fetchCategories } from '../../services/api';
import { Users, Newspaper, Tag, BarChart2 } from 'lucide-react';

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: number | string, color: string }> = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);


const AdminDashboard: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            // Fetch all articles by not passing a status filter
            fetchArticles({}),
            fetchUsers(),
            fetchCategories()
        ]).then(([articleData, userData, categoryData]) => {
            setArticles(articleData);
            setUsers(userData);
            setCategories(categoryData);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div>Loading dashboard...</div>;
    }
    
    const totalViews = articles.reduce((sum, a) => sum + a.views, 0).toLocaleString();

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Admin Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={Newspaper} title="Total Articles" value={articles.length} color="bg-blue-500" />
                <StatCard icon={Users} title="Total Users" value={users.length} color="bg-green-500" />
                <StatCard icon={Tag} title="Categories" value={categories.length} color="bg-yellow-500" />
                <StatCard icon={BarChart2} title="Total Views" value={totalViews} color="bg-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-bold text-base mb-4">Recent Articles</h3>
                    <ul className="space-y-3">
                        {articles.slice(0, 5).map(article => (
                            <li key={article.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 truncate pr-4" title={article.title}>{article.title}</span>
                                <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${
                                    article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-800' :
                                    article.status === ArticleStatus.PENDING_REVIEW ? 'bg-yellow-100 text-yellow-800' :
                                     article.status === ArticleStatus.DRAFT ? 'bg-gray-100 text-gray-800' :
                                    'bg-red-100 text-red-800'
                                }`}>{article.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-bold text-base mb-4">User Roles</h3>
                    <ul className="space-y-3">
                        <li className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">Admins</span>
                            <span className="font-bold">{users.filter(u => u.role === UserRole.ADMIN).length}</span>
                        </li>
                         <li className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">Editors</span>
                            <span className="font-bold">{users.filter(u => u.role === UserRole.EDITOR).length}</span>
                        </li>
                         <li className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">Authors</span>
                            <span className="font-bold">{users.filter(u => u.role === UserRole.AUTHOR).length}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;