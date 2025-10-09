import React, { useState } from 'react';
import Button from '../../../components/ui/Button';

const SiteSettings: React.FC = () => {
    const [siteName, setSiteName] = useState('Vadali Media');
    const [accentColor, setAccentColor] = useState('#1a237e');
    const [footerText, setFooterText] = useState('© 2024 Vadali Media. All rights reserved.');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Site settings saved successfully! (mock)');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Site Settings</h2>
            <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="site-name" className="block text-sm font-medium text-gray-700">Site Name</label>
                        <input type="text" id="site-name" value={siteName} onChange={e => setSiteName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Site Logo</label>
                        <div className="mt-1 flex items-center space-x-4">
                            <div className="p-2 border rounded-md">
                                <span className="text-xl font-extrabold text-gray-800">
                                    {siteName.split(' ')[0] || 'Logo'} <span style={{color: accentColor}}>{siteName.split(' ')[1] || ''}</span>
                                </span>
                            </div>
                            <input type="file" id="site-logo" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="accent-color" className="block text-sm font-medium text-gray-700">Accent Color</label>
                        <div className="flex items-center space-x-2 mt-1">
                            <input type="color" id="accent-color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-10 w-10 p-1 border rounded-md" />
                            <input type="text" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="block w-full max-w-xs border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="footer-text" className="block text-sm font-medium text-gray-700">Footer Text</label>
                        <textarea id="footer-text" value={footerText} onChange={e => setFooterText(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"></textarea>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                         <Button type="submit">Save Site Settings</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SiteSettings;
