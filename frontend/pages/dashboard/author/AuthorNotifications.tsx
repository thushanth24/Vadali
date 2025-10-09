import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { fetchNotificationsForUser, fetchArticleById } from '../../../services/api';
import { Notification as NotificationType, NotificationType as NotifEnum, Article } from '../../../types';
import { Bell, CheckCircle, XCircle, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';

const NotificationIcon: React.FC<{ type: NotifEnum }> = ({ type }) => {
    const iconProps = { size: 24, className: 'mr-4 flex-shrink-0' };
    switch (type) {
        case NotifEnum.APPROVED:
            return <CheckCircle {...iconProps} color="green" />;
        case NotifEnum.REJECTED:
            return <XCircle {...iconProps} color="red" />;
        case NotifEnum.COMMENT:
            return <MessageSquare {...iconProps} color="blue" />;
        default:
            return <AlertCircle {...iconProps} color="gray" />;
    }
};

const AuthorNotifications: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [articles, setArticles] = useState<Record<string, Article>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(true);
            fetchNotificationsForUser(user.id)
                .then(async (notifs) => {
                    setNotifications(notifs);
                    const articleIds = [...new Set(notifs.map(n => n.articleId).filter(Boolean))];
                    const articlePromises = articleIds.map(id => fetchArticleById(id!));
                    const fetchedArticles = await Promise.all(articlePromises);
                    const articlesMap = fetchedArticles.reduce((acc, article) => {
                        if (article) acc[article.id] = article;
                        return acc;
                    }, {} as Record<string, Article>);
                    setArticles(articlesMap);
                })
                .finally(() => setLoading(false));
        }
    }, [user]);
    
    const handleMarkAllRead = () => {
        setNotifications(notifications.map(n => ({...n, read: true})));
        // In a real app, this would also be an API call
    };
    
    if (loading) return <div>Loading notifications...</div>;
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Notifications</h2>
                <Button variant="secondary" onClick={handleMarkAllRead} disabled={notifications.every(n => n.read)}>
                    Mark all as read
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-md">
                {notifications.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {notifications.map(notification => {
                            const article = notification.articleId ? articles[notification.articleId] : null;
                            return (
                                <li key={notification.id} className={`p-4 flex items-start ${!notification.read ? 'bg-blue-50' : ''}`}>
                                    <NotificationIcon type={notification.type} />
                                    <div className="flex-grow">
                                        <p className="text-gray-700">{notification.message}</p>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                                            <span>{new Date(notification.timestamp).toLocaleString()}</span>
                                            {article && (
                                                <>
                                                    <span className="mx-2">·</span>
                                                    <Link to={`/dashboard/author/preview/${article.id}`} className="hover:underline font-semibold">
                                                        View Article: {article.title.substring(0, 30)}...
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {!notification.read && <div className="h-2.5 w-2.5 rounded-full bg-blue-500 ml-4 mt-1 flex-shrink-0"></div>}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="text-center p-12 text-gray-500">
                        <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-semibold">No notifications yet</h3>
                        <p>We'll let you know when there's something new.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthorNotifications;