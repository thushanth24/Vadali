import React, { useState, useEffect } from 'react';
import { fetchArticles, updateFeaturedStatus } from '../../../services/api';
import { Article, ArticleStatus } from '../../../types';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const HomepageConfiguration: React.FC = () => {
    const [allArticles, setAllArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [featured, setFeatured] = useState<Article[]>([]);
    const [available, setAvailable] = useState<Article[]>([]);
    const [tickerText, setTickerText] = useState('');
    const [initialFeaturedIds, setInitialFeaturedIds] = useState(new Set<string>());

    useEffect(() => {
        fetchArticles({ status: ArticleStatus.PUBLISHED })
            .then(articles => {
                setAllArticles(articles);
                setFeatured(articles.filter(a => a.isFeatured));
                setAvailable(articles.filter(a => !a.isFeatured));
                setTickerText(articles.slice(0, 5).map(a => a.title).join('  ***  '));
                setInitialFeaturedIds(new Set(articles.filter(a => a.isFeatured).map(a => a.id)));
            })
            .finally(() => setLoading(false));
    }, []);


    const addToFeatured = (article: Article) => {
        setAvailable(available.filter(a => a.id !== article.id));
        setFeatured([...featured, article]);
    };

    const removeFromFeatured = (article: Article) => {
        setFeatured(featured.filter(a => a.id !== article.id));
        setAvailable([...available, article]);
    };
    
    const handleSaveChanges = async () => {
        alert('Ticker text saved! (mock)');

        const currentFeaturedIds = new Set(featured.map(a => a.id));
        const updates: { articleId: string; isFeatured: boolean }[] = [];

        allArticles.forEach(article => {
            const isCurrentlyFeatured = currentFeaturedIds.has(article.id);
            const wasInitiallyFeatured = initialFeaturedIds.has(article.id);
            if (isCurrentlyFeatured !== wasInitiallyFeatured) {
                updates.push({ articleId: article.id, isFeatured: isCurrentlyFeatured });
            }
        });

        if (updates.length === 0) {
            alert("No changes to featured articles were made.");
            return;
        }

        try {
            await updateFeaturedStatus(updates);
            alert('Changes to featured articles have been saved!');
            setInitialFeaturedIds(new Set(featured.map(a => a.id)));
        } catch (error) {
            alert('Failed to save changes to featured articles.');
        }
    };

    const ArticleListItem: React.FC<{ article: Article, action: 'add' | 'remove', onClick: (article: Article) => void }> = ({ article, action, onClick }) => (
        <li className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100">
            <div className="flex items-center gap-3">
                <img src={article.coverImageUrl} alt={article.title} className="w-16 h-10 object-cover rounded" />
                <span className="font-medium text-sm text-gray-800">{article.title}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onClick(article)}>
                {action === 'add' ? <ArrowRight className="h-4 w-4 text-green-600" /> : <ArrowLeft className="h-4 w-4 text-red-600" />}
            </Button>
        </li>
    );

    if (loading) return <LoadingSpinner label="Loading configuration..." className="py-16" />;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Homepage Configuration</h2>
                <Button onClick={handleSaveChanges}>Save All Changes</Button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">Breaking News Ticker</h3>
                <textarea 
                    value={tickerText}
                    onChange={(e) => setTickerText(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter ticker text, separated by ***"
                />
            </div>

            <div>
                <h3 className="text-xl font-bold mb-4">Featured Articles Manager</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h4 className="text-lg font-bold mb-4">Available Articles ({available.length})</h4>
                        <ul className="space-y-3 h-96 overflow-y-auto pr-2">
                            {available.map(article => (
                                <ArticleListItem key={article.id} article={article} action="add" onClick={addToFeatured} />
                            ))}
                        </ul>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h4 className="text-lg font-bold mb-4">Featured Articles ({featured.length})</h4>
                        <ul className="space-y-3 h-96 overflow-y-auto pr-2">
                            {featured.map(article => (
                                <ArticleListItem key={article.id} article={article} action="remove" onClick={removeFromFeatured} />
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomepageConfiguration;
