import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { FileText, Edit } from 'lucide-react';

const mockPageContent: Record<string, { title: string, content: string }> = {
    about: {
        title: "About Us",
        content: "Welcome to Vadali Media, where we are dedicated to bringing you the most accurate, comprehensive, and impartial news... Our mission is simple: to empower our readers with knowledge."
    },
    contact: {
        title: "Contact Us",
        content: "We'd love to hear from you. Please fill out the form on the contact page or reach out to us directly at contact@vadalimedia.com."
    },
    privacy: {
        title: "Privacy Policy",
        content: "This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service..."
    },
    terms: {
        title: "Terms of Service",
        content: "By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement."
    },
    editorial: {
        title: "Editorial Policy",
        content: "At Vadali Media, we are committed to producing journalism that is accurate, fair, and independent. Our reputation rests on the trust of our readers..."
    },
     advertise: {
        title: "Advertise With Us",
        content: "Vadali Media offers a unique opportunity to connect with a highly engaged and influential audience. Reach a dedicated audience of informed readers."
    },
};

const StaticPagesEditor: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<{ key: string, title: string, content: string } | null>(null);
    const [pageContent, setPageContent] = useState('');

    const handleEdit = (pageKey: string) => {
        const pageData = mockPageContent[pageKey];
        setEditingPage({ key: pageKey, ...pageData });
        setPageContent(pageData.content);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        alert(`Content for "${editingPage?.title}" saved successfully! (mock)`);
        setIsModalOpen(false);
        setEditingPage(null);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Static Pages Editor</h2>
            <div className="bg-white rounded-lg shadow-md">
                <ul className="divide-y divide-gray-200">
                    {Object.entries(mockPageContent).map(([key, { title }]) => (
                        <li key={key} className="p-4 flex justify-between items-center">
                            <div className="flex items-center">
                                <FileText className="h-5 w-5 mr-3 text-gray-500" />
                                <span className="font-medium">{title}</span>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(key)} className="flex items-center">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Content
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
            
            {editingPage && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Editing: ${editingPage.title}`}>
                    <div className="space-y-4">
                        <textarea
                            value={pageContent}
                            onChange={(e) => setPageContent(e.target.value)}
                            rows={15}
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex justify-end space-x-3">
                            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="button" onClick={handleSave}>Save Changes</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default StaticPagesEditor;
