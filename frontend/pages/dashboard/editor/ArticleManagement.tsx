import { useState, useEffect, ChangeEvent } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { Article, ArticleStatus } from '../../../types';
import { fetchArticlesWithMeta, updateArticleStatus } from '../../../services/api';
import { format } from 'date-fns';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { getArticleDateString } from '../../../lib/articleDate';

interface ArticleWithAuthor extends Article {
  author?: {
    name: string;
  };
  rawStatus?: string;
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

  if (process.env.NODE_ENV === 'development') {
    console.warn('Encountered unknown article status:', status);
  }
  return ArticleStatus.DRAFT;
};

export default function ArticleManagement() {
  const { user } = useAuth();
  const location = useLocation();
  const [articles, setArticles] = useState<ArticleWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageTokens, setPageTokens] = useState<Record<number, string | undefined>>({ 1: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hasMore, setHasMore] = useState(false);

  const getUpdatedTimestamp = (article: ArticleWithAuthor) => {
    const toTs = (value?: string | null) => {
      if (!value) return 0;
      const ts = Date.parse(value);
      return Number.isFinite(ts) ? ts : 0;
    };

    return (
      toTs(article.updatedAt) ||
      toTs(article.createdAt) ||
      toTs(article.publishedAt) ||
      0
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');

    if (!statusParam) {
      return;
    }

    const cleaned = statusParam.trim();
    if (cleaned.toLowerCase() === 'all') {
      setStatusFilter('ALL');
      return;
    }

    const normalized = normalizeStatus(cleaned);
    setStatusFilter(normalized);
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
    setPageTokens({ 1: undefined });
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadArticles(currentPage);
  }, [statusFilter, searchQuery, currentPage, pageSize]);

  const loadArticles = async (pageToLoad: number) => {
    try {
      setLoading(true);

      const statusParam = statusFilter === 'ALL' ? 'all' : statusFilter;
      const startKey = pageTokens[pageToLoad];

      // When filtering by status or using smaller page sizes, fetch a larger slice and paginate client-side
      const fetchAllForStatus = statusFilter !== 'ALL' || pageSize < 50;
      const effectiveLimit = fetchAllForStatus ? 1000 : pageSize;

      const { items, lastEvaluatedKey, hasMore: moreAvailable } = await fetchArticlesWithMeta(
        {
          limit: effectiveLimit,
          pageSize: effectiveLimit,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          status: statusParam,
          query: searchQuery || undefined,
          lastEvaluatedKey: fetchAllForStatus ? undefined : startKey,
        },
        {
          skipCache: true,
        }
      );

      const normalizedArticles: ArticleWithAuthor[] = Array.isArray(items)
        ? items.map((article) => {
            const normalizedStatus = normalizeStatus(article.status);
            const rawStatusValue =
              typeof article.status === 'string'
                ? article.status
                : (article.status as unknown as string) ?? normalizedStatus;

            return {
              ...article,
              rawStatus: rawStatusValue,
              status: normalizedStatus,
            };
          })
        : [];

      const filteredArticles =
        statusFilter === 'ALL'
          ? normalizedArticles
          : normalizedArticles.filter(
              (article) => normalizeStatus(article.status) === statusFilter
            );

      const sortedByUpdate = [...filteredArticles].sort(
        (a, b) => getUpdatedTimestamp(b) - getUpdatedTimestamp(a)
      );

      if (fetchAllForStatus) {
        const startIndex = (pageToLoad - 1) * pageSize;
        const paginated = sortedByUpdate.slice(startIndex, startIndex + pageSize);
        setArticles(paginated);
        setHasMore(sortedByUpdate.length > startIndex + pageSize);
        setPageTokens({ 1: undefined });
      } else {
        setArticles(sortedByUpdate);
        setHasMore(Boolean(lastEvaluatedKey) || Boolean(moreAvailable));
        setPageTokens((prev) => {
          const updated = { ...prev };
          if (lastEvaluatedKey) {
            updated[pageToLoad + 1] = lastEvaluatedKey;
          } else {
            delete updated[pageToLoad + 1];
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value);
    if (Number.isNaN(nextSize) || nextSize <= 0) return;
    setPageTokens({ 1: undefined });
    setCurrentPage(1);
    setPageSize(nextSize);
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    const canGoPrevious = currentPage > 1 && !loading;
    const canGoNext = !loading && (hasMore || Boolean(pageTokens[currentPage + 1]));

    if (direction === 'prev' && canGoPrevious) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }

    if (direction === 'next' && canGoNext) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleStatusChange = async (articleId: string, newStatus: ArticleStatus, rejectionReason?: string) => {
    try {
      await updateArticleStatus(articleId, newStatus, rejectionReason);
      loadArticles(currentPage);
    } catch (error) {
      console.error('Error updating article status:', error);
    }
  };

  const getStatusBadge = (status: ArticleStatus, rawStatus?: string) => {
    const statusClasses = {
      [ArticleStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [ArticleStatus.PENDING_REVIEW]: 'bg-blue-100 text-blue-800',
      [ArticleStatus.PUBLISHED]: 'bg-green-100 text-green-800',
      [ArticleStatus.REJECTED]: 'bg-red-100 text-red-800'
    };

    const normalizedStatus = normalizeStatus(status);
    const badgeClass = statusClasses[normalizedStatus] || 'bg-gray-100 text-gray-800';
    const showRawStatus =
      rawStatus &&
      rawStatus.toLowerCase() !== normalizedStatus.toLowerCase();
    const displayLabel = normalizedStatus;
    
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}
        title={showRawStatus ? `Original status: ${rawStatus}` : undefined}
      >
        {displayLabel}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Article Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and review articles submitted by authors
        </p>

      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search articles..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ArticleStatus | 'ALL')}
          >
            <option value="ALL">All Statuses</option>
            <option value={ArticleStatus.DRAFT}>Draft</option>
            <option value={ArticleStatus.PENDING_REVIEW}>Pending Review</option>
            <option value={ArticleStatus.PUBLISHED}>Published</option>
            <option value={ArticleStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading articles..." className="h-64" />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {articles.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No articles found
              </li>
            ) : (
              articles.map((article) => {
                const publishedDateString = getArticleDateString(article);
                const publishedLabel = publishedDateString
                  ? `Published on ${format(new Date(publishedDateString), 'MMM d, yyyy')}`
                  : 'Not published yet';

                return (
                  <li key={article.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {article.title}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          {getStatusBadge(article.status, article.rawStatus)}
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            By {article.author?.name || 'Unknown Author'}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            {publishedLabel}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <span>{article.views} views</span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end space-x-2">
                        <Link
                          to={`/dashboard/editor/edit/${article.id}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                        <a
                          href={`/article/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleStatusChange(article.id, ArticleStatus.PUBLISHED)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          Mark as Published
                        </button>
                        <button
                          onClick={() => handleStatusChange(article.id, ArticleStatus.PENDING_REVIEW)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600"
                        >
                          Send to Review
                        </button>
                        {article.status === ArticleStatus.PENDING_REVIEW && (
                          <>
                            <button
                              onClick={() => handleStatusChange(article.id, ArticleStatus.PUBLISHED)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Please provide a reason for rejection:');
                                if (reason) {
                                  handleStatusChange(article.id, ArticleStatus.REJECTED, reason);
                                }
                              }}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {article.status === ArticleStatus.PUBLISHED && (
                          <button
                            onClick={() => handleStatusChange(article.id, ArticleStatus.DRAFT)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      <div className="mt-4 bg-white shadow-sm border border-gray-100 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-700 mb-2 sm:mb-0">
          Page {currentPage} {loading ? '(loading...)' : ''}
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-sm text-gray-700 flex items-center space-x-2">
            <span>Per page</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {[10, 20, 30, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange('next')}
              disabled={loading || (!hasMore && !pageTokens[currentPage + 1])}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
