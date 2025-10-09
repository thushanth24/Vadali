import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { fetchArticleById, fetchUser, fetchCategories, updateArticleStatus } from '../../../services/api';
import { Article, ArticleStatus, User, Category } from '../../../types';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

const ReviewArticle: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [article, setArticle] = useState<Article | null | undefined>(undefined);
    const [author, setAuthor] = useState<User | null>(null);
    const [category, setCategory] = useState<Category | null>(null);
    const [content, setContent] = useState('');
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }
        const loadData = async () => {
            try {
                const foundArticle = await fetchArticleById(id);
                setArticle(foundArticle);
                if (foundArticle) {
                    setContent(foundArticle.content);
                    const [authorData, categoriesData] = await Promise.all([
                        fetchUser(foundArticle.authorId),
                        fetchCategories()
                    ]);
                    setAuthor(authorData || null);
                    setCategory(categoriesData.find(c => c.id === foundArticle.categoryId) || null);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleApprove = () => {
        // This just moves to the next step in the UI flow.
        // The status update will happen on the scheduling page.
        navigate(`/dashboard/editor/schedule/${id}`);
    };

    const handleReject = async () => {
        if (!rejectionReason.trim() || !id) {
            alert('Please provide a reason for rejection.');
            return;
        }
        try {
            await updateArticleStatus(id, ArticleStatus.REJECTED, rejectionReason);
            alert('Article rejected and feedback sent to author.');
            setIsRejectModalOpen(false);
            navigate('/dashboard/editor');
        } catch (error) {
            alert('Failed to reject article.');
            console.error(error);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!article) return <Navigate to="/dashboard/editor" replace />;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{article.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
                    <span>By {author?.name || 'Unknown'}</span>
                    <span>In <Link to={`/category/${category?.slug}`} className="text-blue-600 hover:underline">{category?.name || 'N/A'}</Link></span>
                </div>
                
                <div className="mb-6">
                    <img src={article.coverImageUrl} alt={article.title} className="w-full rounded-md" />
                </div>
                
                <div>
                    <label htmlFor="content" className="block text-lg font-semibold text-gray-700 mb-2">Article Content</label>
                    <div 
                        id="content" 
                        className="w-full border border-gray-300 rounded-md p-3 prose"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-md sticky top-6">
                    <h3 className="text-xl font-bold mb-4 border-b pb-2">Review Actions</h3>
                    <div className="space-y-4">
                        <Button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-700">
                            Approve & Schedule
                        </Button>
                        <Button onClick={() => setIsRejectModalOpen(true)} variant="danger" className="w-full">
                            Reject
                        </Button>
                        <Button onClick={() => navigate('/dashboard/editor')} variant="secondary" className="w-full">
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Article">
                <div className="space-y-4">
                    <p>Please provide feedback for the author on why this article is being rejected.</p>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={5}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="e.g., Needs more sources, grammatical errors, etc."
                    />
                    <div className="flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
                        <Button type="button" variant="danger" onClick={handleReject}>Confirm Rejection</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ReviewArticle;