import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Article, createArticle } from '../models/Article';
import { BaseRepository } from './BaseRepository';
import { ArticleStatus } from '../types';

// Constant partition-key value for the all-created-index GSI. Every article
// carries this so a single ordered query can return all statuses newest-first.
export const ARTICLE_GSI_ALL = 'ARTICLE';

export class ArticleRepository extends BaseRepository<Article> {
  protected tableName = process.env.ARTICLES_TABLE || 'Articles';
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 20;
  // The all-created-index reads are full-list fetches for the editor management
  // view, so allow large pages to keep round-trips low. DynamoDB still caps a
  // Query response at 1MB and returns a cursor, so the loop stays correct.
  private readonly MAX_ALL_LIMIT = 1000;

  private clampLimit(limit?: number): number {
    if (!Number.isFinite(limit) || limit <= 0) return this.DEFAULT_LIMIT;
    return Math.min(Math.floor(limit), this.MAX_LIMIT);
  }

  private clampAllLimit(limit?: number): number {
    if (limit === undefined || !Number.isFinite(limit) || limit <= 0) return this.DEFAULT_LIMIT;
    return Math.min(Math.floor(limit), this.MAX_ALL_LIMIT);
  }

  protected toDomain(item: any): Article {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      content: item.content ?? '',
      coverImageUrl: item.coverImageUrl,
      imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
      authorId: item.authorId,
      categoryId: item.categoryId,
      tags: item.tags || [],
      status: item.status,
      publishedAt: item.publishedAt || null,
      views: item.views || 0,
      videoUrl: item.videoUrl,
      isAdvertisement: item.isAdvertisement || false,
      isFeatured: item.isFeatured || false,
      rejectionReason: item.rejectionReason,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  protected toDB(article: Article) {
    const dbItem: Record<string, any> = {
      ...article,
      // Constant key so every article is indexed by all-created-index.
      gsiAll: ARTICLE_GSI_ALL,
      // Ensure we don't store undefined values
      ...(article.tags === undefined && { tags: [] }),
      ...(article.imageUrls === undefined && { imageUrls: [] }),
      ...(article.views === undefined && { views: 0 }),
      ...(article.isAdvertisement === undefined && { isAdvertisement: false }),
      ...(article.isFeatured === undefined && { isFeatured: false }),
      ...(article.rejectionReason === undefined && { rejectionReason: null }),
      ...(article.videoUrl === undefined && { videoUrl: null })
    };

    // DynamoDB GSIs require indexed attributes to be the expected type (string for publishedAt-index).
    // If the article isn't published, drop publishedAt entirely so we don't write a NULL into the index.
    if (article.publishedAt === null || article.publishedAt === undefined || String(article.publishedAt).trim() === '') {
      delete dbItem.publishedAt;
    }

    return dbItem;
  }

  async createArticle(articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'views'>): Promise<Article> {
    const article = createArticle(articleData);
    return this.create(article);
  }

  async findBySlug(slug: string): Promise<Article | null> {
    const result = await this.query({
      indexName: 'slug-index',
      keyConditionExpression: 'slug = :slug',
      expressionAttributeValues: { ':slug': slug }
    });
    
    return result.items[0] || null;
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    const { items } = await this.scan({
      filterExpression: 'authorId = :authorId',
      expressionAttributeValues: { ':authorId': authorId }
    });
    
    return items;
  }

  async findByStatus(status: string): Promise<Article[]> {
    const { items } = await this.scan({
      filterExpression: '#status = :status',
      expressionAttributeNames: { '#status': 'status' },
      expressionAttributeValues: { ':status': status }
    });
    
    return items;
  }

  async incrementViews(articleId: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { id: articleId },
      UpdateExpression: 'SET #views = if_not_exists(#views, :zero) + :inc',
      ExpressionAttributeNames: { '#views': 'views' },
      ExpressionAttributeValues: { ':inc': 1, ':zero': 0 }
    });

    await this.docClient.send(command);
  }

  async queryByPublished(params: { status?: string; limit?: number; lastKey?: Record<string, any> }) {
    const statusValue = params.status ?? ArticleStatus.PUBLISHED;
    return this.query({
      indexName: 'publishedAt-index',
      keyConditionExpression: '#status = :status',
      expressionAttributeNames: { '#status': 'status' },
      expressionAttributeValues: { ':status': statusValue },
      limit: this.clampLimit(params.limit),
      lastEvaluatedKey: params.lastKey,
      scanIndexForward: false, // newest first
    });
  }

  private getListProjection() {
    return {
      projectionExpression:
        '#id, title, slug, summary, coverImageUrl, imageUrls, categoryId, tags, #status, publishedAt, createdAt, updatedAt, isFeatured, isAdvertisement, #views, videoUrl',
      expressionAttributeNames: { '#id': 'id', '#status': 'status', '#views': 'views' }
    };
  }

  async queryByCreated(params: {
    status?: string;
    limit?: number;
    lastKey?: Record<string, any>;
    filterExpression?: string;
    expressionAttributeValues?: Record<string, any>;
    expressionAttributeNames?: Record<string, string>;
  }) {
    const statusValue = params.status ?? ArticleStatus.PUBLISHED;
    const projection = this.getListProjection();
    return this.query({
      indexName: 'createdAt-index',
      keyConditionExpression: '#status = :status',
      expressionAttributeNames: {
        ...projection.expressionAttributeNames,
        '#status': 'status',
        ...(params.expressionAttributeNames ?? {}),
      },
      expressionAttributeValues: {
        ':status': statusValue,
        ...(params.expressionAttributeValues ?? {}),
      },
      filterExpression: params.filterExpression,
      limit: this.clampLimit(params.limit),
      lastEvaluatedKey: params.lastKey,
      scanIndexForward: false, // newest first
      projectionExpression: projection.projectionExpression,
    });
  }

  /**
   * Returns articles of ALL statuses ordered newest-first by createdAt, using
   * the single-partition all-created-index. This is the only path that yields a
   * correct global ordering in one query (per-status indexes can't span statuses).
   */
  async queryByCreatedAllStatuses(params: {
    limit?: number;
    lastKey?: Record<string, any>;
    filterExpression?: string;
    expressionAttributeValues?: Record<string, any>;
    expressionAttributeNames?: Record<string, string>;
  } = {}) {
    const projection = this.getListProjection();
    return this.query({
      indexName: 'all-created-index',
      keyConditionExpression: '#gsiAll = :gsiAll',
      expressionAttributeNames: {
        ...projection.expressionAttributeNames,
        '#gsiAll': 'gsiAll',
        ...(params.expressionAttributeNames ?? {}),
      },
      expressionAttributeValues: {
        ':gsiAll': ARTICLE_GSI_ALL,
        ...(params.expressionAttributeValues ?? {}),
      },
      filterExpression: params.filterExpression,
      limit: this.clampAllLimit(params.limit),
      lastEvaluatedKey: params.lastKey,
      scanIndexForward: false, // newest first
      projectionExpression: projection.projectionExpression,
    });
  }

  async queryByCategoryCreated(params: {
    categoryId: string;
    status?: string;
    isFeatured?: boolean;
    isAdvertisement?: boolean;
    limit?: number;
    lastKey?: Record<string, any>;
    filterExpression?: string;
    expressionAttributeValues?: Record<string, any>;
    expressionAttributeNames?: Record<string, string>;
  }) {
    const expressionAttributeValues: Record<string, any> = {
      ':categoryId': params.categoryId,
    };
    const expressionAttributeNames: Record<string, string> = {};
    const filterExpressions: string[] = [];
    const projection = this.getListProjection();

    if (params.status) {
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = params.status;
      filterExpressions.push('#status = :status');
    }

    if (typeof params.isFeatured === 'boolean') {
      expressionAttributeValues[':isFeatured'] = params.isFeatured;
      filterExpressions.push('isFeatured = :isFeatured');
    }

    if (typeof params.isAdvertisement === 'boolean') {
      expressionAttributeValues[':isAdvertisement'] = params.isAdvertisement;
      filterExpressions.push('isAdvertisement = :isAdvertisement');
    }

    return this.query({
      indexName: 'category-index',
      keyConditionExpression: 'categoryId = :categoryId',
      expressionAttributeNames: {
        ...(Object.keys(expressionAttributeNames).length ? expressionAttributeNames : {}),
        ...(params.expressionAttributeNames ?? {}),
        ...projection.expressionAttributeNames,
      },
      expressionAttributeValues: {
        ...expressionAttributeValues,
        ...(params.expressionAttributeValues ?? {}),
      },
      projectionExpression: projection.projectionExpression,
      filterExpression: params.filterExpression
        ? params.filterExpression
        : filterExpressions.length
          ? filterExpressions.join(' AND ')
          : undefined,
      limit: this.clampLimit(params.limit),
      lastEvaluatedKey: params.lastKey,
      scanIndexForward: false, // newest first by createdAt
    });
  }

}
