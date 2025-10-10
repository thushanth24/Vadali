import { Category } from '../types';
import { BaseRepository } from './BaseRepository';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = process.env.CATEGORIES_TABLE || 'Categories';

  protected toDomain(item: any): Category {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  protected toDB(category: Category) {
    return {
      ...category,
      ...(category.description === undefined && { description: '' })
    };
  }

  async findByName(name: string): Promise<Category | null> {
    const result = await this.scan({
      filterExpression: '#name = :name',
      expressionAttributeNames: { '#name': 'name' },
      expressionAttributeValues: { ':name': name },
      limit: 1
    });
    
    return result.items[0] ?? null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const result = await this.scan({
      filterExpression: 'slug = :slug',
      expressionAttributeValues: { ':slug': slug },
      limit: 1
    });
    
    return result.items[0] ?? null;
  }
}
