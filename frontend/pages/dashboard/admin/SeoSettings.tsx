import React, { useState } from 'react';
import Button from '../../../components/ui/Button';

const SeoSettings: React.FC = () => {
    const [siteTitle, setSiteTitle] = useState('Vadali Media - Your Trusted News Source');
    const [metaDescription, setMetaDescription] = useState('Vadali Media provides the latest news and in-depth analysis on technology, business, politics, and more.');
    const [metaKeywords, setMetaKeywords] = useState('news, journalism, technology, business, politics, breaking news');
    const [robotsTxt, setRobotsTxt] = useState('User-agent: *\nAllow: /\n\nSitemap: https://www.vadalimedia.com/sitemap.xml');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('SEO settings saved successfully! (mock)');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">SEO Settings</h2>
            <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="site-title" className="block text-sm font-medium text-gray-700">Site Title Template</label>
                        <input type="text" id="site-title" value={siteTitle} onChange={e => setSiteTitle(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                        <p className="text-xs text-gray-500 mt-1">This appears in the browser tab and search engine results.</p>
                    </div>
                    <div>
                        <label htmlFor="meta-desc" className="block text-sm font-medium text-gray-700">Default Meta Description</label>
                        <textarea id="meta-desc" value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"></textarea>
                        <p className="text-xs text-gray-500 mt-1">A short description of your site for search engines. Around 155 characters.</p>
                    </div>
                    <div>
                        <label htmlFor="meta-keys" className="block text-sm font-medium text-gray-700">Default Meta Keywords</label>
                        <input type="text" id="meta-keys" value={metaKeywords} onChange={e => setMetaKeywords(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                        <p className="text-xs text-gray-500 mt-1">Comma-separated keywords. Less important for modern SEO but can be useful.</p>
                    </div>
                    <div>
                        <label htmlFor="robots" className="block text-sm font-medium text-gray-700">robots.txt Content</label>
                        <textarea id="robots" value={robotsTxt} onChange={e => setRobotsTxt(e.target.value)} rows={6} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 font-mono text-sm"></textarea>
                        <p className="text-xs text-gray-500 mt-1">Controls how search engine crawlers see your site. Be careful with changes here.</p>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                         <Button type="button" variant="secondary" onClick={() => alert('Sitemap generated! (mock)')}>Generate Sitemap</Button>
                         <Button type="submit">Save SEO Settings</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SeoSettings;
