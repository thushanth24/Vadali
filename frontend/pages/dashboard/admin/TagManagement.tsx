import React, { useMemo, useState, useEffect } from 'react';
import { fetchAllTags } from '../../../services/api';
import Button from '../../../components/ui/Button';
import { Edit, Trash2 } from 'lucide-react';

interface TagData {
    name: string;
    count: number;
}

const TagManagement: React.FC = () => {
    const [tags, setTags] = useState<TagData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchAllTags().then(setTags).finally(() => setLoading(false));
    }, []);


    const handleDelete = (tagName: string) => {
        if (window.confirm(`Are you sure you want to delete the tag "${tagName}"? This is a mock action.`)) {
            setTags(tags.filter(t => t.name !== tagName));
        }
    };
    
    const handleEdit = (tagName: string) => {
        const newName = prompt(`Enter new name for the tag "${tagName}":`, tagName);
        if (newName && newName.trim() !== tagName) {
             alert(`Tag "${tagName}" renamed to "${newName}". (Mock action)`);
        }
    };

    if (loading) return <div>Loading tags...</div>;

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Tag Management</h2>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Tag Name</th>
                            <th className="p-4 font-semibold">Article Count</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tags.map(tag => (
                            <tr key={tag.name} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-800 capitalize">{tag.name}</td>
                                <td className="p-4 text-gray-600">{tag.count}</td>
                                <td className="p-4 space-x-2">
                                    <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(tag.name)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(tag.name)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TagManagement;