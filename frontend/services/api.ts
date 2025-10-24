import { User, Category, Article, Notification, Subscriber, UserRole, ArticleStatus, Comment } from '../types';

// =================================================================
// THIS IS THE LIVE API LAYER. IT MAKES REQUESTS TO THE BACKEND.
// =================================================================

const API_BASE = 'https://9zogdsw6a4.execute-api.us-east-1.amazonaws.com'; // From your curl command

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  const tokens = localStorage.getItem('authTokens');
  if (!tokens) return null;
  
  try {
    const { token } = JSON.parse(tokens);
    return token;
  } catch (error) {
    console.error('Failed to parse auth tokens', error);
    return null;
  }
};

// Wrapper for fetch that handles auth and common error cases
const apiRequest = async <T = void>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  // Set up headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  let response: Response;
  let responseText: string | undefined;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
    
    // Get response text for error handling
    responseText = await response.text().catch(() => '');
    
    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      // Try to refresh token if this wasn't a refresh request
      if (!endpoint.includes('/auth/refresh')) {
        try {
          const newToken = await refreshToken();
          if (newToken) {
            // Retry the original request with new token
            return apiRequest<T>(endpoint, {
              ...options,
              headers: {
                ...headers,
                'Authorization': `Bearer ${newToken}`,
              },
            });
          }
        } catch (error) {
          console.error('Token refresh failed', error);
          // Clear auth and redirect to login
          localStorage.removeItem('authTokens');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
      }
      throw new Error('Session expired. Please log in again.');
    }

    // Handle other error statuses
    if (!response.ok) {
      console.error('API Request Failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        response: responseText,
      });
      
      let errorMessage = response.statusText;
      try {
        const errorData = responseText ? JSON.parse(responseText) : {};
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If we can't parse JSON, use the raw text
        errorMessage = responseText || errorMessage;
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      // For 204 No Content, return undefined if there's no content
      // This is type-safe because T defaults to void
      if (!responseText) {
        return undefined as unknown as T;
      }
      
      // If there is content, try to parse it as JSON
      try {
        return JSON.parse(responseText) as T;
      } catch {
        throw new Error('Received invalid JSON in 204 response');
      }
    }

    if (!responseText) {
      throw new Error('Received empty response when JSON was expected');
    }
    return JSON.parse(responseText) as T;
  } catch (error) {
    console.error('API Request Error:', {
      url,
      error,
      responseText,
    });
    throw error;
  }
};

type ArticleApiResponse = Omit<Article, 'status' | 'comments'> & {
  status: string;
  comments?: Comment[];
};

type ArticlesResponse = {
  items?: ArticleApiResponse[];
  total: number;
  lastEvaluatedKey?: string;
  hasMore?: boolean;
};

const normalizeArticleStatus = (status: unknown): ArticleStatus => {
  if (typeof status !== 'string') {
    return ArticleStatus.PENDING_REVIEW;
  }

  const normalized = status.trim().toLowerCase();
  const collapsed = normalized.replace(/[\s_-]+/g, ' ');

  if (['published', 'publish', 'approved', 'live'].includes(collapsed)) {
    return ArticleStatus.PUBLISHED;
  }

  if (['draft', 'drafts'].includes(collapsed)) {
    return ArticleStatus.DRAFT;
  }

  if (['rejected', 'declined', 'denied'].includes(collapsed)) {
    return ArticleStatus.REJECTED;
  }

  if (
    [
      'pending review',
      'pending',
      'submitted',
      'awaiting review',
      'in review',
      'under review',
    ].includes(collapsed)
  ) {
    return ArticleStatus.PENDING_REVIEW;
  }

  return ArticleStatus.PENDING_REVIEW;
};

const normalizeArticle = (article: ArticleApiResponse): Article => ({
  ...article,
  status: normalizeArticleStatus(article.status),
  comments: Array.isArray(article.comments) ? article.comments : [],
});

const normalizeArticles = (articles: ArticleApiResponse[] = []): Article[] =>
  articles.map(normalizeArticle);

// --- AUTH ENDPOINTS ---
interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const apiLogin = async (credentials: LoginRequest): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const register = async (userData: { 
  name: string; 
  email: string; 
  password: string;
}): Promise<AuthResponse> => {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const refreshToken = async (): Promise<string> => {
  const tokens = localStorage.getItem('authTokens');
  if (!tokens) {
    throw new Error('No refresh token available');
  }

  try {
    const { refreshToken } = JSON.parse(tokens);
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    // Update stored tokens
    const newTokens = {
      token: data.token,
      refreshToken: data.refreshToken,
    };
    
    localStorage.setItem('authTokens', JSON.stringify(newTokens));
    
    return data.token;
  } catch (error) {
    console.error('Refresh token failed:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  const token = getAuthToken();
  if (token) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
  
  // Clear local storage on logout
  localStorage.removeItem('authTokens');
  localStorage.removeItem('user');
};

export const apiRegister = async (userData: { name: string; email: string; }): Promise<User> => {
    return apiRequest<User>('/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const fetchUsers = async (): Promise<User[]> => {
  return apiRequest<User[]>('/users');
};

export const fetchUser = async (userId: string): Promise<User | undefined> => {
  return apiRequest<User | undefined>(`/users/${userId}`);
}

interface CreateUserPayload {
  name: string;
  email: string;
  role?: UserRole;
  avatarUrl?: string;
  bio?: string;
  password?: string;
}

interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  avatarUrl?: string;
  bio?: string;
  password?: string;
}

export const createUser = async (userData: CreateUserPayload): Promise<User> => {
    return apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const updateUser = async (userId: string, userData: UpdateUserPayload): Promise<User> => {
    return apiRequest<User>(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
    });
};

export const deleteUser = async (userId: string): Promise<void> => {
    await apiRequest(`/users/${userId}`, { method: 'DELETE' });
};


// --- ARTICLES ---
interface FetchArticlesParams {
    category?: string; 
    categoryId?: string;
    categorySlug?: string;
    author?: string;
    authorId?: string;
    status?: ArticleStatus | 'published' | 'draft' | 'archived'; // Support both enum and string literals
    featured?: boolean;
    isAdvertisement?: boolean;
    limit?: number | string;
    offset?: number | string;
    page?: number | string;
    pageSize?: number | string;
    sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
    sortOrder?: 'asc' | 'desc';
    query?: string;
}

export const fetchArticles = async (params: FetchArticlesParams = {}): Promise<Article[]> => {
    try {
        const url = buildArticlesUrl(params);
        const response = await apiRequest<ArticlesResponse>(url);
        // Backend returns { items: Article[], total: number }, but we just need the items array
        return normalizeArticles(response.items ?? []);
    } catch (error) {
        console.error('Failed to fetch articles:', error);
        // You could add error handling logic here, e.g., show a toast notification
        throw error;
    }
};

/**
 * Builds a URL with query parameters for fetching articles
 * Handles different API parameter naming conventions and formats
 */
function buildArticlesUrl(params: FetchArticlesParams): string {
    const url = new URL('/articles', API_BASE);
    const searchParams = new URLSearchParams();

    // Map parameters to their expected API names
    if (params.category) searchParams.append('category', params.category);
    if (params.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params.categorySlug) searchParams.append('categorySlug', params.categorySlug);
    if (params.author) searchParams.append('author', params.author);
    if (params.authorId) searchParams.append('authorId', params.authorId);
    
    // Handle status with fallback for different API expectations
    if (params.status) {
        const statusValue = params.status.toLowerCase();
        searchParams.append('status', statusValue);
    }
    
    if (params.query) {
        searchParams.append('query', params.query);
    }

    if (params.featured !== undefined) {
        searchParams.append('featured', String(params.featured));
    }

    if (params.isAdvertisement !== undefined) {
        searchParams.append('isAdvertisement', String(params.isAdvertisement));
    }

    // Handle both limit/offset and page/pageSize pagination
    const resolvedLimit = params.limit ?? params.pageSize ?? 10;
    searchParams.append('limit', String(resolvedLimit));

    if (params.pageSize !== undefined) {
        searchParams.append('pageSize', String(params.pageSize));
    }

    if (params.page !== undefined) {
        searchParams.append('page', String(params.page));
    }

    if (params.offset !== undefined) {
        searchParams.append('offset', String(params.offset));
    }

    
    // Handle sorting
    if (params.sortBy) {
        const order = params.sortOrder === 'desc' ? '-' : '';
        searchParams.append('sort', `${order}${params.sortBy}`);
    }
    
    // Only append search params if there are any
    const queryString = searchParams.toString();
    return queryString ? `/articles?${queryString}` : '/articles';
}

export const fetchArticleById = async (id: string): Promise<Article | undefined> => {
    const article = await apiRequest<ArticleApiResponse | undefined>(`/articles/id/${id}`);
    return article ? normalizeArticle(article) : undefined;
};

export const fetchArticleBySlug = async (slug: string): Promise<Article | undefined> => {
    const article = await apiRequest<ArticleApiResponse | undefined>(`/articles/slug/${slug}`);
    return article ? normalizeArticle(article) : undefined;
};

export const createArticle = async (articleData: Partial<Article>): Promise<Article> => {
    const article = await apiRequest<ArticleApiResponse>('/articles', {
        method: 'POST',
        body: JSON.stringify(articleData),
    });
    return normalizeArticle(article);
};

export const updateArticle = async (articleId: string, articleData: Partial<Article>): Promise<Article> => {
    const article = await apiRequest<ArticleApiResponse>(`/articles/${articleId}`, {
        method: 'PUT',
        body: JSON.stringify(articleData),
    });
    return normalizeArticle(article);
};

export const deleteArticle = async (articleId: string): Promise<void> => {
    await apiRequest(`/articles/${articleId}`, { method: 'DELETE' });
};

export const updateArticleStatus = async (articleId: string, status: ArticleStatus, reason?: string): Promise<Article> => {
    const article = await apiRequest<ArticleApiResponse>(`/articles/${articleId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason }),
    });
    return normalizeArticle(article);
};

export const updateFeaturedStatus = async (updates: { articleId: string, isFeatured: boolean }[]): Promise<void> => {
    await apiRequest('/articles/featured', {
        method: 'POST',
        body: JSON.stringify({ updates }),
    });
};

// --- CATEGORIES ---
export const fetchCategories = async (params?: { showInHeader?: boolean }): Promise<Category[]> => {
    const query = new URLSearchParams();
    if (typeof params?.showInHeader === 'boolean') {
        query.set('showInHeader', String(params.showInHeader));
    }

    const endpoint = query.toString() ? `/categories?${query.toString()}` : '/categories';
    return apiRequest<Category[]>(endpoint);
};

export const createCategory = async (catData: { name: string; slug: string; description?: string; showInHeader?: boolean }): Promise<Category> => {
    return apiRequest<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(catData),
    });
};

export const updateCategory = async (catId: string, catData: Partial<Category>): Promise<Category> => {
    return apiRequest<Category>(`/categories/${catId}`, {
        method: 'PUT',
        body: JSON.stringify(catData),
    });
};

export const deleteCategory = async (catId: string): Promise<void> => {
    await apiRequest(`/categories/${catId}`, { method: 'DELETE' });
};

// --- COMMENTS ---
export const fetchPendingComments = async (): Promise<(Comment & { article: Article })[]> => {
    return apiRequest<(Comment & { article: Article })[]>('/comments/pending');
};

export const postComment = async (articleId: string, text: string): Promise<Comment> => {
    return apiRequest<Comment>(`/articles/${articleId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
};

export const updateCommentStatus = async (articleId: string, commentId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> => {
    await apiRequest(`/articles/${articleId}/comments/${commentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
};

// --- NOTIFICATIONS ---
export const fetchNotificationsForUser = async (userId: string): Promise<Notification[]> => {
    return apiRequest<Notification[]>(`/notifications/user/${userId}`);
};

// --- TAGS ---
export const fetchAllTags = async(): Promise<{name: string, count: number}[]> => {
    return apiRequest<{name: string, count: number}[]>('/tags');
};


// --- MISC ---
export const fetchSubscribers = async(): Promise<Subscriber[]> => {
    return apiRequest<Subscriber[]>('/subscribers');
};

export const subscribeToNewsletter = async (email: string): Promise<Subscriber> => {
    return apiRequest<Subscriber>('/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

export const submitContactForm = async (formData: { name: string, email: string, subject: string, message: string }): Promise<void> => {
    await apiRequest('/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
    });
};

export const getUploadUrl = async (fileName: string, fileType: string): Promise<{ uploadUrl: string, fileKey: string, fileUrl: string }> => {
    console.log('Requesting upload URL for:', { fileName, fileType });
    try {
        const response = await apiRequest<{ 
            uploadUrl: string, 
            fileKey: string, 
            fileUrl: string 
        }>('/upload-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                fileName, 
                fileType 
            }),
        });
        
        console.log('Received upload URL response:', response);
        return response;
    } catch (error) {
        console.error('Error in getUploadUrl:', {
            error,
            message: error.message,
            name: error.name,
            stack: error.stack,
            fileName,
            fileType
        });
        throw new Error(`Failed to get upload URL: ${error.message}`);
    }
};

export const uploadFileToS3 = async (file: File): Promise<string> => {
    console.log('Starting file upload process...');
    console.log('File details:', { name: file.name, type: file.type, size: file.size });
    
    try {
        console.log('Requesting pre-signed URL from backend...');
        const { uploadUrl, fileUrl } = await getUploadUrl(file.name, file.type);
        console.log('Received pre-signed URL:', { uploadUrl, fileUrl });
        
        console.log('Uploading file to S3...');
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
                'Cache-Control': 'max-age=31536000' // 1 year cache
            },
            // Important: Don't include CORS headers in the request to S3
            // The pre-signed URL already includes the necessary CORS headers
        });
        
        console.log('S3 upload response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('S3 upload failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`Failed to upload file to S3: ${response.status} ${response.statusText}`);
        }
        
        console.log('File uploaded successfully');
        return fileUrl;
    } catch (error) {
        console.error('Error in uploadFileToS3:', {
            error,
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        throw new Error(`Failed to upload file: ${error.message}`);
    }
};
