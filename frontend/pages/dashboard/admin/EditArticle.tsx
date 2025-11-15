import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { fetchArticleById, fetchCategories, updateArticle, uploadFileToS3 } from '../../../services/api';
import { Article, Category } from '../../../types';
import RichTextEditor from '../../../components/ui/RichTextEditor';

const extractGalleryFromContent = (html: string): { sanitizedHtml: string; urls: string[] } => {
    if (!html) {
        return { sanitizedHtml: '', urls: [] };
    }

    if (typeof DOMParser === 'undefined') {
        return { sanitizedHtml: html, urls: [] };
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const inlineGalleries = Array.from(doc.querySelectorAll('[data-inline-gallery]'));
        const urls: string[] = [];

        inlineGalleries.forEach((node) => {
            const urlNodes = Array.from(node.querySelectorAll('[data-gallery-url]'));
            urlNodes.forEach((urlNode) => {
                const url = urlNode.getAttribute('data-gallery-url')?.trim();
                if (url) {
                    urls.push(url);
                }
            });
            node.remove();
        });

        return { sanitizedHtml: doc.body.innerHTML, urls };
    } catch (error) {
        console.error('Failed to parse inline gallery metadata', error);
        return { sanitizedHtml: html, urls: [] };
    }
};

const buildContentWithGalleryMetadata = (html: string, galleryUrls: string[]): string => {
    const safeHtml = html || '';
    if (!galleryUrls.length) {
        return safeHtml;
    }

    try {
        if (typeof DOMParser !== 'undefined') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(safeHtml, 'text/html');
            doc.querySelectorAll('[data-inline-gallery]').forEach((node) => node.remove());

            const container = doc.createElement('div');
            container.setAttribute('data-inline-gallery', 'true');
            container.setAttribute('style', 'display:none;');

            galleryUrls.forEach((url) => {
                const span = doc.createElement('span');
                span.setAttribute('data-gallery-url', url);
                container.appendChild(span);
            });

            doc.body.appendChild(container);
            return doc.body.innerHTML;
        }
    } catch (error) {
        console.warn('Failed to embed gallery metadata into article content', error);
    }

    const fallbackMetadata = `<div data-inline-gallery style="display:none;">${galleryUrls
        .map((url) => `<span data-gallery-url="${url}"></span>`)
        .join('')}</div>`;
    return `${safeHtml}${fallbackMetadata}`;
};

const AdminEditArticle: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [article, setArticle] = useState<Article | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [tags, setTags] = useState('');
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
    const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError('Missing article identifier.');
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                const [foundArticle, categoriesData] = await Promise.all([
                    fetchArticleById(id),
                    fetchCategories(),
                ]);

                if (!foundArticle) {
                    setError('Article not found.');
                    return;
                }

                setArticle(foundArticle);
                setCategories(categoriesData);
                setTitle(foundArticle.title);
                setSummary(foundArticle.summary);
                const inlineGallery = extractGalleryFromContent(foundArticle.content);
                setContent(inlineGallery.sanitizedHtml || foundArticle.content);
                setCategoryId(foundArticle.categoryId);
                setTags(foundArticle.tags.join(', '));
                const apiGallery = Array.isArray(foundArticle.imageUrls) ? foundArticle.imageUrls : [];
                const combinedGallery = Array.from(new Set([...apiGallery, ...inlineGallery.urls]));
                setExistingGalleryImages(combinedGallery);
            } catch (err) {
                console.error('Failed to load article data:', err);
                setError('Failed to load article data.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    const handleRemoveExistingGalleryImage = (index: number) => {
        setExistingGalleryImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!id) {
            return;
        }

        setIsSubmitting(true);

        try {
            let updatedCoverImageUrl = article?.coverImageUrl;

            if (coverImageFile) {
                updatedCoverImageUrl = await uploadFileToS3(coverImageFile);
            }

            const normalizedTags = tags
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);

            let updatedGalleryImages = [...existingGalleryImages];

            if (galleryImageFiles.length > 0) {
                const uploadedGalleryImages = await Promise.all(
                    galleryImageFiles.map(async (file) => {
                        return uploadFileToS3(file);
                    })
                );
                updatedGalleryImages = [...updatedGalleryImages, ...uploadedGalleryImages];
            }

            const galleryUrlsUnique = Array.from(
                new Set(updatedGalleryImages.map((url) => url.trim()).filter((url) => url.length > 0))
            );

            await updateArticle(id, {
                title,
                summary,
                content: buildContentWithGalleryMetadata(content, galleryUrlsUnique),
                categoryId,
                tags: normalizedTags,
                coverImageUrl: updatedCoverImageUrl,
                imageUrls: galleryUrlsUnique,
            });

            alert('Article updated successfully.');
            navigate('/dashboard/admin/articles');
        } catch (err) {
            console.error('Failed to update article:', err);
            alert('Failed to update article.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <LoadingSpinner label="Loading article..." className="py-16" />;
    }

    if (error) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => navigate('/dashboard/admin/articles')} variant="secondary">
                    Back to articles
                </Button>
            </div>
        );
    }

    if (!article) {
        return null;
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Article</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Article Title
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                        Summary
                    </label>
                    <textarea
                        id="summary"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        required
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Main Content</label>
                    <div className="mt-1">
                        <RichTextEditor value={content} onChange={setContent} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Category
                        </label>
                        <select
                            id="category"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="" disabled>
                                Select category
                            </option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                            Tags (comma-separated)
                        </label>
                        <input
                            type="text"
                            id="tags"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">
                        Cover Image
                    </label>
                    {article.coverImageUrl && !coverImageFile && (
                        <img
                            src={article.coverImageUrl}
                            alt="Current cover"
                            className="mt-2 h-32 w-auto object-cover rounded-md"
                        />
                    )}
                    <input
                        type="file"
                        id="coverImage"
                        name="coverImage"
                        onChange={(e) => setCoverImageFile(e.target.files ? e.target.files[0] : null)}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>
                <div>
                    <label htmlFor="galleryImages" className="block text-sm font-medium text-gray-700">
                        Additional Images
                    </label>
                    {existingGalleryImages.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {existingGalleryImages.map((url, index) => (
                                <div key={`${url}-${index}`} className="relative group">
                                    <img src={url} alt={`Gallery ${index + 1}`} className="h-32 w-full object-cover rounded-md" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExistingGalleryImage(index)}
                                        className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <input
                        type="file"
                        id="galleryImages"
                        name="galleryImages"
                        multiple
                        onChange={(e) => setGalleryImageFiles(e.target.files ? Array.from(e.target.files) : [])}
                        className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {galleryImageFiles.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                            Selected {galleryImageFiles.length} file{galleryImageFiles.length > 1 ? 's' : ''}:{' '}
                            {galleryImageFiles.map((file) => file.name).join(', ')}
                        </p>
                    )}
                </div>
                <div className="flex justify-end space-x-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate('/dashboard/admin/articles')}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : 'Update Article'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AdminEditArticle;
