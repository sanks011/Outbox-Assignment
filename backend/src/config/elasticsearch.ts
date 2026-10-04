import { Client } from '@elastic/elasticsearch';
import { config } from './env.js';

export const esClient = new Client({
  node: config.elasticsearch.url,
  maxRetries: 3,
  requestTimeout: 4000,
});

let isElasticsearchConnected = false;

export async function initElasticsearch() {
  try {
    const health = await esClient.cluster.health();
    isElasticsearchConnected = true;
    console.log(`✅ Connected to Elasticsearch [Status: ${health.status}]`);

    const indexName = config.elasticsearch.index;
    const exists = await esClient.indices.exists({ index: indexName });

    if (!exists) {
      await esClient.indices.create({
        index: indexName,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            bullJobId: { type: 'keyword' },
            userId: { type: 'keyword' },
            from: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            to: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text', analyzer: 'standard' },
            body: { type: 'text', analyzer: 'standard' },
            status: { type: 'keyword' },
            scheduledFor: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`✅ Created Elasticsearch index: ${indexName}`);
    }
  } catch (error: any) {
    isElasticsearchConnected = false;
    console.warn(`⚠️ Elasticsearch is currently unavailable at ${config.elasticsearch.url} (${error.message}). Will use resilient DB fallback until started.`);
  }
}

export function getElasticsearchStatus(): boolean {
  return isElasticsearchConnected;
}
