import { Notification, NotificationType } from '../types';
import { BaseRepository } from './BaseRepository';

export class NotificationRepository extends BaseRepository<Notification> {
  protected tableName = process.env.NOTIFICATIONS_TABLE || 'Notifications';

  protected toDomain(item: any): Notification {
    return {
      id: item.id,
      userId: item.userId,
      articleId: item.articleId,
      message: item.message,
      type: item.type as NotificationType,
      read: item.read || false,
      timestamp: item.timestamp || new Date().toISOString()
    };
  }

  protected toDB(notification: Notification) {
    return {
      ...notification,
      ...(notification.read === undefined && { read: false }),
      ...(notification.timestamp === undefined && { timestamp: new Date().toISOString() })
    };
  }

  async findByUser(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const params: any = {
      indexName: 'UserIndex',
      keyConditionExpression: 'userId = :userId',
      expressionAttributeValues: { ':userId': userId }
    };

    if (unreadOnly) {
      params.filterExpression = '#read = :read';
      params.expressionAttributeNames = { '#read': 'read' };
      params.expressionAttributeValues[':read'] = false;
    }

    const result = await this.query(params);
    return result.items;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.update(notificationId, {
      read: true,
      timestamp: new Date().toISOString()
    } as Partial<Notification>);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.findByUser(userId, true);
    
    await Promise.all(
      notifications.map(notification => 
        this.markAsRead(notification.id)
      )
    );
  }
}
