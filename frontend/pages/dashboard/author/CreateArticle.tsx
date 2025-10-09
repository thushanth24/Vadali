import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { fetchCategories, createArticle, uploadFileToS3 } from '../../../services/api';
import { Category, ArticleStatus } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import RichTextEditor from '../../../components/ui/RichTextEditor';

const CreateArticle: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

    useEffect(() => {
        fetchCategories().then(setCategories);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const formData = new FormData(e.currentTarget);
            let coverImageUrl = '';

            if (coverImageFile) {
                // In a real app, you'd show upload progress.
                alert('Uploading image to S3... (mock)');
                coverImageUrl = await uploadFileToS3(coverImageFile);
            }

            const articleData = {
                title: formData.get('title') as string,
                summary: formData.get('summary') as string,
                content: content,
                categoryId: formData.get('category') as string,
                tags: (formData.get('tags') as string).split(',').map(tag => tag.trim()),
                authorId: user?.id || '',
                status: ArticleStatus.PENDING_REVIEW,
                coverImageUrl: coverImageUrl,
            };
            
            if (!articleData.title || !articleData.summary || !content) {
                alert('Title, Summary, and Content are required.');
                setIsSubmitting(false);
                return;
            }

            await createArticle(articleData);

            alert('Article submitted for review!');
            navigate('/dashboard/author');
        } catch (error) {
            console.error('Failed to create article:', error);
            alert('An error occurred while submitting the article.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Article</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Article Title</label>
                    <input type="text" id="title" name="title" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Summary</label>
                    <textarea id="summary" name="summary" required rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
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
                        <select id="category" name="category" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                        <input type="text" id="tags" name="tags" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div>
                    <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">Cover Image</label>
                    <input type="file" id="coverImage" name="coverImage" onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <div className="flex justify-end space-x-4">
                    <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/author')} disabled={isSubmitting}>Cancel</Button>
                    <Button type="button" variant="ghost" disabled={isSubmitting}>Save as Draft</Button>
                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CreateArticle;