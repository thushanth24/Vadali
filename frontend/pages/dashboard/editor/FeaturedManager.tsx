import React, { useState, useMemo, useEffect } from 'react';
import { fetchArticlesWithMeta, updateFeaturedStatus } from '../../../services/api';
import { Article, ArticleStatus } from '../../../types';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const FeaturedManager: React.FC = () => {
    const [allArticles, setAllArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    const initialFeaturedIds = useMemo(() => 
        new Set(allArticles.filter(a => a.isFeatured).map(a => a.id)), 
    [allArticles]);
    
    const [featured, setFeatured] = useState<Article[]>([]);
    const [available, setAvailable] = useState<Article[]>([]);
    
    useEffect(() => {
        const loadAllArticles = async () => {
            try {
                const { items } = await fetchArticlesWithMeta({
                    status: ArticleStatus.PUBLISHED,
                    sortBy: 'publishedAt',
                    sortOrder: 'desc',
                    limit: 20,
                    pageSize: 20,
                });
                setAllArticles(items);
                setFeatured(items.filter(a => a.isFeatured));
                setAvailable(items.filter(a => !a.isFeatured));
            } catch (error) {
                console.error('Failed to load articles for Featured Manager', error);
            } finally {
                setLoading(false);
            }
        };

        loadAllArticles();
    }, []);

    const addToFeatured = (article: Article) => {
        setAvailable(available.filter(a => a.id !== article.id));
        setFeatured([...featured, article].sort((a,b) => a.title.localeCompare(b.title)));
    };

    const removeFromFeatured = (article: Article) => {
        setFeatured(featured.filter(a => a.id !== article.id));
        setAvailable([...available, article].sort((a,b) => a.title.localeCompare(b.title)));
    };
    
    const handleSaveChanges = async () => {
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
            alert("No changes to save.");
            return;
        }

        try {
            await updateFeaturedStatus(updates);
            alert('Changes to featured articles have been saved!');
            // Refresh component state to reflect saved status
            const updatedArticles = allArticles.map(a => {
                if (currentFeaturedIds.has(a.id)) return { ...a, isFeatured: true };
                return { ...a, isFeatured: false };
            });
            setAllArticles(updatedArticles);

        } catch (error) {
            alert('Failed to save changes.');
        }
    };

    const ArticleListItem: React.FC<{ article: Article, action: 'add' | 'remove', onClick: (article: Article) => void }> = ({ article, action, onClick }) => (
        <li className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100">
            <div className="flex items-center gap-3">
                <img src={article.coverImageUrl} alt={article.title} className="w-16 h-10 object-cover rounded" />
                <span className="font-medium text-sm text-gray-800 truncate" title={article.title}>{article.title}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onClick(article)}>
                {action === 'add' ? <ArrowRight className="h-4 w-4 text-green-600" /> : <ArrowLeft className="h-4 w-4 text-red-600" />}
            </Button>
        </li>
    );

    if (loading) return <LoadingSpinner label="Loading articles..." className="py-16" />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Featured Articles Manager</h2>
                <Button onClick={handleSaveChanges}>Save Changes</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">Available Articles ({available.length})</h3>
                    <ul className="space-y-3 h-96 overflow-y-auto pr-2">
                        {available.map(article => (
                            <ArticleListItem key={article.id} article={article} action="add" onClick={addToFeatured} />
                        ))}
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">Featured Articles ({featured.length})</h3>
                    <ul className="space-y-3 h-96 overflow-y-auto pr-2">
                        {featured.map(article => (
                            <ArticleListItem key={article.id} article={article} action="remove" onClick={removeFromFeatured} />
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default FeaturedManager;
