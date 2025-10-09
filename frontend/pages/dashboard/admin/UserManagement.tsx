import React, { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../../services/api';
import { User, UserRole } from '../../../types';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Edit, Trash2, PlusCircle } from 'lucide-react';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // State for the form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.AUTHOR);

    const loadUsers = () => {
        setLoading(true);
        fetchUsers()
            .then(setUsers)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const getRoleChip = (role: UserRole) => {
        const styles = {
            [UserRole.ADMIN]: 'bg-red-100 text-red-800',
            [UserRole.EDITOR]: 'bg-purple-100 text-purple-800',
            [UserRole.AUTHOR]: 'bg-blue-100 text-blue-800',
            [UserRole.PUBLIC]: 'bg-gray-100 text-gray-800',
        };
        return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[role]}`}>{role}</span>;
    };

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setRole(user.role);
        } else {
            setName('');
            setEmail('');
            setRole(UserRole.AUTHOR);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            if (editingUser) {
                await updateUser(editingUser.id, { name, email, role });
            } else {
                await createUser({ name, email, role });
            }
            handleCloseModal();
            loadUsers(); // Refresh the list
        } catch (error) {
            alert(`Failed to ${editingUser ? 'update' : 'create'} user.`);
        }
    };
    
    const handleDelete = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await deleteUser(userId);
                setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
            } catch {
                alert("Failed to delete user.");
            }
        }
    };


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">User Management</h2>
                <Button variant="primary" className="flex items-center" onClick={() => handleOpenModal()}>
                    <PlusCircle className="h-5 w-5 mr-2" /> Add New User
                </Button>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Role</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center">Loading users...</td></tr>
                        ) : users.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 flex items-center">
                                    <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full mr-3" />
                                    <span className="font-medium text-gray-800">{user.name}</span>
                                </td>
                                <td className="p-4 text-gray-600">{user.email}</td>
                                <td className="p-4">{getRoleChip(user.role)}</td>
                                <td className="p-4 space-x-2">
                                    <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => handleOpenModal(user)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(user.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? 'Edit User' : 'Add New User'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={UserRole.AUTHOR}>Author</option>
                            <option value={UserRole.EDITOR}>Editor</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingUser ? 'Save Changes' : 'Add User'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UserManagement;