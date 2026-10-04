import { esClient, getElasticsearchStatus } from '../config/elasticsearch.js';
import { config } from '../config/env.js';
import { prisma } from '../config/db.js';

export interface EmailDocument {
  id: string;
  bullJobId: string;
  userId?: string | null;
  from: string;
  to: string;
  subject: string;
  body: string;
  status: string;
  scheduledFor: Date | string;
  sentAt?: Date | string | null;
  createdAt: Date | string;
}

export class ElasticsearchService {
  /**
   * Index or update an email document in Elasticsearch
   */
  static async indexEmail(doc: EmailDocument): Promise<void> {
    try {
      if (!getElasticsearchStatus()) return;

      await esClient.index({
        index: config.elasticsearch.index,
        id: doc.id,
        document: {
          id: doc.id,
          bullJobId: doc.bullJobId,
          userId: doc.userId,
          from: doc.from,
          to: doc.to,
          subject: doc.subject,
          body: doc.body,
          status: doc.status,
          scheduledFor: new Date(doc.scheduledFor).toISOString(),
          sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
          createdAt: new Date(doc.createdAt).toISOString(),
        },
        refresh: true, // Make immediately searchable
      });
    } catch (error: any) {
      console.warn(`[Elasticsearch] Index error for doc ${doc.id}: ${error.message}`);
    }
  }

  /**
   * Update email status in Elasticsearch
   */
  static async updateEmailStatus(id: string, status: string, sentAt?: Date | null, etherealUrl?: string | null, errorReason?: string | null): Promise<void> {
    try {
      if (!getElasticsearchStatus()) return;

      await esClient.update({
        index: config.elasticsearch.index,
        id,
        doc: {
          status,
          sentAt: sentAt ? new Date(sentAt).toISOString() : null,
          etherealUrl,
          errorReason,
        },
        refresh: true,
      });
    } catch (error: any) {
      console.warn(`[Elasticsearch] Status update error for doc ${id}: ${error.message}`);
    }
  }

  /**
   * Search emails using Elasticsearch multi-match query with fuzziness,
   * falling back to DB if ES is unavailable.
   */
  static async searchEmails(params: {
    query?: string;
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { query = '', status, limit = 50, offset = 0 } = params;

    // Try Elasticsearch if connected
    if (getElasticsearchStatus() && query.trim()) {
      try {
        const mustClauses: any[] = [];

        mustClauses.push({
          multi_match: {
            query: query.trim(),
            fields: ['subject^3', 'to^2', 'from^2', 'body'],
            fuzziness: 'AUTO',
          },
        });

        if (status) {
          mustClauses.push({ term: { status } });
        }

        const response = await esClient.search({
          index: config.elasticsearch.index,
          from: offset,
          size: limit,
          query: {
            bool: {
              must: mustClauses,
            },
          },
          sort: [
            { _score: { order: 'desc' } },
            { scheduledFor: { order: 'desc' } },
          ],
        });

        const hits = response.hits.hits.map((hit: any) => hit._source);
        const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;

        return {
          source: 'elasticsearch',
          total,
          emails: hits,
        };
      } catch (err: any) {
        console.warn(`[Elasticsearch] Query failed, falling back to DB: ${err.message}`);
      }
    }

    // Fallback to PostgreSQL via Prisma
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (query.trim()) {
      where.OR = [
        { subject: { contains: query.trim(), mode: 'insensitive' } },
        { to: { contains: query.trim(), mode: 'insensitive' } },
        { from: { contains: query.trim(), mode: 'insensitive' } },
        { body: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledFor: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.emailJob.count({ where }),
    ]);

    return {
      source: 'database',
      total,
      emails,
    };
  }
}
