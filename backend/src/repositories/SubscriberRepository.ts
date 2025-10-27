import { Subscriber } from '../types';
import { BaseRepository } from './BaseRepository';

export class SubscriberRepository extends BaseRepository<Subscriber> {
  protected tableName = process.env.SUBSCRIBERS_TABLE || 'Subscribers';

  protected toDomain(item: any): Subscriber {
    return {
      id: item.id,
      email: item.email,
      name: item.name,
      isActive: item.isActive !== false, // Default to true if not set
      subscribedAt: item.subscribedAt || new Date().toISOString(),
      unsubscribedAt: item.unsubscribedAt,
      preferences: item.preferences || {},
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    };
  }

  protected toDB(subscriber: Subscriber) {
    return {
      ...subscriber,
      // Ensure we don't store undefined values
      ...(subscriber.isActive === undefined && { isActive: true }),
      ...(subscriber.preferences === undefined && { preferences: {} })
    };
  }

  async findByEmail(email: string, options?: { includeInactive?: boolean }): Promise<Subscriber | null> {
    const includeInactive = options?.includeInactive === true;
    const expressionAttributeValues: Record<string, any> = {
      ':email': email,
    };

    if (!includeInactive) {
      expressionAttributeValues[':isActive'] = true;
    }

    const result = await this.query({
      indexName: 'EmailIndex',
      keyConditionExpression: 'email = :email',
      expressionAttributeValues,
      ...(includeInactive ? {} : { filterExpression: 'isActive = :isActive' }),
    });

    return result.items[0] || null;
  }

  async unsubscribe(email: string): Promise<boolean> {
    const subscriber = await this.findByEmail(email);
    if (!subscriber) return false;

    await this.update(subscriber.id, {
      isActive: false,
      unsubscribedAt: new Date().toISOString()
    } as Partial<Subscriber>);

    return true;
  }

  async getActiveSubscribers(): Promise<Subscriber[]> {
    const result = await this.query({
      indexName: 'IsActiveIndex',
      keyConditionExpression: 'isActive = :isActive',
      expressionAttributeValues: { ':isActive': true }
    });
    
    return result.items;
  }
}
