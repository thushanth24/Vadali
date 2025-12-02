import React, { useState, useEffect, useMemo } from 'react';
import { fetchArticles, createArticle, updateArticle, deleteArticle, fetchCategories, uploadFileToS3 } from '../../../services/api';
import { Article, ArticleStatus, Category } from '../../../types';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Edit, Trash2, PlusCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

const findDefaultCategoryId = (categories: Category[]): string => {
    const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';
    const preferred = categories.find(cat => {
        const slug = normalize(cat.slug);
        const name = normalize(cat.name);
        return slug.includes('advert') || slug.includes('sponsor') || name.includes('advert') || name.includes('sponsor');
    });
    return preferred?.id ?? categories[0]?.id ?? '';
};

const AdManagement: React.FC = () => {
    const [ads, setAds] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Article | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const { user } = useAuth();

    const defaultCategoryId = useMemo(
        () => findDefaultCategoryId(categories),
        [categories]
    );

    useEffect(() => {
        if (!selectedCategoryId && defaultCategoryId) {
            setSelectedCategoryId(defaultCategoryId);
        }
    }, [defaultCategoryId, selectedCategoryId]);

    const loadAds = async () => {
        setLoading(true);
        try {
            const fetched = await fetchArticles({ isAdvertisement: true, status: 'ALL', limit: 80 });
            setAds(fetched.filter(article => article.isAdvertisement));
        } catch (error) {
            console.error('Failed to load advertisements:', error);
            alert('Failed to load advertisements.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAds();
        let isMounted = true;

        fetchCategories()
            .then(fetchedCategories => {
                if (isMounted) {
                    setCategories(fetchedCategories);
                }
            })
            .catch(error => {
                console.error('Failed to load categories:', error);
                alert('Failed to load categories. Please refresh the page.');
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleOpenModal = (ad: Article | null = null) => {
        setEditingAd(ad);
        if (ad) {
            setTitle(ad.title);
            setSummary(ad.summary);
            setSelectedCategoryId(ad.categoryId);
            setCoverImageUrl(ad.coverImageUrl ?? '');
        } else {
            setTitle('');
            setSummary('');
            setSelectedCategoryId(defaultCategoryId);
            setCoverImageUrl('');
        }
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAd(null);
        setTitle('');
        setSummary('');
        setSelectedCategoryId(defaultCategoryId);
        setCoverImageFile(null);
        setCoverImageUrl('');
    };

    const handleSubmitAd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) {
            alert('You must be signed in to manage advertisements.');
            return;
        }

        if (!selectedCategoryId) {
            alert('Please choose a category for the advertisement.');
            return;
        }

        try {
            setIsSaving(true);
            let currentCoverImageUrl = coverImageUrl;

            if (coverImageFile) {
                try {
                    currentCoverImageUrl = await uploadFileToS3(coverImageFile);
                    setCoverImageUrl(currentCoverImageUrl);
                } catch (error) {
                    console.error('Failed to upload advertisement image:', error);
                    alert('Failed to upload image. Please try again.');
                    setLoading(false);
                    return;
                }
            }

            const adData = {
                title,
                summary,
                content: `<p>${summary}</p>`,
                isAdvertisement: true,
                status: ArticleStatus.PUBLISHED,
                categoryId: selectedCategoryId,
                authorId: editingAd?.authorId ?? user.id,
                tags: editingAd?.tags ?? [],
                coverImageUrl: currentCoverImageUrl,
            };
            if (editingAd) {
                await updateArticle(editingAd.id, adData);
            } else {
                await createArticle(adData);
            }
            handleCloseModal();
            await loadAds();
        } catch (error) {
            console.error('Failed to save advertisement:', error);
            alert(`Failed to ${editingAd ? 'update' : 'create'} advertisement.`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteAd = async (adId: string) => {
        if(window.confirm('Are you sure you want to delete this ad?')) {
            try {
                await deleteArticle(adId);
                setAds(prev => prev.filter(ad => ad.id !== adId));
            } catch {
                alert('Failed to delete ad.');
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Advertisement Management</h2>
                <Button variant="primary" className="flex items-center" onClick={() => handleOpenModal()}>
                    <PlusCircle className="h-5 w-5 mr-2" /> New Advertisement
                </Button>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Title</th>
                            <th className="p-4 font-semibold">Summary</th>
                            <th className="p-4 font-semibold">Views</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                       {loading ? (
                           <tr><td colSpan={4} className="p-8"><LoadingSpinner label="Loading advertisements..." className="py-0" /></td></tr>
                       ) : ads.map(ad => (
                            <tr key={ad.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-medium">{ad.title}</td>
                                <td className="p-4 text-gray-600">{ad.summary}</td>
                                <td className="p-4 text-gray-600">{ad.views.toLocaleString()}</td>
                                <td className="p-4 space-x-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(ad)}><Edit className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteAd(ad.id)}><Trash2 className="h-4 w-4" /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAd ? "Edit Advertisement" : "Create New Advertisement"}>
                <form onSubmit={handleSubmitAd} className="space-y-4">
                    <div>
                        <label htmlFor="ad-title" className="block text-sm font-medium">Title</label>
                        <input id="ad-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="ad-summary" className="block text-sm font-medium">Summary / Call to Action</label>
                        <textarea id="ad-summary" value={summary} onChange={e => setSummary(e.target.value)} required rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="ad-category" className="block text-sm font-medium">Category</label>
                        <select
                            id="ad-category"
                            value={selectedCategoryId}
                            onChange={e => setSelectedCategoryId(e.target.value)}
                            required
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                            disabled={categories.length === 0}
                        >
                            <option value="" disabled>Select category</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="ad-image" className="block text-sm font-medium">Ad Image/Banner</label>
                        <input
                            id="ad-image"
                            type="file"
                            accept="image/*"
                            onChange={event => {
                                const file = event.target.files?.[0] ?? null;
                                setCoverImageFile(file);
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        if (typeof reader.result === 'string') {
                                            setCoverImageUrl(reader.result);
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                } else if (editingAd?.coverImageUrl) {
                                    setCoverImageUrl(editingAd.coverImageUrl);
                                } else {
                                    setCoverImageUrl('');
                                }
                            }}
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700"
                        />
                        {coverImageUrl && (
                            <img
                                src={coverImageUrl}
                                alt="Advertisement preview"
                                className="mt-3 h-32 w-full object-cover rounded-md border border-gray-200"
                            />
                        )}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? (editingAd ? 'Saving...' : 'Creating...') : (editingAd ? 'Save Changes' : 'Create Ad')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdManagement;
