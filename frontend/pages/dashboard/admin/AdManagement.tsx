import React, { useState, useEffect } from 'react';
import { fetchArticles, createArticle, updateArticle, deleteArticle } from '../../../services/api';
import { Article, ArticleStatus, Category } from '../../../types';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Edit, Trash2, PlusCircle } from 'lucide-react';

const AdManagement: React.FC = () => {
    const [ads, setAds] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Article | null>(null);
    
    // Form state
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');

    const loadAds = () => {
        setLoading(true);
        fetchArticles({ isAdvertisement: true, status: 'ALL' }).then(setAds).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadAds();
    }, []);

    const handleOpenModal = (ad: Article | null = null) => {
        setEditingAd(ad);
        if (ad) {
            setTitle(ad.title);
            setSummary(ad.summary);
        } else {
            setTitle('');
            setSummary('');
        }
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAd(null);
    };

    const handleSubmitAd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const adData = {
                title,
                summary,
                content: `<p>${summary}</p>`,
                isAdvertisement: true,
                status: ArticleStatus.PUBLISHED,
            };
            if (editingAd) {
                await updateArticle(editingAd.id, adData);
            } else {
                await createArticle(adData);
            }
            handleCloseModal();
            loadAds();
        } catch {
            alert(`Failed to ${editingAd ? 'update' : 'create'} advertisement.`);
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
                           <tr><td colSpan={4} className="p-8 text-center">Loading ads...</td></tr>
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
                        <label htmlFor="ad-image" className="block text-sm font-medium">Ad Image/Banner</label>
                        <input id="ad-image" type="file" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700" />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">{editingAd ? 'Save Changes' : 'Create Ad'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdManagement;