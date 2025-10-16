import React, { useMemo, useState, useEffect } from 'react';
import { fetchArticles, fetchCategories, fetchUsers } from '../../../services/api';
import { Article, Category, User, UserRole } from '../../../types';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Download } from 'lucide-react';

interface ChartData {
    label: string;
    value: number;
}

const BarChart: React.FC<{ title: string; data: ChartData[]; loading: boolean }> = ({ title, data, loading }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-bold mb-4">{title}</h3>
            {loading ? (
                <LoadingSpinner label={`Loading ${title.toLowerCase()}...`} className="py-6" />
            ) : (
                <div className="space-y-3">
                    {data.map(item => (
                        <div key={item.label} className="flex items-center">
                            <span className="w-1/3 text-sm text-gray-600 truncate" title={item.label}>{item.label}</span>
                            <div className="w-2/3 bg-gray-200 rounded-full h-5">
                                <div
                                    className="bg-blue-500 h-5 rounded-full flex items-center justify-end pr-2"
                                    style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                                >
                                    <span className="text-xs font-bold text-white">{item.value.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const ReportsAnalytics: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchArticles({ status: 'ALL' }),
            fetchCategories(),
            fetchUsers()
        ]).then(([articleData, categoryData, userData]) => {
            setArticles(articleData);
            setCategories(categoryData);
            setUsers(userData);
        }).finally(() => setLoading(false));
    }, []);

    const topArticlesByViews = useMemo(() =>
        [...articles].sort((a, b) => b.views - a.views).slice(0, 5).map(a => ({ label: a.title, value: a.views }))
    , [articles]);

    const viewsPerCategory = useMemo(() => {
        const categoryViews = new Map<string, number>();
        articles.forEach(article => {
            const catName = categories.find(c => c.id === article.categoryId)?.name || 'Uncategorized';
            categoryViews.set(catName, (categoryViews.get(catName) || 0) + article.views);
        });
        return Array.from(categoryViews.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    }, [articles, categories]);
    
    const articlesPerAuthor = useMemo(() => {
        const authorArticles = new Map<string, number>();
        const authors = users.filter(u => u.role === UserRole.AUTHOR);
        authors.forEach(author => authorArticles.set(author.name, 0));
        articles.forEach(article => {
            const authorName = users.find(u => u.id === article.authorId)?.name;
            if (authorName) {
                authorArticles.set(authorName, (authorArticles.get(authorName) || 0) + 1);
            }
        });
        return Array.from(authorArticles.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    }, [articles, users]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Reports & Analytics</h2>
                <Button variant="secondary" className="flex items-center" onClick={() => alert('Generating CSV report... (mock)')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export to CSV
                </Button>
            </div>
            <div className="space-y-8">
                <BarChart title="Top 5 Articles by Views" data={topArticlesByViews} loading={loading} />
                <BarChart title="Total Views per Category" data={viewsPerCategory} loading={loading} />
                <BarChart title="Articles per Author" data={articlesPerAuthor} loading={loading} />
            </div>
        </div>
    );
};

export default ReportsAnalytics;
