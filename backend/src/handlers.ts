import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { users, articles, categories, notifications, subscribers } from './mockData';
import { Article, ArticleStatus, Category, Comment, Notification, Subscriber, User, UserRole } from './types';
import { comparePasswords, createAuthResponse } from './auth';
import { UserRepository } from './repositories/UserRepository';

const respond = (statusCode: number, body: any) => ({
    statusCode,
    headers: { 
        "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
});

const userRepository = new UserRepository();

// --- USER & AUTH ---
export const login: APIGatewayProxyHandlerV2 = async (event) => {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
        return respond(400, { message: 'Email and password are required' });
    }

    const trimmedEmail = String(email).trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const emailCandidates = Array.from(new Set([trimmedEmail, normalizedEmail]));

    try {
        for (const candidate of emailCandidates) {
            const dbUser = await userRepository.findByEmail(candidate);
            if (dbUser) {
                const passwordMatches = await comparePasswords(password, dbUser.password || '');
                if (passwordMatches) {
                    const authResponse = createAuthResponse(dbUser);
                    try {
                        await userRepository.updateRefreshToken(dbUser.id, authResponse.refreshToken);
                    } catch (updateError) {
                        console.error('Failed to persist refresh token for user', updateError);
                    }
                    return respond(200, authResponse);
                }
                break;
            }
        }
    } catch (repoError) {
        console.error('Login repository lookup failed, falling back to mock data', repoError);
    }

    const fallbackUser = users.find(u => u.email === trimmedEmail || u.email.toLowerCase() === normalizedEmail);
    if (fallbackUser) {
        const storedPassword = fallbackUser.password || '';
        let passwordMatches = false;

        if (storedPassword.startsWith("$2")) {
            passwordMatches = await comparePasswords(password, storedPassword);
        } else if (storedPassword.length > 0) {
            passwordMatches = storedPassword === password;
        }

        if (passwordMatches) {
            const authResponse = createAuthResponse(fallbackUser);
            fallbackUser.refreshToken = authResponse.refreshToken;
            return respond(200, authResponse);
        }
    }

    return respond(401, { message: 'Invalid email or password' });
};
export const register: APIGatewayProxyHandlerV2 = async (event) => {
    const { name, email } = JSON.parse(event.body || '{}');
    const isFirstUser = users.length === 0;
    const newUser: User = {
        id: `u${users.length + 1}`, name, email,
        role: isFirstUser ? UserRole.ADMIN : UserRole.AUTHOR,
        avatarUrl: `https://picsum.photos/seed/u${users.length + 1}/100/100`,
    };
    users.push(newUser);
    return respond(201, newUser);
};
export const getUsers: APIGatewayProxyHandlerV2 = async () => respond(200, users);
export const getUser: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    return respond(200, users.find(u => u.id === id));
};
export const createUser: APIGatewayProxyHandlerV2 = async (event) => {
    const userData = JSON.parse(event.body || '{}');
    const newUser: User = {
        id: `u${users.length + 1}`,
        name: userData.name || 'New User',
        email: userData.email || '',
        role: userData.role || UserRole.AUTHOR,
        avatarUrl: userData.avatarUrl || `https://picsum.photos/seed/u${users.length + 1}/100/100`,
    };
    users.push(newUser);
    return respond(201, newUser);
};
export const updateUser: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    const userData = JSON.parse(event.body || '{}');
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) return respond(404, { message: 'User not found' });
    users[userIndex] = { ...users[userIndex], ...userData };
    return respond(200, users[userIndex]);
};
export const deleteUser: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    // Fix: Cannot assign to 'users' because it is an import. Modify in-place instead.
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
        return respond(404, { message: 'User not found' });
    }
    users.splice(userIndex, 1);
    return respond(204, null);
};

// --- ARTICLES ---
export const getArticles: APIGatewayProxyHandlerV2 = async (event) => {
    const params = event.queryStringParameters || {};
    let results = [...articles];
    if (params) {
        if (params.categorySlug) {
            const category = categories.find(c => c.slug === params.categorySlug);
            if (category) results = results.filter(a => a.categoryId === category.id);
        }
        if (params.categoryId) results = results.filter(a => a.categoryId === params.categoryId);
        if (params.tag) results = results.filter(a => a.tags.map(t => t.toLowerCase()).includes(params.tag!.toLowerCase()));
        if (params.authorId) results = results.filter(a => a.authorId === params.authorId);
        if (params.query) {
            const q = params.query.toLowerCase();
            results = results.filter(a => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
        }
        if (params.status && params.status !== 'ALL') {
            results = results.filter(a => a.status === params.status);
        } else if (!params?.status || params.status !== 'ALL') {
             results = results.filter(a => a.status === ArticleStatus.PUBLISHED);
        }
        if (params.featured) results = results.filter(a => a.isFeatured === (params.featured === 'true'));
        if (params.isAdvertisement) results = results.filter(a => !!a.isAdvertisement === (params.isAdvertisement === 'true'));
        if (params.limit) results = results.slice(0, parseInt(params.limit, 10));
    } else {
        results = results.filter(a => a.status === ArticleStatus.PUBLISHED);
    }
    return respond(200, results);
};
export const getArticleById: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    return respond(200, articles.find(a => a.id === id));
};
export const getArticleBySlug: APIGatewayProxyHandlerV2 = async (event) => {
    const { slug } = event.pathParameters || {};
    return respond(200, articles.find(a => a.slug === slug));
};
export const createArticle: APIGatewayProxyHandlerV2 = async (event) => {
    const articleData = JSON.parse(event.body || '{}');
    const newArticle: Article = {
        id: `a${articles.length + 1}`,
        title: articleData.title || 'Untitled',
        slug: articleData.title?.toLowerCase().replace(/\s+/g, '-') || `a${articles.length + 1}`,
        summary: articleData.summary || '',
        content: articleData.content || '',
        coverImageUrl: articleData.coverImageUrl || 'https://picsum.photos/seed/new/800/400',
        authorId: articleData.authorId || '',
        categoryId: articleData.categoryId || '',
        tags: articleData.tags || [],
        status: articleData.status || ArticleStatus.DRAFT,
        publishedAt: null,
        views: 0,
        comments: [],
        ...articleData
    };
    articles.unshift(newArticle);
    return respond(201, newArticle);
};
export const updateArticle: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    const articleData = JSON.parse(event.body || '{}');
    const articleIndex = articles.findIndex(a => a.id === id);
    if (articleIndex === -1) return respond(404, { message: 'Article not found' });
    articles[articleIndex] = { ...articles[articleIndex], ...articleData };
    return respond(200, articles[articleIndex]);
};
export const deleteArticle: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    // Fix: Cannot assign to 'articles' because it is an import. Modify in-place instead.
    const articleIndex = articles.findIndex(a => a.id === id);
    if (articleIndex === -1) {
        return respond(404, { message: 'Article not found' });
    }
    articles.splice(articleIndex, 1);
    return respond(204, null);
};
export const updateArticleStatus: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    const { status, reason } = JSON.parse(event.body || '{}');
    const articleIndex = articles.findIndex(a => a.id === id);
    if (articleIndex === -1) return respond(404, { message: 'Article not found' });
    articles[articleIndex].status = status;
    if (status === ArticleStatus.REJECTED) articles[articleIndex].rejectionReason = reason;
    return respond(200, articles[articleIndex]);
};
export const updateFeaturedStatus: APIGatewayProxyHandlerV2 = async (event) => {
    const { updates } = JSON.parse(event.body || '{}');
    (updates || []).forEach((update: { articleId: string, isFeatured: boolean }) => {
        const articleIndex = articles.findIndex(a => a.id === update.articleId);
        if (articleIndex !== -1) articles[articleIndex].isFeatured = update.isFeatured;
    });
    return respond(204, null);
};

// --- CATEGORIES ---
export const getCategories: APIGatewayProxyHandlerV2 = async () => respond(200, categories);
export const createCategory: APIGatewayProxyHandlerV2 = async (event) => {
    const catData = JSON.parse(event.body || '{}');
    const newCategory: Category = { id: `c${categories.length + 1}`, ...catData };
    categories.push(newCategory);
    return respond(201, newCategory);
};
export const updateCategory: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    const catData = JSON.parse(event.body || '{}');
    const catIndex = categories.findIndex(c => c.id === id);
    if (catIndex === -1) return respond(404, { message: 'Category not found' });
    categories[catIndex] = { ...categories[catIndex], ...catData };
    return respond(200, categories[catIndex]);
};
export const deleteCategory: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    // Fix: Cannot assign to 'categories' because it is an import. Modify in-place instead.
    const catIndex = categories.findIndex(c => c.id === id);
    if (catIndex !== -1) {
        categories.splice(catIndex, 1);
    }
    return respond(204, null);
};

// --- COMMENTS ---
export const getPendingComments: APIGatewayProxyHandlerV2 = async () => {
    const pending: (Comment & { article: Article })[] = [];
    articles.forEach(article => {
        article.comments.forEach(comment => {
            if (comment.status === 'PENDING') pending.push({ ...comment, article });
        });
    });
    return respond(200, pending);
};
export const postComment: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    const { text } = JSON.parse(event.body || '{}');
    const articleIndex = articles.findIndex(a => a.id === id);
    if (articleIndex === -1) return respond(404, { message: 'Article not found' });
    const newComment: Comment = {
        id: `com${uuidv4()}`,
        authorName: 'Anonymous User', authorAvatarUrl: `https://picsum.photos/seed/${uuidv4()}/50/50`,
        text, date: new Date().toISOString(), status: 'PENDING',
    };
    articles[articleIndex].comments.push(newComment);
    return respond(201, newComment);
};
export const updateCommentStatus: APIGatewayProxyHandlerV2 = async (event) => {
    const { articleId, commentId } = event.pathParameters || {};
    const { status } = JSON.parse(event.body || '{}');
    const articleIndex = articles.findIndex(a => a.id === articleId);
    if (articleIndex === -1) return respond(404, { message: 'Article not found' });
    const commentIndex = articles[articleIndex].comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return respond(404, { message: 'Comment not found' });
    articles[articleIndex].comments[commentIndex].status = status;
    return respond(204, null);
};

// --- NOTIFICATIONS ---
export const getNotificationsForUser: APIGatewayProxyHandlerV2 = async (event) => {
    const { userId } = event.pathParameters || {};
    return respond(200, notifications.filter(n => n.userId === userId));
};

// --- TAGS ---
export const getAllTags: APIGatewayProxyHandlerV2 = async () => {
    const tagCounts = new Map<string, number>();
    articles.forEach(article => {
        article.tags.forEach(tag => {
            const lowerCaseTag = tag.toLowerCase();
            tagCounts.set(lowerCaseTag, (tagCounts.get(lowerCaseTag) || 0) + 1);
        });
    });
    const result = Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    return respond(200, result);
};

// --- MISC ---
export const getSubscribers: APIGatewayProxyHandlerV2 = async () => respond(200, subscribers);
export const subscribe: APIGatewayProxyHandlerV2 = async (event) => {
    const { email } = JSON.parse(event.body || '{}');
    const newSubscriber: Subscriber = {
        id: `sub${subscribers.length + 1}`, email,
        subscribedAt: new Date().toISOString(),
    };
    subscribers.push(newSubscriber);
    return respond(201, newSubscriber);
};
export const contact: APIGatewayProxyHandlerV2 = async (event) => {
    console.log('Contact form submitted (mock):', JSON.parse(event.body || '{}'));
    return respond(204, null);
};

