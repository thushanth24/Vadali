import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { fetchCategories, fetchArticleById, uploadFileToS3, updateArticle } from '../../../services/api';
import { Article, ArticleStatus, Category } from '../../../types';
import RichTextEditor from '../../../components/ui/RichTextEditor';

const EditArticle: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [article, setArticle] = useState<Article | null | undefined>(undefined);
    const [categories, setCategories] = useState<Category[]>([]);
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tags, setTags] = useState('');
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        };
        
        const loadData = async () => {
            try {
                const [foundArticle, categoriesData] = await Promise.all([
                    fetchArticleById(id),
                    fetchCategories()
                ]);
                
                setCategories(categoriesData);
                setArticle(foundArticle);

                if (foundArticle) {
                    if (foundArticle.status !== ArticleStatus.DRAFT && foundArticle.status !== ArticleStatus.REJECTED) {
                        alert("This article cannot be edited as it's already published or pending review.");
                        navigate('/dashboard/author');
                        return;
                    }
                    setTitle(foundArticle.title);
                    setSummary(foundArticle.summary);
                    setContent(foundArticle.content);
                    setCategoryId(foundArticle.categoryId);
                    setTags(foundArticle.tags.join(', '));
                }
            } catch (error) {
                console.error("Failed to load article data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setIsSubmitting(true);

        try {
            let newCoverImageUrl = article?.coverImageUrl;
            if (coverImageFile) {
                newCoverImageUrl = await uploadFileToS3(coverImageFile);
            }
            
            const updatedArticleData = {
                title,
                summary,
                content,
                categoryId,
                tags: tags.split(',').map(t => t.trim()),
                coverImageUrl: newCoverImageUrl,
                status: ArticleStatus.PENDING_REVIEW, // Re-submit for review
            };
            
            await updateArticle(id, updatedArticleData);
            
            alert('Article updated and re-submitted for review!');
            navigate('/dashboard/author');
        } catch (error) {
            alert('Failed to update article.');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!article) {
        return <Navigate to="/dashboard/author" replace />;
    }
    
    return (
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Article</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Article Title</label>
                    <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Summary</label>
                    <textarea id="summary" value={summary} onChange={e => setSummary(e.target.value)} required rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Main Content</label>
                    <div className="mt-1">
                      <RichTextEditor value={content} onChange={setContent} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                        <input type="text" id="tags" value={tags} onChange={e => setTags(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div>
                    <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">Cover Image</label>
                    {article.coverImageUrl && !coverImageFile && <img src={article.coverImageUrl} alt="Current cover" className="mt-2 h-32 w-auto object-cover rounded-md" />}
                    <input type="file" id="coverImage" name="coverImage" onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <div className="flex justify-end space-x-4">
                    <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/author')} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : 'Update & Re-submit'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EditArticle;
