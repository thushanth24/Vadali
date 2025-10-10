import { User, createUser } from '../models/User';
import { BaseRepository } from './BaseRepository';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../types';
import { DeleteCommand, PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

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
    await this.update(userId, { refreshToken } as Partial<User>);
  }

  async findAll(): Promise<User[]> {
    const command = new ScanCommand({
      TableName: this.tableName
    });
    const result = await this.docClient.send(command);
    return result.Items ? result.Items.map(item => this.toDomain(item)) : [];
  }

  async findById(userId: string): Promise<User | null> {
    if (!userId) return null;
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id: userId }
    });
    const result = await this.docClient.send(command);
    return result.Item ? this.toDomain(result.Item as any) : null;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { id: userId },
      ReturnValues: 'ALL_OLD'
    });

    const result = await this.docClient.send(command);
    return !!result.Attributes;
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...existingUser,
      ...userData,
      updatedAt: new Date().toISOString()
    };

    const dbItem = this.toDB(updatedUser);
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: dbItem
      })
    );

    return updatedUser;
  }
}

