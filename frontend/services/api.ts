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

export const createUser = async (userData: Partial<User>): Promise<User> => {
    return apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
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
    author?: string;
    status?: ArticleStatus | 'published' | 'draft' | 'archived'; // Support both enum and string literals
    featured?: boolean;
    limit?: number | string;
    offset?: number | string;
    page?: number | string;
    pageSize?: number | string;
    sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
    sortOrder?: 'asc' | 'desc';
}

export const fetchArticles = async (params: FetchArticlesParams = {}): Promise<Article[]> => {
    try {
        const url = buildArticlesUrl(params);
        const response = await apiRequest<{ items: Article[], total: number, lastEvaluatedKey?: string, hasMore?: boolean }>(url);
        // Backend returns { items: Article[], total: number }, but we just need the items array
        return response.items || [];
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
    if (params.author) searchParams.append('author', params.author);
    
    // Handle status with fallback for different API expectations
    if (params.status) {
        const statusValue = params.status.toLowerCase();
        searchParams.append('status', statusValue);
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
    return apiRequest<Article | undefined>(`/articles/id/${id}`);
};

export const fetchArticleBySlug = async (slug: string): Promise<Article | undefined> => {
    return apiRequest<Article | undefined>(`/articles/slug/${slug}`);
};

export const createArticle = async (articleData: Partial<Article>): Promise<Article> => {
    return apiRequest<Article>('/articles', {
        method: 'POST',
        body: JSON.stringify(articleData),
    });
};

export const updateArticle = async (articleId: string, articleData: Partial<Article>): Promise<Article> => {
    return apiRequest<Article>(`/articles/${articleId}`, {
        method: 'PUT',
        body: JSON.stringify(articleData),
    });
};

export const deleteArticle = async (articleId: string): Promise<void> => {
    await apiRequest(`/articles/${articleId}`, { method: 'DELETE' });
};

export const updateArticleStatus = async (articleId: string, status: ArticleStatus, reason?: string): Promise<Article> => {
    return apiRequest<Article>(`/articles/${articleId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason }),
    });
};

export const updateFeaturedStatus = async (updates: { articleId: string, isFeatured: boolean }[]): Promise<void> => {
    await apiRequest('/articles/featured', {
        method: 'POST',
        body: JSON.stringify({ updates }),
    });
};

// --- CATEGORIES ---
export const fetchCategories = async (): Promise<Category[]> => {
    return apiRequest<Category[]>('/categories');
};

export const createCategory = async (catData: { name: string; slug: string }): Promise<Category> => {
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

export const getUploadUrl = async (fileName: string, fileType: string): Promise<{ uploadUrl: string, key: string }> => {
    return apiRequest<{ uploadUrl: string, key: string }>('/upload-url', {
        method: 'POST',
        body: JSON.stringify({ fileName, fileType }),
    });
};

export const uploadFileToS3 = async (file: File): Promise<string> => {
    // This is now a two-step process handled in the components:
    // 1. Get a presigned URL from our backend.
    // 2. PUT the file to that URL.
    // This helper is simplified as the logic is now more complex and component-specific.
    // We can simulate it here for any remaining simple cases, but it's better to refactor.
    console.log(`Uploading ${file.name} to S3...`);
    // In a real scenario, the component would handle this.
    // Returning a placeholder.
    return `https://vadali-media-assets-dev.s3.amazonaws.com/${file.name}`;
};
