import { User, Category, Article, Notification, Subscriber, UserRole, ArticleStatus, Comment } from '../types';

// =================================================================
// THIS IS THE LIVE API LAYER. IT MAKES REQUESTS TO THE BACKEND.
// =================================================================

const API_BASE = 'https://9zogdsw6a4.execute-api.us-east-1.amazonaws.com'; // From your curl command

const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
    }
    return response.json();
};


// --- USER & AUTH ---
export const apiLogin = async (email: string): Promise<User | null> => {
  return apiRequest<User | null>('/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
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
export const fetchArticles = async (params?: { 
    categorySlug?: string; 
    categoryId?: string;
    tag?: string; 
    authorId?: string; 
    query?: string;
    status?: ArticleStatus | 'ALL'; 
    featured?: boolean;
    isAdvertisement?: boolean;
    limit?: number;
}): Promise<Article[]> => {
    const queryParams = new URLSearchParams();
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, String(value));
            }
        });
    }
    return apiRequest<Article[]>(`/articles?${queryParams.toString()}`);
};

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