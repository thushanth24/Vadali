import React, { useState, useEffect } from 'react';
// Fix: Import Subscriber type from types/index.ts, not services/api.ts
import { fetchSubscribers } from '../../../services/api';
import { Subscriber } from '../../../types';
import Button from '../../../components/ui/Button';
import { Users, Send } from 'lucide-react';

const NewsletterManagement: React.FC = () => {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchSubscribers().then(setSubscribers).finally(() => setLoading(false));
    }, []);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if(!subject || !content) {
            alert('Please fill out both subject and content.');
            return;
        }
        alert(`Newsletter sent to ${subscribers.length} subscribers! (mock)`);
        setSubject('');
        setContent('');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Newsletter Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Composer */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">Compose Newsletter</h3>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                            <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                        </div>
                        <div>
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                            <textarea id="content" value={content} onChange={e => setContent(e.target.value)} required rows={12} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="Write your newsletter content here..."></textarea>
                        </div>
                        <div className="text-right">
                            <Button type="submit" className="inline-flex items-center">
                                <Send className="h-4 w-4 mr-2" />
                                Send to All Subscribers
                            </Button>
                        </div>
                    </form>
                </div>
                {/* Subscriber List */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex items-center mb-4">
                            <Users className="h-6 w-6 mr-3 text-blue-500" />
                            <h3 className="text-xl font-bold">Subscribers ({subscribers.length})</h3>
                        </div>
                         {loading ? <p>Loading subscribers...</p> : (
                            <ul className="space-y-2 h-96 overflow-y-auto pr-2">
                                {subscribers.map(sub => (
                                    <li key={sub.id} className="p-2 bg-gray-50 rounded text-sm">
                                        <p className="font-medium text-gray-800">{sub.email}</p>
                                        <p className="text-xs text-gray-500">Subscribed on: {new Date(sub.subscribedAt).toLocaleDateString()}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsletterManagement;
