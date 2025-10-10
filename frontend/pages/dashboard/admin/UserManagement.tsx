import React, { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../../services/api';
import { User, UserRole } from '../../../types';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Edit, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // State for the form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.AUTHOR);
    const [password, setPassword] = useState('');

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
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
        setPassword('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setPassword('');
    };

    const handleClosePasswordModal = () => {
        setIsPasswordModalOpen(false);
        setGeneratedPassword(null);
    };

    const copyToClipboard = () => {
        if (generatedPassword) {
            navigator.clipboard.writeText(generatedPassword);
            toast.success('Password copied to clipboard');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            toast.error('Please fill in all required fields');
            return;
        }

        const trimmedPassword = password.trim();

        try {
            if (editingUser) {
                await updateUser(editingUser.id, { 
                    name, 
                    email, 
                    role,
                    ...(trimmedPassword ? { password: trimmedPassword } : {}),
                });
                toast.success(trimmedPassword ? 'User updated and password reset successfully' : 'User updated successfully');
            } else {
                const newUser = await createUser({ 
                    name, 
                    email, 
                    role,
                    ...(trimmedPassword ? { password: trimmedPassword } : {}),
                });
                toast.success('User created successfully');
                if (!trimmedPassword && newUser.temporaryPassword) {
                    setGeneratedPassword(newUser.temporaryPassword);
                    setIsPasswordModalOpen(true);
                }
            }
            handleCloseModal();
            loadUsers();
        } catch (error) {
            console.error(`Failed to ${editingUser ? 'update' : 'create'} user:`, error);
            toast.error(`Failed to ${editingUser ? 'update' : 'create'} user`);
        }
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await deleteUser(userId);
                setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
                toast.success('User deleted successfully');
            } catch (error) {
                console.error('Failed to delete user:', error);
                toast.error('Failed to delete user');
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
                            <tr>
                                <td colSpan={4} className="p-8 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                        <span className="text-gray-500">Loading users...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    No users found
                                </td>
                            </tr>
                        ) : users.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 flex items-center">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.name || user.email || 'User avatar'}
                                            className="h-10 w-10 rounded-full object-cover mr-3"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-medium text-gray-900">
                                        {user.name || user.email || ''}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600">{user.email || ''}</td>
                                <td className="p-4">
                                    {user.role ? (
                                        getRoleChip(user.role)
                                    ) : null}
                                </td>
                                <td className="p-4 space-x-2 whitespace-nowrap">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-blue-600 hover:bg-blue-50" 
                                        onClick={() => handleOpenModal(user)}
                                        aria-label="Edit user"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-red-600 hover:bg-red-50" 
                                        onClick={() => handleDelete(user.id)}
                                        disabled={user.role === UserRole.ADMIN}
                                        aria-label="Delete user"
                                    >
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
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder={editingUser ? 'Leave blank to keep current password' : 'Leave blank to auto-generate a password'}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {editingUser
                                ? 'Provide a new password to reset it.'
                                : 'Leave blank to generate a random temporary password.'}
                        </p>
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

            <Modal isOpen={isPasswordModalOpen} onClose={handleClosePasswordModal} title="Temporary Password">
                <div className="space-y-4">
                    <p className="text-gray-600">
                        The user has been created. Please share this temporary password with them.
                    </p>
                    <div className="bg-gray-100 p-3 rounded-md flex items-center justify-between">
                        <span className="font-mono text-lg text-gray-800">{generatedPassword}</span>
                        <Button onClick={copyToClipboard} variant="secondary" size="sm">
                            Copy
                        </Button>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleClosePasswordModal} variant="primary">
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
