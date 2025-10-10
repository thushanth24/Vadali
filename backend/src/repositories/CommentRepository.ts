import { Comment } from '../types';
import { BaseRepository } from './BaseRepository';

export class CommentRepository extends BaseRepository<Comment> {
  protected tableName = process.env.COMMENTS_TABLE || 'Comments';

  protected toDomain(item: any): Comment {
    return {
      id: item.id,
      authorName: item.authorName,
      authorEmail: item.authorEmail,
      authorAvatarUrl: item.authorAvatarUrl,
      text: item.text,
      date: item.date,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  protected toDB(comment: Comment) {
    return {
      ...comment,
      // Ensure we don't store undefined values
      ...(comment.authorEmail === undefined && { authorEmail: '' }),
      ...(comment.authorAvatarUrl === undefined && { authorAvatarUrl: '' })
    };
  }

  async findByArticle(articleId: string): Promise<Comment[]> {
    const result = await this.query({
      indexName: 'ArticleIndex',
      keyConditionExpression: 'articleId = :articleId',
      expressionAttributeValues: { 
        ':articleId': articleId,
        ':status': 'APPROVED'
      },
      filterExpression: '#status = :status',
      expressionAttributeNames: { '#status': 'status' }
    });
    
    return result.items;
  }

  async findByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<Comment[]> {
    const result = await this.query({
      indexName: 'StatusIndex',
      keyConditionExpression: '#status = :status',
      expressionAttributeNames: { '#status': 'status' },
      expressionAttributeValues: { ':status': status }
    });
    
    return result.items;
  }

  async findByAuthor(authorId: string): Promise<Comment[]> {
    const result = await this.query({
      indexName: 'AuthorIndex',
      keyConditionExpression: 'authorId = :authorId',
      expressionAttributeValues: { ':authorId': authorId }
    });
    
    return result.items;
  }
}
