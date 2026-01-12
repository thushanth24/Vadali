import React, { useEffect, useMemo, useState } from 'react';
import { fetchArticlesWithMeta, fetchUsers, updateArticleStatus } from '../../../services/api';
import { Article, ArticleStatus, User } from '../../../types';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

interface ArticleWithAuthor extends Article {
  author?: User;
}

const normalizeStatus = (status: string | ArticleStatus | undefined | null): ArticleStatus => {
  if (!status) {
    return ArticleStatus.DRAFT;
  }

  const text = status.toString().trim();
  if (!text) {
    return ArticleStatus.DRAFT;
  }

  const lowered = text.toLowerCase();
  const normalized = lowered.replace(/[\s_-]+/g, ' ');

  if (normalized === 'draft' || normalized === 'drafts') {
    return ArticleStatus.DRAFT;
  }

  if (['pending review', 'pending', 'submitted', 'awaiting review'].includes(normalized)) {
    return ArticleStatus.PENDING_REVIEW;
  }

  if (['published', 'approved', 'live'].includes(normalized)) {
    return ArticleStatus.PUBLISHED;
  }

  if (['rejected', 'declined', 'denied'].includes(normalized)) {
    return ArticleStatus.REJECTED;
  }

  const enumMatch = (Object.values(ArticleStatus) as string[]).find(
    (value) => value.toLowerCase() === normalized
  );
  if (enumMatch) {
    return enumMatch as ArticleStatus;
  }

  return ArticleStatus.DRAFT;
};

const getSubmittedDate = (article: Article) => {
  const dateString = article.createdAt || article.updatedAt || article.publishedAt;
  if (!dateString) return 'N/A';
  const parsed = Date.parse(dateString);
  if (!Number.isFinite(parsed)) return 'N/A';
  return new Date(parsed).toLocaleDateString();
};

const PendingArticles: React.FC = () => {
  const [articles, setArticles] = useState<ArticleWithAuthor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadPendingArticles = async () => {
      setLoading(true);
      try {
        const [articleResponse, userData] = await Promise.all([
          fetchArticlesWithMeta({
            status: ArticleStatus.PENDING_REVIEW,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            fetchAllMax: 5000,
          }),
          fetchUsers(),
        ]);

        setUsers(userData);
        const pendingOnly = (articleResponse.items || [])
          .map((article) => ({
            ...article,
            status: normalizeStatus(article.status),
          }))
          .filter((article) => normalizeStatus(article.status) === ArticleStatus.PENDING_REVIEW);

        setArticles(pendingOnly);
      } catch (error) {
        console.error('Failed to load pending articles:', error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    loadPendingArticles();
  }, []);

  const articlesWithAuthor = useMemo(() => {
    if (users.length === 0) return articles;
    return articles.map((article) => ({
      ...article,
      author: users.find((user) => user.id === article.authorId),
    }));
  }, [articles, users]);

  const removeFromList = (articleId: string) => {
    setArticles((prev) => prev.filter((item) => item.id !== articleId));
  };

  const handlePublish = async (articleId: string) => {
    try {
      setActionLoading(articleId);
      await updateArticleStatus(articleId, ArticleStatus.PUBLISHED);
      removeFromList(articleId);
    } catch (error) {
      console.error('Failed to publish article:', error);
      alert('Failed to publish article.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (articleId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setActionLoading(articleId);
      await updateArticleStatus(articleId, ArticleStatus.REJECTED, reason);
      removeFromList(articleId);
    } catch (error) {
      console.error('Failed to reject article:', error);
      alert('Failed to reject article.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading pending articles..." className="h-64" />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pending Articles</h1>
        <p className="mt-1 text-sm text-gray-500">
          New submissions waiting for approval.
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {articlesWithAuthor.length === 0 ? (
            <li className="px-6 py-6 text-center text-gray-500">
              No pending articles.
            </li>
          ) : (
            articlesWithAuthor.map((article) => (
              <li key={article.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {article.title}
                    </p>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      Pending Review
                    </span>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        By {article.author?.name || 'Unknown Author'}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Submitted {getSubmittedDate(article)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 justify-end">
                    <Button
                      size="sm"
                      onClick={() => handlePublish(article.id)}
                      disabled={actionLoading === article.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Publish
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleReject(article.id)}
                      disabled={actionLoading === article.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default PendingArticles;
