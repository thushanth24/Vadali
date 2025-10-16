import { Article, createArticle } from '../models/Article';
import { BaseRepository } from './BaseRepository';

export class ArticleRepository extends BaseRepository<Article> {
  protected tableName = process.env.ARTICLES_TABLE || 'Articles';

  protected toDomain(item: any): Article {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      summary: item.summary,
      content: item.content,
      coverImageUrl: item.coverImageUrl,
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
    return {
      ...article,
      // Ensure we don't store undefined values
      ...(article.tags === undefined && { tags: [] }),
      ...(article.views === undefined && { views: 0 }),
      ...(article.isAdvertisement === undefined && { isAdvertisement: false }),
      ...(article.isFeatured === undefined && { isFeatured: false }),
      ...(article.rejectionReason === undefined && { rejectionReason: null }),
      ...(article.videoUrl === undefined && { videoUrl: null })
    };
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
}
