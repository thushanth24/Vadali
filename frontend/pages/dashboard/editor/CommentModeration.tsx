import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPendingComments, updateCommentStatus } from '../../../services/api';
import { Comment, Article } from '../../../types';
import Button from '../../../components/ui/Button';
import { Check, Trash2, MessageSquare } from 'lucide-react';

interface CommentWithArticle extends Comment {
    article: Article;
}

const CommentModeration: React.FC = () => {
    const [pendingComments, setPendingComments] = useState<CommentWithArticle[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        setLoading(true);
        fetchPendingComments()
            .then(setPendingComments)
            .finally(() => setLoading(false));
    }, []);


    const handleApprove = async (comment: CommentWithArticle) => {
        try {
            await updateCommentStatus(comment.article.id, comment.id, 'APPROVED');
            setPendingComments(pendingComments.filter(c => c.id !== comment.id));
        } catch {
            alert("Failed to approve comment.");
        }
    };

    const handleDelete = async (comment: CommentWithArticle) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            try {
                // 'REJECTED' status can be used to effectively delete it from view
                await updateCommentStatus(comment.article.id, comment.id, 'REJECTED');
                setPendingComments(pendingComments.filter(c => c.id !== comment.id));
            } catch {
                alert("Failed to delete comment.");
            }
        }
    };
    
    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Comment Moderation</h2>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold">Comment</th>
                            <th className="p-4 font-semibold">Author</th>
                            <th className="p-4 font-semibold">Article</th>
                            <th className="p-4 font-semibold">Date</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading comments...</td></tr>
                        ) : pendingComments.length > 0 ? pendingComments.map(comment => (
                            <tr key={comment.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 text-gray-700 max-w-sm">"{comment.text}"</td>
                                <td className="p-4">
                                    <div className="flex items-center">
                                        <img src={comment.authorAvatarUrl} alt={comment.authorName} className="h-8 w-8 rounded-full mr-2" />
                                        <span className="font-medium text-sm">{comment.authorName}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Link to={`/article/${comment.article.slug}`} target="_blank" className="text-blue-600 hover:underline text-sm">
                                        {comment.article.title.substring(0, 30)}...
                                    </Link>
                                </td>
                                <td className="p-4 text-sm text-gray-500">{new Date(comment.date).toLocaleDateString()}</td>
                                <td className="p-4 space-x-2 flex items-center">
                                    <Button size="sm" onClick={() => handleApprove(comment)} className="bg-green-500 hover:bg-green-600 text-white flex items-center">
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(comment)} className="flex items-center">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                    No comments are currently pending moderation.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CommentModeration;