import React, { useState, useEffect, useMemo } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory, fetchArticles } from '../../../services/api';
import { Category, Article } from '../../../types';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { Edit, Trash2, PlusCircle } from 'lucide-react';

const getDescendantIds = (rootId: string, allCategories: Category[]): Set<string> => {
    const childrenByParent = allCategories.reduce<Record<string, string[]>>((acc, category) => {
        const parentId = category.parentCategoryId ?? null;
        if (parentId) {
            acc[parentId] = acc[parentId] || [];
            acc[parentId].push(category.id);
        }
        return acc;
    }, {});

    const stack = [...(childrenByParent[rootId] ?? [])];
    const descendants = new Set<string>();

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (descendants.has(current)) continue;
        descendants.add(current);
        if (childrenByParent[current]) {
            stack.push(...childrenByParent[current]);
        }
    }

    return descendants;
};

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [showInHeader, setShowInHeader] = useState(true);
    const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
    const [headerSelections, setHeaderSelections] = useState<Record<string, boolean>>({});
    const [savingHeader, setSavingHeader] = useState(false);

    const loadData = () => {
        setLoading(true);
        return Promise.all([fetchCategories(), fetchArticles({ status: 'ALL' })])
            .then(([catData, articleData]) => {
                setCategories(catData);
                setArticles(articleData);
                setHeaderSelections(
                    catData.reduce<Record<string, boolean>>((acc, category) => {
                        acc[category.id] = category.showInHeader ?? true;
                        return acc;
                    }, {})
                );
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
            setShowInHeader(category.showInHeader ?? true);
            setParentCategoryId(category.parentCategoryId ?? null);
        } else {
            setName('');
            setSlug('');
            setShowInHeader(true);
            setParentCategoryId(null);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setShowInHeader(true);
        setParentCategoryId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, { name, slug, showInHeader, parentCategoryId: parentCategoryId ?? null });
            } else {
                await createCategory({ name, slug, showInHeader, parentCategoryId: parentCategoryId ?? null });
            }
            handleCloseModal();
            await loadData(); // Refresh
        } catch {
            alert(`Failed to ${editingCategory ? 'update' : 'create'} category.`);
        }
    };

    const handleDelete = async (categoryId: string) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await deleteCategory(categoryId);
                await loadData(); // Refresh
            } catch {
                alert('Failed to delete category.');
            }
        }
    };

    const handleHeaderSelectionChange = (categoryId: string, value: boolean) => {
        setHeaderSelections(prev => ({
            ...prev,
            [categoryId]: value,
        }));
    };

    const hasHeaderChanges = categories.some(category => {
        const original = category.showInHeader ?? true;
        const current = headerSelections[category.id] ?? true;
        return original !== current;
    });

    const parentLookup = useMemo(
        () =>
            categories.reduce<Record<string, Category>>((acc, category) => {
                acc[category.id] = category;
                return acc;
            }, {}),
        [categories]
    );

    const selectableParents = useMemo(() => {
        if (!editingCategory) {
            return [...categories].sort((a, b) => a.name.localeCompare(b.name));
        }

        const invalidIds = getDescendantIds(editingCategory.id, categories);
        invalidIds.add(editingCategory.id);

        return categories
            .filter(category => !invalidIds.has(category.id))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [categories, editingCategory]);

    const handleSaveHeaderVisibility = async () => {
        if (!hasHeaderChanges) {
            return;
        }

        setSavingHeader(true);
        try {
            const updates = categories
                .filter(category => {
                    const original = category.showInHeader ?? true;
                    const current = headerSelections[category.id] ?? true;
                    return original !== current;
                })
                .map(category =>
                    updateCategory(category.id, {
                        showInHeader: headerSelections[category.id] ?? true,
                    })
                );

            await Promise.all(updates);
            await loadData();
        } catch {
            alert('Failed to update header visibility.');
        } finally {
            setSavingHeader(false);
        }
    };
    
    return (
        <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Category Management</h2>
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
                    <Button
                        variant="secondary"
                        disabled={!hasHeaderChanges || savingHeader}
                        onClick={handleSaveHeaderVisibility}
                    >
                        {savingHeader ? 'Saving...' : 'Save Header Visibility'}
                    </Button>
                    <Button variant="primary" className="flex items-center" onClick={() => handleOpenModal()}>
                        <PlusCircle className="h-5 w-5 mr-2" /> Add New Category
                    </Button>
                </div>
            </div>
             <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Slug</th>
                            <th className="p-4 font-semibold">Parent</th>
                            <th className="p-4 font-semibold">In Header</th>
                            <th className="p-4 font-semibold">Article Count</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-8"><LoadingSpinner label="Loading categories..." className="py-0" /></td></tr>
                        ) : categories.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-gray-500">
                                    No categories found. Create a category to get started.
                                </td>
                            </tr>
                        ) : categories.map(category => (
                            <tr key={category.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-800">{category.name}</td>
                                <td className="p-4 text-gray-600">{category.slug}</td>
                                <td className="p-4 text-gray-600">
                                    {category.parentCategoryId ? parentLookup[category.parentCategoryId]?.name ?? 'Unknown' : 'Top level'}
                                </td>
                                <td className="p-4 text-gray-600">
                                    <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={headerSelections[category.id] ?? true}
                                            onChange={e => handleHeaderSelectionChange(category.id, e.target.checked)}
                                        />
                                        {(headerSelections[category.id] ?? true) ? 'Shown in header' : 'Hidden from header'}
                                    </label>
                                </td>
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
            {hasHeaderChanges && !loading && (
                <p className="mt-3 text-sm text-amber-600">
                    You have unsaved header visibility changes. Click &quot;Save Header Visibility&quot; to apply them.
                </p>
            )}

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
                    <div>
                        <label htmlFor="cat-parent" className="block text-sm font-medium text-gray-700">Parent Category</label>
                        <select
                            id="cat-parent"
                            value={parentCategoryId ?? ''}
                            onChange={e => setParentCategoryId(e.target.value ? e.target.value : null)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">No parent (top level)</option>
                            {selectableParents.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                    {option.parentCategoryId ? ` (child of ${parentLookup[option.parentCategoryId]?.name ?? 'Top level'})` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-sm text-gray-500">
                            Assign a parent to show this category inside a dropdown in the site header navigation.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <input
                            id="cat-show-in-header"
                            type="checkbox"
                            checked={showInHeader}
                            onChange={e => setShowInHeader(e.target.checked)}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <label htmlFor="cat-show-in-header" className="block text-sm font-medium text-gray-700">
                                Show in site header
                            </label>
                            <p className="mt-1 text-sm text-gray-500">
                                Toggle to include this category in the primary navigation bar.
                            </p>
                        </div>
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
