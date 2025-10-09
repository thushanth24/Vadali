import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { fetchArticleById, updateArticle } from '../../../services/api';
import Button from '../../../components/ui/Button';
import { Article, ArticleStatus } from '../../../types';

const ScheduleArticle: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [article, setArticle] = useState<Article | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultDateTime = now.toISOString().slice(0, 16);

    const [publishDateTime, setPublishDateTime] = useState(defaultDateTime);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }
        fetchArticleById(id).then(setArticle).finally(() => setLoading(false));
    }, [id]);

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        try {
            await updateArticle(id, {
                publishedAt: new Date(publishDateTime).toISOString(),
                status: ArticleStatus.PUBLISHED
            });
            alert(`Article "${article?.title}" scheduled for ${new Date(publishDateTime).toLocaleString()}!`);
            navigate('/dashboard/editor');
        } catch (error) {
            alert('Failed to schedule article.');
        }
    };
    
    const handlePublishNow = async () => {
        if (!id) return;

        try {
            await updateArticle(id, {
                publishedAt: new Date().toISOString(),
                status: ArticleStatus.PUBLISHED
            });
            alert(`Article "${article?.title}" published immediately!`);
            navigate('/dashboard/editor');
        } catch (error) {
            alert('Failed to publish article.');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!article) return <Navigate to="/dashboard/editor" replace />;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Schedule Publication</h2>
                <p className="text-gray-600 mb-6">Set the date and time for the article <span className="font-semibold">"{article.title}"</span> to go live.</p>
                
                <form onSubmit={handleSchedule} className="space-y-6">
                    <div>
                        <label htmlFor="publish-date" className="block text-sm font-medium text-gray-700">Publication Date and Time</label>
                        <input
                            type="datetime-local"
                            id="publish-date"
                            value={publishDateTime}
                            onChange={(e) => setPublishDateTime(e.target.value)}
                            min={defaultDateTime}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={() => navigate(`/dashboard/editor/review/${id}`)}>
                            Back to Review
                        </Button>
                        <div className="flex items-center space-x-4">
                            <Button type="button" variant="ghost" onClick={handlePublishNow}>
                                Publish Now
                            </Button>
                            <Button type="submit">
                                Schedule
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleArticle;