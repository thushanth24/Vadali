import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

interface CategoryItem extends SeedCategory {
  createdAt: string;
  updatedAt: string;
}

const args = process.argv.slice(2);

const getArgValue = (keys: string[]): string | undefined => {
  for (const key of keys) {
    const longForm = key.startsWith('--');
    const index = args.findIndex((arg) => (longForm ? arg === key || arg.startsWith(`${key}=`) : arg === key));

    if (index === -1) continue;

    const valueWithEquals = args[index];
    if (valueWithEquals.includes('=')) {
      return valueWithEquals.split('=').slice(1).join('=');
    }

    return args[index + 1];
  }

  return undefined;
};

const REGION =
  getArgValue(['--region', '-r']) ||
  process.env.CATEGORIES_REGION ||
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  'us-east-1';

const CATEGORIES_TABLE =
  getArgValue(['--table', '-t']) || process.env.CATEGORIES_TABLE || 'vadali-media-categories-dev';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

const CATEGORY_SEEDS: SeedCategory[] = [
  {
    id: 'c_demo_environment',
    name: 'Climate & Environment',
    slug: 'climate-environment',
    description: 'Stories about sustainability, conservation, and climate resilience.',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_culture',
    name: 'Culture & Lifestyle',
    slug: 'culture-lifestyle',
    description: 'Arts, travel, food, and the people shaping everyday life.',
    imageUrl: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_technology',
    name: 'Technology & Innovation',
    slug: 'technology-innovation',
    description: 'Coverage of startups, civic tech, AI, and cutting-edge research.',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_business',
    name: 'Business & Economy',
    slug: 'business-economy',
    description: 'Insights into markets, entrepreneurship, finance, and the future of work.',
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_creative',
    name: 'Creative Industries',
    slug: 'creative-industries',
    description: 'Film, design, media, and the creators pushing boundaries.',
    imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_health',
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Community health, wellbeing trends, and care innovations.',
    imageUrl: 'https://images.unsplash.com/photo-1484980972926-edee96e0960d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_transport',
    name: 'Mobility & Transport',
    slug: 'mobility-transport',
    description: 'Urban planning, micro mobility, and the future of transport.',
    imageUrl: 'https://images.unsplash.com/photo-1471623320832-752e0e0bc1b0?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_education',
    name: 'Education & Skills',
    slug: 'education-skills',
    description: 'Learning innovation, classrooms, and workforce development.',
    imageUrl: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_features',
    name: 'Features & Human Stories',
    slug: 'features-human-stories',
    description: 'Long-form features, personal journeys, and community spotlights.',
    imageUrl: 'https://images.unsplash.com/photo-1459257868276-5e65389e2722?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_opinion',
    name: 'Opinion & Analysis',
    slug: 'opinion-analysis',
    description: 'Editorial perspectives, commentary, and expert debates.',
    imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c_demo_sport',
    name: 'Sports & Performance',
    slug: 'sports-performance',
    description: 'Grassroots athletics, training innovation, and sports business.',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
  },
];

const toCategoryItem = (seed: SeedCategory): CategoryItem => {
  const timestamp = new Date().toISOString();
  return {
    ...seed,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

async function categoryExists(id: string): Promise<boolean> {
  const command = new GetCommand({
    TableName: CATEGORIES_TABLE,
    Key: { id },
  });

  const result = await docClient.send(command);
  return Boolean(result.Item);
}

async function writeCategories(items: CategoryItem[]): Promise<void> {
  const chunks: CategoryItem[][] = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const command = new BatchWriteCommand({
      RequestItems: {
        [CATEGORIES_TABLE]: chunk.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    });

    const response = await docClient.send(command);
    const unprocessed = response.UnprocessedItems?.[CATEGORIES_TABLE];

    if (unprocessed && unprocessed.length > 0) {
      throw new Error(`Failed to process ${unprocessed.length} category item(s). Please retry the seed.`);
    }
  }
}

async function seedCategories() {
  try {
    console.log(`Seeding categories into table "${CATEGORIES_TABLE}" in region "${REGION}"`);

    const categoriesToInsert: CategoryItem[] = [];

    for (const seed of CATEGORY_SEEDS) {
      const exists = await categoryExists(seed.id);
      if (exists) {
        console.log(`Skipping "${seed.name}" (id already exists)`);
        continue;
      }
      categoriesToInsert.push(toCategoryItem(seed));
    }

    if (categoriesToInsert.length === 0) {
      console.log('No new categories to insert.');
      return;
    }

    await writeCategories(categoriesToInsert);

    console.log(`Inserted ${categoriesToInsert.length} categories:`);
    categoriesToInsert.forEach((category) => {
      console.log(` - ${category.name} (${category.slug})`);
    });
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
