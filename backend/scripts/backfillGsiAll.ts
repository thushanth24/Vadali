/**
 * One-time backfill: stamp `gsiAll = "ARTICLE"` on every existing article so it
 * appears in the all-created-index GSI (used for global newest-first ordering).
 *
 * New/edited articles get this automatically via ArticleRepository.toDB. This
 * script covers rows written before the GSI existed.
 *
 * Run AFTER the GSI is deployed and ACTIVE, and BEFORE switching the frontend.
 *
 * Usage:
 *   ts-node scripts/backfillGsiAll.ts --table <name> --region <region> [--dry-run]
 * Env fallbacks: ARTICLES_TABLE, AWS_REGION/AWS_DEFAULT_REGION.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ARTICLE_GSI_ALL = 'ARTICLE';

const args = process.argv.slice(2);

const getArgValue = (keys: string[]): string | undefined => {
  for (const key of keys) {
    const index = args.findIndex((arg) => arg === key || arg.startsWith(`${key}=`));
    if (index === -1) continue;
    const raw = args[index];
    if (raw.includes('=')) return raw.split('=').slice(1).join('=');
    return args[index + 1];
  }
  return undefined;
};

const hasFlag = (key: string) => args.some((arg) => arg === key);

const REGION =
  getArgValue(['--region', '-r']) ||
  process.env.ARTICLES_REGION ||
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  'us-east-1';

const ARTICLES_TABLE =
  getArgValue(['--table', '-t']) || process.env.ARTICLES_TABLE || 'vadali-media-articles-dev';

const DRY_RUN = hasFlag('--dry-run');

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

const run = async () => {
  console.log(`Backfill gsiAll on table "${ARTICLES_TABLE}" (region ${REGION})${DRY_RUN ? ' [DRY RUN]' : ''}`);

  let lastEvaluatedKey: Record<string, any> | undefined;
  let scanned = 0;
  let updated = 0;
  let alreadySet = 0;
  const failures: { id: string; reason: string }[] = [];

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: ARTICLES_TABLE,
        ProjectionExpression: 'id, gsiAll, publishedAt',
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    const items = result.Items ?? [];
    for (const item of items) {
      scanned += 1;

      if (item.gsiAll === ARTICLE_GSI_ALL) {
        alreadySet += 1;
        continue;
      }

      if (DRY_RUN) {
        updated += 1;
        continue;
      }

      // Older rows store publishedAt as a DynamoDB NULL, which violates the
      // publishedAt-index (key type S) and blocks ANY write. The doc client
      // unmarshals that NULL to JS null, so drop the empty field — matching
      // ArticleRepository.toDB, which deletes null/empty publishedAt on write.
      const hasNullPublishedAt = item.publishedAt === null;
      const updateExpression = hasNullPublishedAt
        ? 'SET gsiAll = :v REMOVE publishedAt'
        : 'SET gsiAll = :v';

      try {
        await docClient.send(
          new UpdateCommand({
            TableName: ARTICLES_TABLE,
            Key: { id: item.id },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: { ':v': ARTICLE_GSI_ALL },
          })
        );
        updated += 1;
      } catch (err) {
        // Don't abort the whole run for one bad row — record and continue.
        failures.push({ id: String(item.id), reason: err instanceof Error ? err.message : String(err) });
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Done. Scanned ${scanned}, ${DRY_RUN ? 'would update' : 'updated'} ${updated}, already set ${alreadySet}, failed ${failures.length}.`
  );

  if (failures.length > 0) {
    console.log('\nFailed items (need inspection):');
    for (const f of failures) {
      console.log(`  ${f.id} -> ${f.reason}`);
    }
  }
};

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
