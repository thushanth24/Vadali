import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import { uploadFileToS3, updateUser } from '../../../services/api';

const AuthorProfileSettings: React.FC = () => {
    const { user, login } = useAuth(); // Using login to refresh context
    
    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        try {
            let avatarUrl = user?.avatarUrl;
            if (avatarFile) {
                avatarUrl = await uploadFileToS3(avatarFile);
            }
            
            const updatedUser = await updateUser(user.id, { name, bio, avatarUrl });
            // Re-login to update the user context everywhere
            await login(updatedUser.email);

            alert('Profile updated successfully!');
        } catch (error) {
            alert('Failed to update profile.');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Password changed successfully! (mock)');
    };

    return (
        <div className="space-y-8">
            {/* Profile Information Section */}
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Information</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="flex items-center space-x-6">
                        <img src={avatarFile ? URL.createObjectURL(avatarFile) : user?.avatarUrl} alt="Current avatar" className="h-24 w-24 rounded-full object-cover" />
                        <div>
                            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">Change Profile Photo</label>
                            <input type="file" id="avatar" accept="image/*" onChange={e => setAvatarFile(e.target.files ? e.target.files[0] : null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
                        <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={4} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Tell us a little about yourself..."></textarea>
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                    </div>
                </form>
            </div>

            {/* Change Password Section */}
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h2>
                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-lg">
                    <div>
                        <label htmlFor="current-password"  className="block text-sm font-medium text-gray-700">Current Password</label>
                        <input type="password" id="current-password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="new-password"  className="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" id="new-password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="confirm-password"  className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input type="password" id="confirm-password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit">Update Password</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthorProfileSettings;