import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { Article, ArticleStatus, Category, Comment, Notification, Subscriber, User, UserRole } from './types';
import { comparePasswords, createAuthResponse } from './auth';
import { generateUploadUrl } from './utils/s3';
import { UserRepository } from './repositories/UserRepository';
import { ArticleRepository } from './repositories/ArticleRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { CommentRepository } from './repositories/CommentRepository';
import { NotificationRepository } from './repositories/NotificationRepository';
import { SubscriberRepository } from './repositories/SubscriberRepository';

const respond = (statusCode: number, body: any) => ({
    statusCode,
    headers: { 
        "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
});

import bcrypt from 'bcryptjs';

const slugify = (value: string) => {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
};

// Initialize repositories
const userRepository = new UserRepository();
const articleRepository = new ArticleRepository();
const categoryRepository = new CategoryRepository();
const commentRepository = new CommentRepository();
const notificationRepository = new NotificationRepository();
const subscriberRepository = new SubscriberRepository();

// --- USER & AUTH ---
export const login: APIGatewayProxyHandlerV2 = async (event) => {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
        return respond(400, { message: 'Email and password are required' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    try {
        const user = await userRepository.findByEmail(trimmedEmail);
        if (user) {
            if (!user.password) {
                return respond(401, { message: 'Invalid login credentials' });
            }
            
            const passwordMatches = await comparePasswords(password, user.password);
            if (passwordMatches) {
                const authResponse = createAuthResponse(user);
                try {
                    await userRepository.updateRefreshToken(user.id, authResponse.refreshToken);
                } catch (updateError) {
                    console.error('Failed to persist refresh token for user', updateError);
                }
                return respond(200, authResponse);
            }
        }
        return respond(401, { message: 'Invalid email or password' });
    } catch (error) {
        console.error('Login error:', error);
        return respond(500, { message: 'An error occurred during login' });
    }
};

export const getUsers: APIGatewayProxyHandlerV2 = async () => {
    try {
        const users = await userRepository.findAll();
        // Remove password hashes from response
        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        return respond(200, usersWithoutPasswords);
    } catch (error) {
        console.error('Error fetching users:', error);
        return respond(500, { message: 'Failed to fetch users' });
    }
};

export const getUser: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const userId = event.pathParameters?.userId ?? event.pathParameters?.id;
        if (!userId) {
            return respond(400, { message: 'User ID is required' });
        }
        
        const user = await userRepository.findById(userId);
        if (!user) {
            return respond(404, { message: 'User not found' });
        }
        
        // Don't return password hash
        const { password, ...userWithoutPassword } = user;
        return respond(200, userWithoutPassword);
    } catch (error) {
        console.error('Error fetching user:', error);
        return respond(500, { message: 'Failed to fetch user' });
    }
};

export const createUser: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const userData = JSON.parse(event.body || '{}');
        
        if (!userData.name || !userData.email) {
            return respond(400, { message: 'Name and email are required' });
        }

        // Check if user with email already exists
        const existingUser = await userRepository.findByEmail(userData.email);
        if (existingUser) {
            return respond(409, { message: 'User with this email already exists' });
        }

        const providedPassword = typeof userData.password === 'string' && userData.password.trim().length > 0;
        const plainTextPassword = providedPassword 
            ? userData.password.trim()
            : uuidv4().substring(0, 8); // 8-char temporary password

        userData.password = await bcrypt.hash(plainTextPassword, 10);

        const newUser = await userRepository.createUser({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role || UserRole.AUTHOR,
            avatarUrl: userData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}`,
            bio: userData.bio || '',
        });

        // Don't return password hash
        const { password, ...userWithoutPassword } = newUser;

        // Return the user, and the temporary password if it was generated
        const response: any = { ...userWithoutPassword };
        if (!providedPassword) {
            response.temporaryPassword = plainTextPassword;
        }

        return respond(201, response);
    } catch (error) {
        console.error('Error creating user:', error);
        return respond(500, { message: 'Failed to create user' });
    }
};

export const updateUser: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    if (!id) return respond(400, { message: 'User ID is required' });
    
    const userData = JSON.parse(event.body || '{}');
    
    try {
        // Check if user exists
        const existingUser = await userRepository.findById(id);
        if (!existingUser) {
            return respond(404, { message: 'User not found' });
        }
        
        // Don't allow updating email to an existing one
        if (userData.email && userData.email !== existingUser.email) {
            const emailUser = await userRepository.findByEmail(userData.email);
            if (emailUser && emailUser.id !== id) {
                return respond(400, { message: 'Email already in use' });
            }
        }
        
        // Hash password if it's being updated
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }
        
        const updatedUser = await userRepository.update(id, userData);
        return respond(200, updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return respond(500, { message: 'Failed to update user' });
    }
};

export const deleteUser: APIGatewayProxyHandlerV2 = async (event) => {
    const { id } = event.pathParameters || {};
    if (!id) return respond(400, { message: 'User ID is required' });
    
    try {
        // Check if user exists
        const user = await userRepository.findById(id);
        if (!user) {
            return respond(404, { message: 'User not found' });
        }
        
        // Prevent deleting the last admin
        if (user.role === UserRole.ADMIN) {
            const admins = (await userRepository.findAll()).filter(u => u.role === UserRole.ADMIN);
            if (admins.length <= 1) {
                return respond(400, { message: 'Cannot delete the last admin' });
            }
        }
        
        await userRepository.delete(id);
        return respond(200, { message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return respond(500, { message: 'Failed to delete user' });
    }
};

export const register: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { name, email, password } = JSON.parse(event.body || '{}');
        
        if (!name || !email || !password) {
            return respond(400, { message: 'Name, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            return respond(409, { message: 'User with this email already exists' });
        }

        // Check if this is the first user (make them admin)
        const isFirstUser = (await userRepository.findAll()).length === 0;
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = await userRepository.createUser({
            name,
            email,
            password: hashedPassword,
            role: isFirstUser ? UserRole.ADMIN : UserRole.AUTHOR,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
            bio: '',
        });

        // Don't return password hash
        const { password: _, ...userWithoutPassword } = newUser;
        return respond(201, userWithoutPassword);
    } catch (error) {
        console.error('Registration error:', error);
        return respond(500, { message: 'Failed to register user' });
    }
};

export const createArticle: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const payload = JSON.parse(event.body || '{}');

        const title = typeof payload.title === 'string' ? payload.title.trim() : '';
        const summary = typeof payload.summary === 'string' ? payload.summary.trim() : '';
        const content = typeof payload.content === 'string' ? payload.content.trim() : '';
        const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
        const authorId = typeof payload.authorId === 'string' ? payload.authorId.trim() : '';

        if (!title || !summary || !content || !categoryId || !authorId) {
            return respond(400, { message: 'title, summary, content, categoryId, and authorId are required' });
        }

        const tags: string[] = Array.isArray(payload.tags)
            ? payload.tags
                .map((tag: unknown) => (typeof tag === 'string' ? tag.trim() : ''))
                .filter((tag: string) => tag.length > 0)
            : [];

        const allowedStatuses = Object.values(ArticleStatus) as string[];
        const defaultStatus = ArticleStatus.PENDING_REVIEW;
        const status = typeof payload.status === 'string' && allowedStatuses.includes(payload.status)
            ? payload.status as ArticleStatus
            : defaultStatus;

        const [author, category] = await Promise.all([
            userRepository.findById(authorId),
            categoryRepository.getById(categoryId)
        ]);

        if (!author) {
            return respond(404, { message: 'Author not found' });
        }

        if (!category) {
            return respond(404, { message: 'Category not found' });
        }

        const preferredSlugSource = typeof payload.slug === 'string' && payload.slug.trim().length > 0
            ? payload.slug
            : title;
        let baseSlug = slugify(preferredSlugSource);
        if (!baseSlug) {
            baseSlug = slugify(`article-${uuidv4()}`);
        }

        let slug = baseSlug;
        let suffix = 1;
        // Ensure slug uniqueness
        while (await articleRepository.findBySlug(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }

        const coverImageUrl = typeof payload.coverImageUrl === 'string'
            ? payload.coverImageUrl.trim()
            : '';

        const publishedAt = status === ArticleStatus.PUBLISHED
            ? (typeof payload.publishedAt === 'string' && payload.publishedAt.trim().length > 0
                ? payload.publishedAt
                : new Date().toISOString())
            : null;

        const isAdvertisement = typeof payload.isAdvertisement === 'boolean'
            ? payload.isAdvertisement
            : false;

        const isFeatured = typeof payload.isFeatured === 'boolean'
            ? payload.isFeatured
            : false;

        const article = await articleRepository.createArticle({
            title,
            slug,
            summary,
            content,
            coverImageUrl,
            authorId,
            categoryId,
            tags,
            status,
            publishedAt,
            videoUrl: typeof payload.videoUrl === 'string' && payload.videoUrl.trim().length > 0
                ? payload.videoUrl.trim()
                : undefined,
            isAdvertisement,
            isFeatured,
            rejectionReason: status === ArticleStatus.REJECTED && typeof payload.rejectionReason === 'string'
                ? payload.rejectionReason.trim()
                : undefined,
        });

        return respond(201, article);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error creating article:', {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });
        return respond(500, { message: 'Failed to create article', error: errorMessage });
    }
};

export const getArticles: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const rawStatusParam = event.queryStringParameters?.status;
        const categoryId = event.queryStringParameters?.categoryId;
        const tag = event.queryStringParameters?.tag;
        const authorId = event.queryStringParameters?.authorId;
        const searchQuery = event.queryStringParameters?.query?.toLowerCase();
        const isFeatured = event.queryStringParameters?.featured === 'true';
        const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 10;
        const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey;

        // Build filter expressions
        const filterExpressions: string[] = [];
        const expressionAttributeValues: Record<string, any> = {};
        const expressionAttributeNames: Record<string, string> = {};

        const resolveStatusFilter = (statusParam?: string): { values: string[]; applyFilter: boolean } => {
            if (!statusParam || statusParam.trim().length === 0) {
                return { values: [ArticleStatus.PUBLISHED], applyFilter: true };
            }

            const cleaned = statusParam.trim().toLowerCase();

            if (cleaned === 'all') {
                return { values: [], applyFilter: false };
            }

            const normalized = cleaned.replace(/[\s_-]+/g, ' ');
            const pendingValues = [
                ArticleStatus.PENDING_REVIEW,
                'Pending Review',
                'pending review',
                'PENDING_REVIEW',
                'Submitted',
                'submitted',
                'SUBMITTED',
                'Pending',
                'pending',
                'PENDING',
            ];

            switch (normalized) {
                case 'draft':
                case 'drafts':
                    return {
                        values: Array.from(new Set([ArticleStatus.DRAFT, 'Draft', 'draft', 'DRAFT'])),
                        applyFilter: true,
                    };
                case 'pending review':
                case 'pending':
                case 'submitted':
                case 'awaiting review':
                    return { values: Array.from(new Set(pendingValues)), applyFilter: true };
                case 'published':
                case 'approved':
                case 'live':
                    return {
                        values: Array.from(
                            new Set([
                                ArticleStatus.PUBLISHED,
                                'Published',
                                'published',
                                'PUBLISHED',
                                'Approved',
                                'approved',
                                'APPROVED',
                            ])
                        ),
                        applyFilter: true,
                    };
                case 'rejected':
                case 'declined':
                case 'denied':
                    return {
                        values: Array.from(new Set([ArticleStatus.REJECTED, 'Rejected', 'rejected', 'REJECTED'])),
                        applyFilter: true,
                    };
                default: {
                    const enumMatch = (Object.values(ArticleStatus) as string[]).find(
                        (status) => status.toLowerCase() === normalized
                    );
                    if (enumMatch) {
                        return resolveStatusFilter(enumMatch);
                    }
                    // Fallback to published behaviour to avoid leaking unpublished content
                    return {
                        values: Array.from(new Set([ArticleStatus.PUBLISHED, 'Published', 'published', 'PUBLISHED'])),
                        applyFilter: true,
                    };
                }
            }
        };

        const { values: resolvedStatuses, applyFilter: shouldFilterByStatus } = resolveStatusFilter(rawStatusParam);

        if (shouldFilterByStatus && resolvedStatuses.length > 0) {
            expressionAttributeNames['#status'] = 'status';

            const dedupedStatuses = Array.from(new Set(resolvedStatuses));
            if (dedupedStatuses.length === 1) {
                filterExpressions.push('#status = :status0');
                expressionAttributeValues[':status0'] = dedupedStatuses[0];
            } else {
                const placeholders = dedupedStatuses.map((_, index) => `:status${index}`);
                filterExpressions.push(`#status IN (${placeholders.join(', ')})`);
                dedupedStatuses.forEach((statusValue, index) => {
                    expressionAttributeValues[`:status${index}`] = statusValue;
                });
            }
        }
        
        if (categoryId) {
            filterExpressions.push('categoryId = :categoryId');
            expressionAttributeValues[':categoryId'] = categoryId;
        }
        
        if (isFeatured) {
            filterExpressions.push('isFeatured = :isFeatured');
            expressionAttributeValues[':isFeatured'] = true;
        }
        
        if (authorId) {
            filterExpressions.push('authorId = :authorId');
            expressionAttributeValues[':authorId'] = authorId;
        }

        if (tag) {
            filterExpressions.push('contains(tags, :tag)');
            expressionAttributeValues[':tag'] = tag;
        }

        // Get articles with pagination
        const { items, lastEvaluatedKey: newLastEvaluatedKey } = await articleRepository.scan({
            filterExpression: filterExpressions.join(' AND '),
            expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
            expressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined,
            limit,
            lastEvaluatedKey: lastEvaluatedKey ? JSON.parse(decodeURIComponent(lastEvaluatedKey)) : undefined
        });

        // Apply search query filter if provided
        let filteredItems = items;
        if (searchQuery) {
            filteredItems = items.filter(article => 
                article.title.toLowerCase().includes(searchQuery) || 
                (article.summary?.toLowerCase() || '').includes(searchQuery) ||
                (article.content?.toLowerCase() || '').includes(searchQuery)
            );
        }

        const response: any = {
            items: filteredItems,
            total: filteredItems.length, // Note: This is just the count of the current page
        };

        if (newLastEvaluatedKey) {
            response.lastEvaluatedKey = encodeURIComponent(JSON.stringify(newLastEvaluatedKey));
            response.hasMore = true;
        }

        return respond(200, response);
    } catch (error) {
        console.error('Error fetching articles:', error);
        return respond(500, { message: 'Failed to fetch articles' });
    }
};
export const getArticleById: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { id } = event.pathParameters || {};
        if (!id) return respond(400, { message: 'Article ID is required' });
        
        const article = await articleRepository.getById(id);
        if (!article) return respond(404, { message: 'Article not found' });
        
        return respond(200, article);
    } catch (error) {
        console.error('Error getting article by ID:', error);
        return respond(500, { message: 'Internal server error' });
    }
};

export const getArticleBySlug: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { slug } = event.pathParameters || {};
        if (!slug) return respond(400, { message: 'Article slug is required' });
        
        const article = await articleRepository.findBySlug(slug);
        if (!article) return respond(404, { message: 'Article not found' });
        
        return respond(200, article);
    } catch (error) {
        console.error('Error getting article by slug:', error);
        return respond(500, { message: 'Internal server error' });
    }
};


export const updateArticle: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { id } = event.pathParameters || {};
        if (!id) return respond(400, { message: 'Article ID is required' });
        
        const articleData = JSON.parse(event.body || '{}');
        const updates = {
            ...articleData,
            updatedAt: new Date().toISOString()
        };
        
        const updatedArticle = await articleRepository.update(id, updates);
        if (!updatedArticle) return respond(404, { message: 'Article not found' });
        
        return respond(200, updatedArticle);
    } catch (error) {
        console.error('Error updating article:', error);
        return respond(500, { message: 'Failed to update article' });
    }
};

export const deleteArticle: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { id } = event.pathParameters || {};
        if (!id) {
            return respond(400, { message: 'Article ID is required' });
        }

        const existingArticle = await articleRepository.getById(id);
        if (!existingArticle) {
            return respond(404, { message: 'Article not found' });
        }

        const deleted = await articleRepository.delete(id);
        if (!deleted) {
            return respond(500, { message: 'Failed to delete article' });
        }

        const cleanupWarnings: string[] = [];

        await Promise.all([
            (async () => {
                try {
                    const relatedComments = await commentRepository.scan({
                        filterExpression: 'articleId = :articleId',
                        expressionAttributeValues: { ':articleId': id }
                    });

                    if (relatedComments.items.length > 0) {
                        await Promise.allSettled(
                            relatedComments.items.map((comment) => commentRepository.delete(comment.id))
                        );
                    }
                } catch (error) {
                    console.warn('Failed to clean up comments for deleted article', { articleId: id, error });
                    cleanupWarnings.push('Comments cleanup failed');
                }
            })(),
            (async () => {
                try {
                    const relatedNotifications = await notificationRepository.scan({
                        filterExpression: 'articleId = :articleId',
                        expressionAttributeValues: { ':articleId': id }
                    });

                    if (relatedNotifications.items.length > 0) {
                        await Promise.allSettled(
                            relatedNotifications.items.map((notification) => notificationRepository.delete(notification.id))
                        );
                    }
                } catch (error) {
                    console.warn('Failed to clean up notifications for deleted article', { articleId: id, error });
                    cleanupWarnings.push('Notifications cleanup failed');
                }
            })()
        ]);

        return respond(200, {
            message: 'Article deleted successfully',
            ...(cleanupWarnings.length > 0 ? { warnings: cleanupWarnings } : {})
        });
    } catch (error) {
        console.error('Error deleting article:', error);
        return respond(500, { message: 'Failed to delete article' });
    }
};

export const updateArticleStatus: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { id } = event.pathParameters || {};
        if (!id) return respond(400, { message: 'Article ID is required' });
        
        const { status, reason } = JSON.parse(event.body || '{}');
        
        const updates: Partial<Article> = {
            status,
            updatedAt: new Date().toISOString()
        };
        
        if (status === ArticleStatus.REJECTED) {
            const { items: recentArticles } = await articleRepository.scan({
                filterExpression: '#status = :status',
                expressionAttributeNames: { '#status': 'status' },
                expressionAttributeValues: { ':status': 'PUBLISHED' },
                limit: 5
            });
            
            // Sort by publishedAt date
            recentArticles.sort((a, b) => {
                const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
                const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
                return dateB - dateA;
            });
        }
        
        const updatedArticle = await articleRepository.update(id, updates);
        if (!updatedArticle) return respond(404, { message: 'Article not found' });
        
        return respond(200, updatedArticle);
    } catch (error) {
        console.error('Error updating article status:', error);
        return respond(500, { message: 'Failed to update article status' });
    }
};

export const updateFeaturedStatus: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { updates } = JSON.parse(event.body || '{}');
        if (!updates || !Array.isArray(updates)) {
            return respond(400, { message: 'Invalid update format' });
        }

        await Promise.all(updates.map(async (update: { articleId: string, isFeatured: boolean }) => {
            await articleRepository.update(update.articleId, { isFeatured: update.isFeatured });
        }));

        return respond(204, null);
    } catch (error) {
        console.error('Error updating featured status:', error);
        return respond(500, { message: 'Failed to update featured status' });
    }
};

// --- CATEGORIES ---
export const getCategories: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { items } = await categoryRepository.scan({});
        const showInHeaderParam = event.queryStringParameters?.showInHeader;

        const normalizedParam = typeof showInHeaderParam === 'string'
            ? showInHeaderParam.trim().toLowerCase()
            : undefined;

        const filterValue = normalizedParam === 'true'
            ? true
            : normalizedParam === 'false'
                ? false
                : undefined;

        const categories = filterValue === undefined
            ? items
            : items.filter(category => (category.showInHeader ?? true) === filterValue);

        return respond(200, categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return respond(500, { message: 'Failed to fetch categories' });
    }
};

export const createCategory: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const payload = JSON.parse(event.body || '{}');
        const rawName = typeof payload.name === 'string' ? payload.name.trim() : '';
        const rawSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
        const description = typeof payload.description === 'string'
            ? payload.description.trim()
            : undefined;
        let showInHeader = true;

        if (typeof payload.showInHeader === 'boolean') {
            showInHeader = payload.showInHeader;
        } else if (typeof payload.showInHeader === 'string') {
            const normalized = payload.showInHeader.trim().toLowerCase();
            if (normalized === 'true') {
                showInHeader = true;
            } else if (normalized === 'false') {
                showInHeader = false;
            }
        }

        if (!rawName || !rawSlug) {
            return respond(400, { message: 'Category name and slug are required' });
        }

        const name = rawName;
        const slug = rawSlug.toLowerCase();

        const [existingByName, existingBySlug] = await Promise.all([
            categoryRepository.findByName(name),
            categoryRepository.findBySlug(slug),
        ]);

        if (existingByName) {
            return respond(409, { message: 'A category with this name already exists' });
        }

        if (existingBySlug) {
            return respond(409, { message: 'A category with this slug already exists' });
        }

        const timestamp = new Date().toISOString();
        const newCategory: Category = {
            id: uuidv4(),
            name,
            slug,
            description,
            showInHeader,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        await categoryRepository.create(newCategory);
        return respond(201, newCategory);
    } catch (error) {
        console.error('Error creating category:', error);
        return respond(500, { message: 'Failed to create category' });
    }
};

export const updateCategory: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { id } = event.pathParameters || {};
        if (!id) {
            return respond(400, { message: 'Category ID is required' });
        }

        const existingCategory = await categoryRepository.getById(id);
        if (!existingCategory) {
            return respond(404, { message: 'Category not found' });
        }

        const payload = JSON.parse(event.body || '{}');
        const updates: Partial<Category> = {};

        if (typeof payload.name === 'string') {
            const trimmedName = payload.name.trim();
            if (!trimmedName) {
                return respond(400, { message: 'Category name cannot be empty' });
            }

            if (trimmedName !== existingCategory.name) {
                const byName = await categoryRepository.findByName(trimmedName);
                if (byName && byName.id !== id) {
                    return respond(409, { message: 'A category with this name already exists' });
                }
            }
            updates.name = trimmedName;
        }

        if (typeof payload.slug === 'string') {
            const trimmedSlug = payload.slug.trim().toLowerCase();
            if (!trimmedSlug) {
                return respond(400, { message: 'Category slug cannot be empty' });
            }

            if (trimmedSlug !== existingCategory.slug) {
                const bySlug = await categoryRepository.findBySlug(trimmedSlug);
                if (bySlug && bySlug.id !== id) {
                    return respond(409, { message: 'A category with this slug already exists' });
                }
            }
            updates.slug = trimmedSlug;
        }

        if (typeof payload.description === 'string') {
            updates.description = payload.description.trim();
        }

        if (typeof payload.showInHeader === 'boolean') {
            updates.showInHeader = payload.showInHeader;
        } else if (typeof payload.showInHeader === 'string') {
            const normalized = payload.showInHeader.trim().toLowerCase();
            if (normalized === 'true') {
                updates.showInHeader = true;
            } else if (normalized === 'false') {
                updates.showInHeader = false;
            }
        }

        if (Object.keys(updates).length === 0) {
            return respond(400, { message: 'No valid category fields provided for update' });
        }

        const updatedCategory = await categoryRepository.update(id, updates);
        if (!updatedCategory) {
            return respond(404, { message: 'Category not found' });
        }

        return respond(200, updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        return respond(500, { message: 'Failed to update category' });
    }
};

export const deleteCategory: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { id } = event.pathParameters || {};
        if (!id) {
            return respond(400, { message: 'Category ID is required' });
        }

        const category = await categoryRepository.getById(id);
        if (!category) {
            return respond(404, { message: 'Category not found' });
        }

        const { items: linkedArticles } = await articleRepository.scan({
            filterExpression: 'categoryId = :categoryId',
            expressionAttributeValues: { ':categoryId': id },
            limit: 1,
        });

        if (linkedArticles.length > 0) {
            return respond(400, { message: 'Category is in use by existing articles and cannot be deleted' });
        }

        const deleted = await categoryRepository.delete(id);
        if (!deleted) {
            return respond(500, { message: 'Failed to delete category' });
        }

        return respond(204, null);
    } catch (error) {
        console.error('Error deleting category:', error);
        return respond(500, { message: 'Failed to delete category' });
    }
};

// --- NOTIFICATIONS ---
export const getNotificationsForUser: APIGatewayProxyHandlerV2 = async (event) => {
    const { userId } = event.pathParameters || {};
    const { items: userNotifications } = await notificationRepository.scan({
        filterExpression: 'userId = :userId',
        expressionAttributeValues: { ':userId': userId }
    });
    
    // Sort by timestamp
    userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return respond(200, userNotifications);
};

// --- TAGS ---
export const getAllTags: APIGatewayProxyHandlerV2 = async () => {
    const tagCounts = new Map<string, number>();
    const { items: articles } = await articleRepository.scan({});
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
export const getSubscribers: APIGatewayProxyHandlerV2 = async () => {
    try {
        const { items: subscribers } = await subscriberRepository.scan({
            filterExpression: 'isActive = :isActive',
            expressionAttributeValues: { ':isActive': true }
        });
        return respond(200, subscribers);
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        return respond(500, { message: 'Failed to fetch subscribers' });
    }
};

export const subscribe: APIGatewayProxyHandlerV2 = async (event) => {
    const { email } = JSON.parse(event.body || '{}');
    const now = new Date().toISOString();
    const { items: [existingSubscriber] } = await subscriberRepository.scan({
        filterExpression: 'email = :email',
        expressionAttributeValues: { ':email': email },
        limit: 1
    });
    
    if (existingSubscriber) {
        return respond(409, { message: 'Subscriber already exists' });
    }
    
    const newSubscriber: Subscriber = {
        id: `s${Date.now()}`,
        email: email,
        isActive: true,
        subscribedAt: now,
        createdAt: now,
        updatedAt: now,
    };
    await subscriberRepository.create(newSubscriber);
    return respond(201, newSubscriber);
};
export const contact: APIGatewayProxyHandlerV2 = async (event) => {
    console.log('Contact form submitted (mock):', JSON.parse(event.body || '{}'));
    return respond(204, null);
};

export const getUploadUrl: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { fileName, fileType } = JSON.parse(event.body || '{}');
        
        if (!fileName || !fileType) {
            return respond(400, { message: 'fileName and fileType are required' });
        }

        const { uploadUrl, fileKey, fileUrl } = await generateUploadUrl(fileName, fileType);
        
        return respond(200, {
            uploadUrl,
            fileKey,
            fileUrl
        });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        return respond(500, { message: 'Error generating upload URL' });
    }
};
