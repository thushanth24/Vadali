import React, { useState, useEffect } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory, fetchArticles } from '../../../services/api';
import { Category, Article } from '../../../types';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Edit, Trash2, PlusCircle } from 'lucide-react';

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');

    const loadData = () => {
        setLoading(true);
        Promise.all([fetchCategories(), fetchArticles({ status: 'ALL' })])
            .then(([catData, articleData]) => {
                setCategories(catData);
                setArticles(articleData);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const getArticleCount = (categoryId: string) => {
        return articles.filter(a => a.categoryId === categoryId).length;
    };

    const handleOpenModal = (category: Category | null = null) => {
        setEditingCategory(category);
        if (category) {
            setName(category.name);
            setSlug(category.slug);
        } else {
            setName('');
            setSlug('');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, { name, slug });
            } else {
                await createCategory({ name, slug });
            }
            handleCloseModal();
            loadData(); // Refresh
        } catch {
            alert(`Failed to ${editingCategory ? 'update' : 'create'} category.`);
        }
    };

    const handleDelete = async (categoryId: string) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await deleteCategory(categoryId);
                loadData(); // Refresh
            } catch {
                alert('Failed to delete category.');
            }
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Category Management</h2>
                 <Button variant="primary" className="flex items-center" onClick={() => handleOpenModal()}>
                    <PlusCircle className="h-5 w-5 mr-2" /> Add New Category
                </Button>
            </div>
             <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Slug</th>
                            <th className="p-4 font-semibold">Article Count</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center">Loading categories...</td></tr>
                        ) : categories.map(category => (
                            <tr key={category.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-800">{category.name}</td>
                                <td className="p-4 text-gray-600">{category.slug}</td>
                                <td className="p-4 text-gray-600">{getArticleCount(category.id)}</td>
                                <td className="p-4 space-x-2">
                                    <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => handleOpenModal(category)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(category.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCategory ? 'Edit Category' : 'Add New Category'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700">Category Name</label>
                        <input type="text" id="cat-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="cat-slug" className="block text-sm font-medium text-gray-700">Slug</label>
                        <input type="text" id="cat-slug" value={slug} onChange={e => setSlug(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">{editingCategory ? 'Save Changes' : 'Add Category'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CategoryManagement;