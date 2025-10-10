import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

const tableName = (envVar: string, fallback: string): string => {
  const value = process.env[envVar];
  return value && value.length > 0 ? value : fallback;
};

export const TABLES = {
  USERS: tableName('USERS_TABLE', 'Users'),
  ARTICLES: tableName('ARTICLES_TABLE', 'Articles'),
  CATEGORIES: tableName('CATEGORIES_TABLE', 'Categories'),
  COMMENTS: tableName('COMMENTS_TABLE', 'Comments'),
  NOTIFICATIONS: tableName('NOTIFICATIONS_TABLE', 'Notifications'),
  SUBSCRIBERS: tableName('SUBSCRIBERS_TABLE', 'Subscribers'),
};

export default docClient;
