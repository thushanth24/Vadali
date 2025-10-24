import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

type ArticleStatus = 'Draft' | 'Pending Review' | 'Published' | 'Rejected';

interface SeedArticleInput {
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  authorId: string;
  categoryId: string;
  tags: string[];
  status: ArticleStatus;
  publishedAt: string | null;
  videoUrl?: string | null;
  isAdvertisement?: boolean;
  isFeatured?: boolean;
}

interface ArticleItem extends SeedArticleInput {
  id: string;
  views: number;
  rejectionReason?: string | null;
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
  process.env.ARTICLES_REGION ||
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  'us-east-1';

const ARTICLES_TABLE =
  getArgValue(['--table', '-t']) || process.env.ARTICLES_TABLE || 'vadali-media-articles-dev';
const SLUG_GSI_NAME = process.env.ARTICLES_SLUG_INDEX || 'slug-index';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

const createArticleItem = (input: SeedArticleInput): ArticleItem => {
  const now = new Date().toISOString();
  return {
    ...input,
    id: `a_${uuidv4()}`,
    views: 0,
    videoUrl: input.videoUrl ?? null,
    isAdvertisement: input.isAdvertisement ?? false,
    isFeatured: input.isFeatured ?? false,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };
};

const ARTICLE_SEEDS: SeedArticleInput[] = [
  {
    title: 'Breaking Waves: Coastal Communities Embrace Sustainable Fishing',
    slug: 'breaking-waves-coastal-communities-sustainable-fishing',
    summary: 'How a group of fisherfolk reinvented their trade to protect the ocean and their livelihoods.',
    content:
      'For decades, the fishing villages along the eastern coastline relied on traditional nets that often harmed coral reefs. In 2024, a group of young leaders partnered with marine biologists to introduce sustainable gear and digital tracking. The result? A 30% increase in yields and healthier reefs. We explore how mentorship programs, microloans, and community buy-in helped accelerate the transition.',
    coverImageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_editor',
    categoryId: 'c_demo_environment',
    tags: ['Sustainability', 'Oceans', 'Innovation'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    isFeatured: true,
  },
  {
    title: 'Inside the Studio: The Rise of Neo-Folk Music Collectives',
    slug: 'inside-the-studio-neo-folk-music-collectives',
    summary: 'A behind-the-scenes look at the artists redefining folk music with electronic textures.',
    content:
      'Neo-folk has been on playlists everywhere, but the story behind the sound starts in small community studios. Producers are pairing analog instruments with modular synths, and fan-funded residencies are giving artists room to experiment. We spoke with collectives in Colombo, Chennai, and Kuala Lumpur about collaboration, creative burnout, and the business of staying independent.',
    coverImageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_music',
    categoryId: 'c_demo_culture',
    tags: ['Music', 'Culture', 'Profiles'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    title: 'Tech for Good: Low-Code Apps Power Local Governance',
    slug: 'tech-for-good-low-code-apps-local-governance',
    summary: 'Civic hackers are shipping low-code tools that help municipalities respond faster to citizen needs.',
    content:
      'When the city of Batticaloa wanted to streamline flood response, a group of civic technologists built a low-code dashboard in two weekends. The solution tracks real-time alerts, inventory levels, and volunteer coordination. Similar apps are sprouting up worldwide, driven by partnerships between universities and NGOs. We map out the tech stack, funding models, and the measurable impact so far.',
    coverImageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_civic',
    categoryId: 'c_demo_technology',
    tags: ['Civic Tech', 'Innovation', 'Startups'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isFeatured: false,
  },
  {
    title: 'Food Futures: Hydroponic Farms Thrive Above the City',
    slug: 'food-futures-hydroponic-farms-thrive-above-the-city',
    summary: 'Rooftop hydroponic farms are turning underused spaces into sustainable food hubs.',
    content:
      'In dense urban centers, access to fresh produce can be uneven. Hydroponics offers a scalable answer. From Colombo to Singapore, rooftops are becoming farms that reduce transport emissions and create green jobs. We tour three projects, covering their nutrient systems, yield data, and the community-supported agriculture models that keep them profitable.',
    coverImageUrl: 'https://images.unsplash.com/photo-1582719478181-2cf4e13d8aa2?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_food',
    categoryId: 'c_demo_business',
    tags: ['Food', 'Sustainability', 'Business'],
    status: 'Pending Review',
    publishedAt: null,
  },
  {
    title: 'The Future of Cinema: Immersive Storytelling with XR',
    slug: 'future-of-cinema-immersive-storytelling-with-xr',
    summary: 'XR experiences are redefining how audiences engage with film narratives.',
    content:
      'Extended reality studios are blending film, theatre, and gaming to create immersive stories. We visit three studios experimenting with branching narratives and motion capture. Directors share lessons on accessibility, hardware constraints, and building inclusive teams that blur the lines between disciplines.',
    coverImageUrl: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_film',
    categoryId: 'c_demo_creative',
    tags: ['Film', 'XR', 'Innovation'],
    status: 'Draft',
    publishedAt: null,
  },
  {
    title: 'Community Health: Mobile Clinics Close the Rural Care Gap',
    slug: 'community-health-mobile-clinics-close-rural-care-gap',
    summary: 'Mobile clinics staffed by nurses and midwives are bringing critical care to remote villages.',
    content:
      'Rural healthcare access remains a challenge in many regions. Mobile clinics, equipped with telemedicine tools and staffed by local nurses, are bridging the gap. Patients receive prenatal care, chronic disease management, and health education. Data from the Ministry of Health indicates a 40% increase in follow-up visits after the program launch.',
    coverImageUrl: 'https://images.unsplash.com/photo-1587502537745-84b87a8e8dba?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_health',
    categoryId: 'c_demo_health',
    tags: ['Health', 'Community', 'Policy'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    isFeatured: true,
  },
  {
    title: 'City Pulse: Micro-Mobility Cuts Commute Times in Half',
    slug: 'city-pulse-micro-mobility-cuts-commute-times',
    summary: 'Shared e-bike lanes and micro mobility hubs are transforming the morning commute.',
    content:
      'With fuel prices climbing, the city of Galle opened 25 micro-mobility hubs that blend e-bikes, scooters, and charging lockers. Usage shot up by 180% in the first quarter, and traffic congestion fell during peak hours. Urban planners point to smart traffic lights, employer subsidies, and safe lane design as the reasons for success.',
    coverImageUrl: 'https://images.unsplash.com/photo-1529429617124-aee11bad5112?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_mobility',
    categoryId: 'c_demo_transport',
    tags: ['Urban Planning', 'Mobility', 'Smart Cities'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    title: 'Design Forward: Biophilic Offices Boost Employee Wellness',
    slug: 'design-forward-biophilic-offices-boost-wellness',
    summary: 'Architects are integrating nature into high-rise offices to improve wellbeing and focus.',
    content:
      'Biophilic design—think indoor gardens, natural light, and water features—is moving beyond boutique spaces. Corporations report drops in sick days and rises in employee satisfaction after renovating their HQs. We tour three workplaces that adopted living walls, smart irrigation, and acoustic design tailored to hybrid work.',
    coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_design',
    categoryId: 'c_demo_business',
    tags: ['Design', 'Workplace', 'Wellness'],
    status: 'Pending Review',
    publishedAt: null,
  },
  {
    title: 'Startup Spotlight: AgriTech Drones Monitor Tea Estates',
    slug: 'startup-spotlight-agritech-drones-monitor-tea-estates',
    summary: 'A startup uses drone imagery and AI to predict yield and spot crop disease early.',
    content:
      'Tea planters in the hill country are embracing drones equipped with multispectral cameras. The system flags pest outbreaks, irrigation issues, and nutritional deficits days before they become visible to the eye. Subscription pricing keeps the service accessible even to smallholders, with co-ops pooling funds for coverage.',
    coverImageUrl: 'https://images.unsplash.com/photo-1504198458649-3128b932f49b?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_agri',
    categoryId: 'c_demo_technology',
    tags: ['Agriculture', 'AI', 'Startups'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    title: 'Voices: Youth Activists Push for Clean Air Policies',
    slug: 'voices-youth-activists-push-clean-air-policies',
    summary: 'Teen-led campaigns are convincing municipalities to adopt strict clean air standards.',
    content:
      'Inspired by regional climate movements, students organized open-air classrooms to highlight pollution. Their petitions led to low-emission zones, industrial audits, and new air-quality dashboards. Experts say the mix of storytelling, data, and coalition-building forced decision-makers to act.',
    coverImageUrl: 'https://images.unsplash.com/photo-1612036782180-1f1eb4a20131?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_climate',
    categoryId: 'c_demo_environment',
    tags: ['Climate', 'Youth', 'Policy'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    isFeatured: true,
  },
  {
    title: 'Local Legends: Culinary Revival in Heritage Towns',
    slug: 'local-legends-culinary-revival-heritage-towns',
    summary: 'Chefs are reviving ancestral recipes and putting historic towns back on the food map.',
    content:
      'From Jaffna to Kandy, culinary collectives are cataloging heirloom recipes and teaching apprentices. Pop-up kitchens and storytelling dinners draw tourists, while families see new income streams. Cultural historians warn of commercialization, but locals say the projects fund preservation efforts.',
    coverImageUrl: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_food',
    categoryId: 'c_demo_culture',
    tags: ['Food', 'Heritage', 'Travel'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    title: 'Data Watch: Cybersecurity Budgets Surge in SMEs',
    slug: 'data-watch-cybersecurity-budgets-surge-smes',
    summary: 'Small and medium businesses are finally investing in zero-trust security and training.',
    content:
      'Threat reports show a 240% increase in phishing attempts aimed at SMEs. In response, businesses are adopting managed detection services, passwordless authentication, and tabletop exercises. Analysts caution that tooling alone is not enough—culture and continuous training are key.',
    coverImageUrl: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_security',
    categoryId: 'c_demo_business',
    tags: ['Cybersecurity', 'SMB', 'Data'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    title: 'Wellness Beat: Breathwork Retreats Gain Mainstream Appeal',
    slug: 'wellness-beat-breathwork-retreats-gain-mainstream-appeal',
    summary: 'Breathwork retreats promise stress relief and better sleep—health pros weigh in.',
    content:
      'Retreat organizers say the pandemic-era surge in mental health awareness created demand for immersive breathwork. Psychologists advise pairing these retreats with counseling, while attendees report improved focus and emotional regulation. We unpack the science, costs, and accessibility questions.',
    coverImageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_wellness',
    categoryId: 'c_demo_health',
    tags: ['Wellness', 'Mental Health', 'Lifestyle'],
    status: 'Pending Review',
    publishedAt: null,
  },
  {
    title: 'Education Lab: AI Tutors Personalize Rural Classrooms',
    slug: 'education-lab-ai-tutors-personalize-rural-classrooms',
    summary: 'Schools deploy AI tutors that adapt lessons for multi-grade rural classrooms.',
    content:
      'AI-powered tablets are helping teachers differentiate instruction, especially where one classroom covers multiple grades. The program includes offline capabilities, teacher dashboards, and parent training. Early data points to higher mastery in maths and languages, though educators stress the need for infrastructure support.',
    coverImageUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_education',
    categoryId: 'c_demo_education',
    tags: ['Education', 'AI', 'Rural'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
  {
    title: 'Investor Brief: Impact Funds Back Circular Fashion',
    slug: 'investor-brief-impact-funds-back-circular-fashion',
    summary: 'Circular fashion startups attract impact capital focused on waste reduction.',
    content:
      'Impact funds are betting on textile recycling, biodegradable fabrics, and rental models. Founders say patient capital lets them scale supply chains and innovate in material science. Critics urge transparency on labor standards, while investors look for lifecycle assessments to verify sustainability claims.',
    coverImageUrl: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_finance',
    categoryId: 'c_demo_business',
    tags: ['Finance', 'Sustainability', 'Fashion'],
    status: 'Draft',
    publishedAt: null,
  },
  {
    title: 'Sports Edge: Analytics Redefine Community Cricket',
    slug: 'sports-edge-analytics-redefine-community-cricket',
    summary: 'Grassroots cricket clubs use analytics to train players and scout talent.',
    content:
      'Affordable sensors and open-source analytics platforms let community clubs track swing speeds, bowling angles, and field placement efficiency. Coaches say data keeps youth engaged, while scouts use the metrics to find prospects. The league is negotiating with broadcasters for richer match insights.',
    coverImageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_sports',
    categoryId: 'c_demo_sport',
    tags: ['Sports', 'Analytics', 'Community'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
  },
  {
    title: 'Art Now: Public Murals Spark Neighbourhood Renewal',
    slug: 'art-now-public-murals-spark-neighbourhood-renewal',
    summary: 'City-funded murals are revitalizing neglected spaces and supporting artists.',
    content:
      'Municipal grants paired artists with residents to co-design murals that reflect neighbourhood histories. Crime decreased in pilot zones, and nearby businesses report more foot traffic. Urban sociologists argue art projects build trust and create “third spaces” that foster dialogue.',
    coverImageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_art',
    categoryId: 'c_demo_culture',
    tags: ['Art', 'Community', 'Urban'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    isFeatured: false,
  },
  {
    title: 'Policy Radar: Water Resilience Bills Advance in Parliament',
    slug: 'policy-radar-water-resilience-bills-advance-parliament',
    summary: 'New legislation aims to build climate resilience across national water systems.',
    content:
      'Parliament is debating a suite of bills that mandate watershed protection, rainwater harvesting incentives, and modernized irrigation for farmers. The proposals include public scorecards and penalties for polluters. Environmental groups welcome the shift but warn of underfunding if budgets are not protected.',
    coverImageUrl: 'https://images.unsplash.com/photo-1497493292307-31c376b6e479?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_policy',
    categoryId: 'c_demo_environment',
    tags: ['Policy', 'Water', 'Climate'],
    status: 'Pending Review',
    publishedAt: null,
  },
  {
    title: 'Market Watch: Rural E-Commerce Surges After Logistics Upgrade',
    slug: 'market-watch-rural-ecommerce-surges-after-logistics-upgrade',
    summary: 'Last-mile partnerships unlock growth for rural artisans entering online markets.',
    content:
      'Regional logistics firms partnered with cooperatives to guarantee 48-hour shipping for rural sellers. Order volumes doubled in six months, and reverse logistics cut return costs by 35%. Sellers now bundle storytelling and livestream demos to build trust with urban buyers.',
    coverImageUrl: 'https://images.unsplash.com/photo-1515165562835-c4c6b2afb974?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_commerce',
    categoryId: 'c_demo_business',
    tags: ['E-commerce', 'Logistics', 'SMB'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
  },
  {
    title: 'Green Homes: Solar Co-Ops Bring Affordable Energy to Apartments',
    slug: 'green-homes-solar-coops-affordable-energy-apartments',
    summary: 'Apartment dwellers join solar cooperatives to slash utility bills and emissions.',
    content:
      'Solar co-ops negotiate group discounts, manage installation, and handle maintenance for apartment buildings. Residents buy shares and receive credits on their utility bills, while extra power feeds community centers. Regulators are now drafting guidelines to accelerate adoption nationwide.',
    coverImageUrl: 'https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_energy',
    categoryId: 'c_demo_environment',
    tags: ['Energy', 'Community', 'Innovation'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
  },
  {
    title: 'Human Stories: Rebuilding After the Monsoon',
    slug: 'human-stories-rebuilding-after-the-monsoon',
    summary: 'Families share how they rebuilt homes and livelihoods after historic floods.',
    content:
      'Monsoon floods devastated three districts last season. Months later, we follow families who rebuilt using resilient materials, community micro-insurance, and vocational training. Their stories highlight the intersection of climate adaptation, policy gaps, and personal hope.',
    coverImageUrl: 'https://images.unsplash.com/photo-1517957743393-41f8cf3ffd39?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_features',
    categoryId: 'c_demo_features',
    tags: ['Human Interest', 'Resilience', 'Climate'],
    status: 'Published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 21).toISOString(),
  },
  {
    title: 'Opinion: Building Ethical Guidelines for Generative AI',
    slug: 'opinion-building-ethical-guidelines-for-generative-ai',
    summary: 'Experts outline frameworks to make generative AI responsible and inclusive.',
    content:
      'Generative AI opens creative doors but raises thorny questions about consent, bias, and attribution. Policy researchers propose guidelines that prioritize community consultation, dataset transparency, and equitable revenue sharing. Without action, they warn, marginalized creators will be left out of the AI boom.',
    coverImageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    authorId: 'u_demo_author_opinion',
    categoryId: 'c_demo_opinion',
    tags: ['AI', 'Ethics', 'Opinion'],
    status: 'Draft',
    publishedAt: null,
  },
];

async function slugExists(slug: string): Promise<boolean> {
  const command = new QueryCommand({
    TableName: ARTICLES_TABLE,
    IndexName: SLUG_GSI_NAME,
    KeyConditionExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':slug': slug },
  });

  const result = await docClient.send(command);
  return Boolean(result.Items && result.Items.length > 0);
}

async function writeArticles(items: ArticleItem[]): Promise<void> {
  const chunks: ArticleItem[][] = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const command = new BatchWriteCommand({
      RequestItems: {
        [ARTICLES_TABLE]: chunk.map((item) => ({
          PutRequest: {
            Item: item,
          },
        })),
      },
    });

    const response = await docClient.send(command);
    const unprocessed = response.UnprocessedItems?.[ARTICLES_TABLE];

    if (unprocessed && unprocessed.length > 0) {
      throw new Error(`Failed to process ${unprocessed.length} article(s). Please retry the seed.`);
    }
  }
}

async function seedArticles() {
  try {
    console.log(`Seeding articles into table "${ARTICLES_TABLE}" in region "${REGION}"`);

    const newArticles: ArticleItem[] = [];

    for (const seed of ARTICLE_SEEDS) {
      const exists = await slugExists(seed.slug);
      if (exists) {
        console.log(`Skipping "${seed.title}" (slug already exists)`);
        continue;
      }

      newArticles.push(createArticleItem(seed));
    }

    if (newArticles.length === 0) {
      console.log('No new articles to insert.');
      return;
    }

    await writeArticles(newArticles);

    console.log(`Inserted ${newArticles.length} article(s):`);
    newArticles.forEach((article) => {
      console.log(` - ${article.title} (${article.slug})`);
    });
  } catch (error) {
    console.error('Error seeding articles:', error);
    process.exit(1);
  }
}

seedArticles()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
