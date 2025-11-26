import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { Article, ArticleStatus, Category, Comment, Notification, Subscriber, User, UserRole } from './types';
import { comparePasswords, createAuthResponse, generateRefreshToken, generateToken } from './auth';
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

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const toPlainText = (html: string | undefined, fallback: string): string => {
    if (!html) return fallback;
    const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return stripped || fallback;
};

const getSiteOrigin = (): string => {
    const origin =
        process.env.SHARE_SITE_ORIGIN ||
        process.env.FRONTEND_ORIGIN ||
        process.env.ALLOWED_ORIGIN ||
        'https://vadalimedia.lk';

    return origin.replace(/\/+$/, '');
};

const toAbsoluteUrl = (value: string | undefined, siteOrigin: string): string => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('//')) return `https:${value}`;
    if (value.startsWith('/')) return `${siteOrigin}${value}`;
    return `${siteOrigin}/${value}`;
};

// Initialize repositories
const userRepository = new UserRepository();
const articleRepository = new ArticleRepository();
const categoryRepository = new CategoryRepository();
const commentRepository = new CommentRepository();
const notificationRepository = new NotificationRepository();
const subscriberRepository = new SubscriberRepository();

const normalizeParentCategoryId = (input: unknown): { provided: boolean; value: string | null } => {
    if (input === undefined) {
        return { provided: false, value: null };
    }

    if (input === null) {
        return { provided: true, value: null };
    }

    if (typeof input === 'string') {
        const trimmed = input.trim();
        return { provided: true, value: trimmed.length ? trimmed : null };
    }

    return { provided: false, value: null };
};

const buildCategoryLookup = (categories: Category[]): Record<string, Category> =>
    categories.reduce<Record<string, Category>>((acc, category) => {
        acc[category.id] = category;
        return acc;
    }, {});

const createsCycle = (candidateParentId: string, categoryId: string, lookup: Record<string, Category>): boolean => {
    let currentParentId: string | null | undefined = candidateParentId;

    while (currentParentId) {
        if (currentParentId === categoryId) {
            return true;
        }
        currentParentId = lookup[currentParentId]?.parentCategoryId ?? null;
    }

    return false;
};

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

export const refreshToken: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { refreshToken: providedRefreshToken } = JSON.parse(event.body || '{}');
        if (!providedRefreshToken) {
            return respond(400, { message: 'Refresh token is required' });
        }

        const user = await userRepository.findByRefreshToken(providedRefreshToken);
        if (!user) {
            return respond(401, { message: 'Invalid refresh token' });
        }

        // Rotate refresh token
        const newRefreshToken = generateRefreshToken();
        const newAccessToken = generateToken(user.id, user.email, user.role);

        await userRepository.updateRefreshToken(user.id, newRefreshToken);

        return respond(200, {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name || '',
                avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}`,
            },
            token: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        return respond(500, { message: 'Failed to refresh token' });
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

        const imageUrls: string[] = Array.isArray(payload.imageUrls)
            ? payload.imageUrls
                .map((url: unknown) => (typeof url === 'string' ? url.trim() : ''))
                .filter((url: string) => url.length > 0)
            : [];

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
            imageUrls,
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
        const queryParams = event.queryStringParameters ?? {};
        const rawStatusParam = queryParams.status;
        const categoryId = queryParams.categoryId;
        const tag = queryParams.tag;
        const authorId = queryParams.authorId;
        const searchQuery = queryParams.query?.toLowerCase();
        const isFeatured = queryParams.featured === 'true';
        const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 10;
        const lastEvaluatedKey = queryParams.lastEvaluatedKey;
        const hasIsAdvertisementParam = Object.prototype.hasOwnProperty.call(queryParams, 'isAdvertisement');
        const rawIsAdvertisement = queryParams.isAdvertisement;

        const parseBooleanQueryParam = (value: string | undefined): boolean => {
            if (!value) {
                return true;
            }
            const normalized = value.trim().toLowerCase();
            const falseValues = new Set(['false', '0', 'no', 'off']);
            return !falseValues.has(normalized);
        };

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

        if (hasIsAdvertisementParam) {
            filterExpressions.push('isAdvertisement = :isAdvertisement');
            expressionAttributeValues[':isAdvertisement'] = parseBooleanQueryParam(rawIsAdvertisement);
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

export const getArticleSharePreview: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const slug = event.pathParameters?.slug;
        if (!slug) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: '<!doctype html><html><body>Missing slug</body></html>',
            };
        }

        const article = await articleRepository.findBySlug(slug);

        if (!article || article.status !== ArticleStatus.PUBLISHED) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: '<!doctype html><html><body>Article not found</body></html>',
            };
        }

        const siteOrigin = getSiteOrigin();
        const articleUrl = `${siteOrigin}/article/${article.slug}`;
        const shareUrl = `${siteOrigin}/share/article/${article.slug}`;
        const previewImage = toAbsoluteUrl(article.coverImageUrl || article.imageUrls?.[0], siteOrigin);
        const descriptionSource = article.summary || toPlainText(article.content, article.title);
        const description = descriptionSource.slice(0, 240);
        const userAgent = event.headers?.['user-agent'] || event.headers?.['User-Agent'] || '';
        const isCrawler = /facebookexternalhit|facebot|slackbot|twitterbot|whatsapp|LinkedInBot|crawler|bot/i.test(userAgent);
        // Keep OG tags static; only redirect humans so crawlers don't miss meta tags.
        const metaRefresh = isCrawler ? '' : `<meta http-equiv="refresh" content="0;url=${escapeHtml(articleUrl)}" />`;
        const scriptRedirect = isCrawler ? '' : `  <script>
    try { window.location.replace("${escapeHtml(articleUrl)}"); } catch (e) {}
  </script>`;

        const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(article.title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(shareUrl)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(article.title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  ${previewImage ? `<meta property="og:image" content="${escapeHtml(previewImage)}" />` : ''}
  ${previewImage ? `<meta property="og:image:secure_url" content="${escapeHtml(previewImage)}" />` : ''}
  <meta property="og:site_name" content="Vadali Media" />
  <meta name="twitter:card" content="${previewImage ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${escapeHtml(article.title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${previewImage ? `<meta name="twitter:image" content="${escapeHtml(previewImage)}" />` : ''}
  ${metaRefresh}
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; color: #111; }
    .container { max-width: 640px; margin: 0 auto; text-align: center; }
    a { color: #1a237e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Continue to article</h1>
    <p><a href="${escapeHtml(articleUrl)}">Open the full article</a></p>
  </div>
  ${scriptRedirect}
</body>
</html>`;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=300',
            },
            body: html,
        };
    } catch (error) {
        console.error('Error generating share preview:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: '<!doctype html><html><body>Failed to generate share preview</body></html>',
        };
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
        const { provided: parentProvided, value: normalizedParentValue } = normalizeParentCategoryId(payload.parentCategoryId);

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

        if (normalizedParentValue) {
            const parentCategory = await categoryRepository.getById(normalizedParentValue);
            if (!parentCategory) {
                return respond(400, { message: 'Parent category not found' });
            }
        }

        const timestamp = new Date().toISOString();
        const newCategory: Category = {
            id: uuidv4(),
            name,
            slug,
            description,
            showInHeader,
            ...(parentProvided ? { parentCategoryId: normalizedParentValue ?? null } : { parentCategoryId: null }),
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

        const parentNormalization = normalizeParentCategoryId(payload.parentCategoryId);
        if (parentNormalization.provided) {
            const desiredParentId = parentNormalization.value;

            if (desiredParentId === existingCategory.id) {
                return respond(400, { message: 'Category cannot be its own parent' });
            }

            if (desiredParentId) {
                const parentCategory = await categoryRepository.getById(desiredParentId);
                if (!parentCategory) {
                    return respond(400, { message: 'Parent category not found' });
                }

                const { items: allCategories } = await categoryRepository.scan();
                const lookup = buildCategoryLookup(allCategories);

                if (createsCycle(desiredParentId, existingCategory.id, lookup)) {
                    return respond(400, { message: 'Cannot assign a descendant category as the parent' });
                }
            }

            updates.parentCategoryId = desiredParentId ?? null;
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

        const { items: childCategories } = await categoryRepository.scan({
            filterExpression: 'parentCategoryId = :parentId',
            expressionAttributeValues: { ':parentId': id },
            limit: 1,
        });

        if (childCategories.length > 0) {
            return respond(400, { message: 'Category has nested categories. Reassign or remove them before deleting.' });
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

// --- COMMENTS ---
const createAvatarUrl = (name: string) => `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(name)}`;

export const getPendingComments: APIGatewayProxyHandlerV2 = async () => {
    try {
        const pendingComments = await commentRepository.findByStatus('PENDING');
        if (pendingComments.length === 0) {
            return respond(200, []);
        }

        pendingComments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const uniqueArticleIds = Array.from(new Set(pendingComments.map(comment => comment.articleId)));
        const articles = await Promise.all(uniqueArticleIds.map(async (articleId) => {
            try {
                const article = await articleRepository.getById(articleId);
                return article ? { id: articleId, article } : null;
            } catch (error) {
                console.warn('Failed to load article for pending comment', { articleId, error });
                return null;
            }
        }));

        const articleMap = new Map<string, { id: string; title: string; slug: string }>();
        articles.forEach(entry => {
            if (entry?.article) {
                articleMap.set(entry.id, {
                    id: entry.article.id,
                    title: entry.article.title,
                    slug: entry.article.slug,
                });
            }
        });

        const responsePayload = pendingComments.map(comment => ({
            ...comment,
            article: articleMap.get(comment.articleId) ?? {
                id: comment.articleId,
                title: 'Unknown article',
                slug: '#',
            },
        }));

        return respond(200, responsePayload);
    } catch (error) {
        console.error('Error fetching pending comments:', error);
        return respond(500, { message: 'Failed to fetch pending comments' });
    }
};

export const postComment: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const articleId = event.pathParameters?.id || event.pathParameters?.articleId;
        if (!articleId) {
            return respond(400, { message: 'Article ID is required' });
        }

        const article = await articleRepository.getById(articleId);
        if (!article) {
            return respond(404, { message: 'Article not found' });
        }

        const payload = JSON.parse(event.body || '{}');
        const text = typeof payload.text === 'string' ? payload.text.trim() : '';
        if (!text) {
            return respond(400, { message: 'Comment text is required' });
        }

        const authorNameRaw = typeof payload.authorName === 'string' ? payload.authorName.trim() : '';
        const authorName = authorNameRaw || 'Reader';
        const authorEmailRaw = typeof payload.authorEmail === 'string' ? payload.authorEmail.trim() : '';
        const authorEmail = authorEmailRaw ? authorEmailRaw.toLowerCase() : undefined;
        const authorAvatarUrl = typeof payload.authorAvatarUrl === 'string' && payload.authorAvatarUrl.trim()
            ? payload.authorAvatarUrl.trim()
            : createAvatarUrl(authorName);

        const now = new Date().toISOString();
        const comment: Comment = {
            id: uuidv4(),
            articleId,
            authorName,
            authorEmail,
            authorAvatarUrl,
            text,
            status: 'PENDING',
            date: now,
            createdAt: now,
            updatedAt: now,
        };

        await commentRepository.create(comment);

        return respond(201, comment);
    } catch (error) {
        console.error('Error posting comment:', error);
        return respond(500, { message: 'Failed to post comment' });
    }
};

export const updateCommentStatus: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const articleId = event.pathParameters?.articleId || event.pathParameters?.id;
        const commentId = event.pathParameters?.commentId;

        if (!articleId || !commentId) {
            return respond(400, { message: 'Article ID and comment ID are required' });
        }

        const payload = JSON.parse(event.body || '{}');
        const status = typeof payload.status === 'string' ? payload.status.trim().toUpperCase() : '';

        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return respond(400, { message: 'Invalid comment status' });
        }

        const existingComment = await commentRepository.getById(commentId);

        if (!existingComment || existingComment.articleId !== articleId) {
            return respond(404, { message: 'Comment not found' });
        }

        const updatedComment = await commentRepository.update(commentId, {
            status,
            updatedAt: new Date().toISOString(),
        });

        if (!updatedComment) {
            return respond(404, { message: 'Comment not found' });
        }

        return respond(200, updatedComment);
    } catch (error) {
        console.error('Error updating comment status:', error);
        return respond(500, { message: 'Failed to update comment status' });
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
    try {
        const { email: rawEmail } = JSON.parse(event.body || '{}');
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

        if (!email) {
            return respond(400, { message: 'Email is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return respond(400, { message: 'Invalid email address' });
        }

        const existingSubscriber = await subscriberRepository.findByEmail(email, { includeInactive: true });
        if (existingSubscriber) {
            if (existingSubscriber.isActive) {
                return respond(409, { message: 'Subscriber already exists' });
            }

            const reactivatedSubscriber = await subscriberRepository.update(existingSubscriber.id, {
                isActive: true,
                subscribedAt: new Date().toISOString(),
                unsubscribedAt: undefined,
            });

            return respond(200, reactivatedSubscriber);
        }

        const now = new Date().toISOString();
        const newSubscriber: Subscriber = {
            id: uuidv4(),
            email,
            isActive: true,
            subscribedAt: now,
            createdAt: now,
            updatedAt: now,
        };

        await subscriberRepository.create(newSubscriber);
        return respond(201, newSubscriber);
    } catch (error) {
        console.error('Error subscribing to newsletter:', error);
        return respond(500, { message: 'Failed to subscribe to newsletter' });
    }
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

