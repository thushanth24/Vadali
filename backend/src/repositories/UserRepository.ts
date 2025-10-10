import { User, createUser } from '../models/User';
import { BaseRepository } from './BaseRepository';

export class UserRepository extends BaseRepository<User> {
  protected tableName = process.env.USERS_TABLE || 'Users';

  protected toDomain(item: any): User {
    return {
      id: item.id,
      name: item.name,
      email: item.email,
      password: item.password,
      role: item.role,
      avatarUrl: item.avatarUrl,
      bio: item.bio,
      refreshToken: item.refreshToken,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  protected toDB(user: User) {
    return {
      ...user,
      // Ensure we don't store undefined values
      ...(user.bio === undefined && { bio: null }),
      ...(user.refreshToken === undefined && { refreshToken: null })
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.query({
      indexName: 'email-index',
      keyConditionExpression: 'email = :email',
      expressionAttributeValues: { ':email': email }
    });
    
    return result.items[0] || null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user = createUser(userData);
    return this.create(user);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.update(userId, { refreshToken });
  }
}

