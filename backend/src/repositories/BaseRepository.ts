import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from '../db/client';

export abstract class BaseRepository<T> {
  protected abstract tableName: string;
  protected docClient: DynamoDBDocumentClient;

  constructor() {
    this.docClient = docClient;
  }

  protected abstract toDomain(item: any): T;
  protected abstract toDB(item: T): Record<string, any>;

  async getById(id: string): Promise<T | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id }
    });

    const result = await this.docClient.send(command);
    return result.Item ? this.toDomain(result.Item) : null;
  }

  async create(item: T): Promise<T> {
    const dbItem = this.toDB(item);
    const command = new PutCommand({
      TableName: this.tableName,
      Item: dbItem,
      ConditionExpression: 'attribute_not_exists(id)'
    });

    await this.docClient.send(command);
    return item;
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedItem = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const dbItem = this.toDB(updatedItem);

    const command = new PutCommand({
      TableName: this.tableName,
      Item: dbItem
    });

    await this.docClient.send(command);
    return updatedItem;
  }

  async delete(id: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { id },
      ReturnValues: 'ALL_OLD'
    });

    const result = await this.docClient.send(command);
    return !!result.Attributes;
  }

  protected async query(params: {
    indexName?: string;
    keyConditionExpression: string;
    expressionAttributeValues: Record<string, any>;
    filterExpression?: string;
    limit?: number;
    lastEvaluatedKey?: Record<string, any>;
  }): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, any> }> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: params.indexName,
      KeyConditionExpression: params.keyConditionExpression,
      ExpressionAttributeValues: params.expressionAttributeValues,
      FilterExpression: params.filterExpression,
      Limit: params.limit,
      ExclusiveStartKey: params.lastEvaluatedKey
    });

    const result = await this.docClient.send(command);
    return {
      items: result.Items?.map(item => this.toDomain(item)) || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  }

  public async scan(params: {
    filterExpression?: string;
    expressionAttributeValues?: Record<string, any>;
    expressionAttributeNames?: Record<string, string>;
    limit?: number;
    lastEvaluatedKey?: Record<string, any>;
  } = {}): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, any> }> {
    const {
      filterExpression,
      expressionAttributeValues,
      expressionAttributeNames,
      limit,
      lastEvaluatedKey
    } = params;

    const hasValues = expressionAttributeValues && Object.keys(expressionAttributeValues).length > 0;
    const hasNames = expressionAttributeNames && Object.keys(expressionAttributeNames).length > 0;

    const command = new ScanCommand({
      TableName: this.tableName,
      ...(filterExpression ? { FilterExpression: filterExpression } : {}),
      ...(hasValues ? { ExpressionAttributeValues: expressionAttributeValues } : {}),
      ...(hasNames ? { ExpressionAttributeNames: expressionAttributeNames } : {}),
      ...(typeof limit === 'number' ? { Limit: limit } : {}),
      ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {})
    });

    const result = await this.docClient.send(command);
    return {
      items: result.Items?.map(item => this.toDomain(item)) || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  }
}


