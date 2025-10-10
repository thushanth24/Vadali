import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isOffline = process.env.IS_OFFLINE === 'true';

const client = new DynamoDBClient({
  region: process.env.REGION || 'us-east-1',
  ...(isOffline && {
    endpoint: 'http://localhost:8000',
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local'
    }
  })
});

export const docClient = DynamoDBDocumentClient.from(client);
