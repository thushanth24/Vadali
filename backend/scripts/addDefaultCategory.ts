import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB Client
const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CATEGORIES_TABLE = 'vadali-media-categories-dev';

async function addDefaultCategory() {
    try {
        const now = new Date().toISOString();
        const defaultCategory = {
            id: `c${Date.now()}`,
            name: 'Uncategorized',
            slug: 'uncategorized',
            description: 'Default category for uncategorized content',
            imageUrl: 'https://picsum.photos/seed/uncategorized/400/300',
            createdAt: now,
            updatedAt: now
        };

        const command = new PutCommand({
            TableName: CATEGORIES_TABLE,
            Item: defaultCategory,
            ConditionExpression: 'attribute_not_exists(id)'
        });

        await docClient.send(command);
        console.log('Successfully added default category:', defaultCategory);
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            console.log('Default category already exists');
        } else {
            console.error('Error adding default category:', error);
            process.exit(1);
        }
    }
}

addDefaultCategory();
