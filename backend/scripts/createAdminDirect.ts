import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

// Initialize DynamoDB Client
const client = new DynamoDBClient({
  region: 'us-east-1', // Make sure this matches your serverless.yml region
  // If running locally, you might need to configure AWS credentials
  // credentials: {
  //   accessKeyId: 'YOUR_ACCESS_KEY',
  //   secretAccessKey: 'YOUR_SECRET_KEY',
  // },
});

const docClient = DynamoDBDocumentClient.from(client);

// Table name should match what's in your serverless.yml
const USERS_TABLE = 'vadali-media-users-dev';

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

async function createAdminUser() {
  try {
    const now = new Date().toISOString();
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@1234', salt); // Hash the password with salt
    
    const adminUser: User = {
      id: uuidv4(),
      name: 'Admin User',
      email: 'admin@vadali.com',
      password: adminPassword,
      role: 'ADMIN',
      avatarUrl: `https://ui-avatars.com/api/?name=Admin+User&background=random`,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: adminUser,
      ConditionExpression: 'attribute_not_exists(email)', // Prevent duplicate emails
    });

    await docClient.send(command);
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@vadali.com');
    console.log('Password: Admin@1234');
    console.log('IMPORTANT: Change this password after first login!');
    
    return adminUser;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.error('❌ Error: An admin user with this email already exists');
    } else {
      console.error('❌ Error creating admin user:', error);
    }
    process.exit(1);
  }
}

// Run the function
createAdminUser()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
