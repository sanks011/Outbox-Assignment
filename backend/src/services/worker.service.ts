import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './queue.service.js';
import { redisOptions, redisClient } from '../config/redis.js';
import { config } from '../config/env.js';
import { EmailService } from './email.service.js';
import { ElasticsearchService } from './elasticsearch.service.js';
import { SlackService } from './slack.service.js';
import { prisma } from '../config/db.js';

let workerInstance: Worker<EmailJobData> | null = null;

/**
 * Get current 1-hour time window key for Redis (e.g. "2025-05-10T14")
 */
function getHourWindowKey(sender: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const windowId = `${year}-${month}-${day}-${hour}`;
  return `ratelimit:${sender.toLowerCase().trim()}:${windowId}`;
}

/**
 * Get start of next hour
 */
function getStartOfNextHour(): Date {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour;
}

export class WorkerService {
  /**
   * Initialize and start the BullMQ Worker
   */
  static startWorker(): Worker<EmailJobData> {
    if (workerInstance) {
      return workerInstance;
    }

    const concurrency = config.scheduler.workerConcurrency;
    console.log(`🚀 Starting BullMQ Email Worker with concurrency = ${concurrency}`);

    workerInstance = new Worker<EmailJobData>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobData>) => {
        const { jobId, from, to, subject, body, delaySeconds, hourlyLimit } = job.data;
        console.log(`[Worker] Picked up job ${job.id} for recipient: ${to} (Sender: ${from})`);

        // Step 1: Idempotency Check in Database
        const dbJob = await prisma.emailJob.findUnique({
          where: { id: jobId },
        });

        if (!dbJob) {
          console.warn(`[Worker] Job ${jobId} not found in database. Skipping.`);
          return { status: 'skipped', reason: 'job_not_found' };
        }

        if (dbJob.status === 'sent') {
          console.log(`[Worker] Job ${jobId} was already sent previously. Skipping duplicate send.`);
          return { status: 'already_sent' };
        }

        // Step 2: Rate Limiting Check (Redis hourly counter per sender)
        const effectiveLimit = hourlyLimit || config.scheduler.maxEmailsPerHourPerSender;
        const rateLimitKey = getHourWindowKey(from);

        const currentCountStr = await redisClient.get(rateLimitKey);
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

        if (currentCount >= effectiveLimit) {
          const nextWindow = getStartOfNextHour();
          const rescheduleDelay = Math.max(10000, nextWindow.getTime() - Date.now());

          console.warn(`🚨 [RATE LIMIT HIT] Sender [${from}] reached hourly limit of ${effectiveLimit} emails/hr (${currentCount} sent).`);
          console.warn(`⏳ Rescheduling job ${job.id} to next window at ${nextWindow.toISOString()} (Delay: ${Math.round(rescheduleDelay / 1000)}s)`);

          // Reschedule DB state
          await prisma.emailJob.update({
            where: { id: jobId },
            data: {
              status: 'rescheduled',
              scheduledFor: nextWindow,
            },
          });

          // Update Elasticsearch
          await ElasticsearchService.updateEmailStatus(jobId, 'rescheduled');

          // Send Alert to Slack
          await SlackService.sendRateLimitAlert({
            sender: from,
            hourlyLimit: effectiveLimit,
            currentCount,
            nextWindowTime: nextWindow,
            jobId: job.id,
            recipient: to,
          });

          // Reschedule in BullMQ for next window
          await emailQueue.add('send-email', {
            ...job.data,
            scheduledFor: nextWindow.toISOString(),
          }, {
            jobId: `email-${jobId}-rescheduled-${Date.now()}`,
            delay: rescheduleDelay,
          });

          return {
            status: 'rate_limited',
            rescheduledTo: nextWindow.toISOString(),
          };
        }

        // Increment Redis rate limit counter with a 2-hour TTL
        await redisClient.incr(rateLimitKey);
        await redisClient.expire(rateLimitKey, 7200);

        // Step 3: Update DB to 'processing'
        await prisma.emailJob.update({
          where: { id: jobId },
          data: { status: 'processing' },
        });

        try {
          // Step 4: Send Email via Ethereal SMTP
          const sendResult = await EmailService.sendEmail({
            from,
            to,
            subject,
            body,
          });

          const sentAt = new Date();
          const previewUrl = sendResult.previewUrl || null;

          // Step 5: Mark as sent in Database
          await prisma.emailJob.update({
            where: { id: jobId },
            data: {
              status: 'sent',
              sentAt,
              etherealUrl: previewUrl,
            },
          });

          // Step 6: Update Elasticsearch Index
          await ElasticsearchService.updateEmailStatus(jobId, 'sent', sentAt, previewUrl);

          // Step 7: Apply Inter-Email Throttle Delay (provider throttling mimic)
          const waitTime = (delaySeconds || config.scheduler.defaultDelayBetweenEmails) * 1000;
          if (waitTime > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }

          return {
            status: 'sent',
            sentAt,
            previewUrl,
          };
        } catch (error: any) {
          console.error(`❌ [Worker] Failed to send email ${jobId} to ${to}:`, error.message);

          const failedAt = new Date();
          await prisma.emailJob.update({
            where: { id: jobId },
            data: {
              status: 'failed',
              failedAt,
              errorReason: error.message,
              retryCount: { increment: 1 },
            },
          });

          await ElasticsearchService.updateEmailStatus(jobId, 'failed', null, null, error.message);
          throw error;
        }
      },
      {
        connection: redisOptions,
        concurrency,
      }
    );

    workerInstance.on('completed', (job) => {
      console.log(`✅ [Worker] Successfully completed job ${job.id}`);
    });

    workerInstance.on('failed', (job, err) => {
      console.error(`❌ [Worker] Job ${job?.id} failed:`, err.message);
    });

    return workerInstance;
  }

  /**
   * Resync scheduled jobs from Database on server startup to ensure persistence
   */
  static async resyncPendingJobs(): Promise<void> {
    try {
      const pendingJobs = await prisma.emailJob.findMany({
        where: {
          status: { in: ['scheduled', 'rescheduled'] },
        },
      });

      console.log(`🔄 Checking persistence: Found ${pendingJobs.length} scheduled jobs in database.`);

      for (const job of pendingJobs) {
        const bullJobId = `email-${job.id}`;
        const existingJob = await emailQueue.getJob(bullJobId);

        // If job was lost from Redis or not yet enqueued, re-enqueue with correct remaining delay
        if (!existingJob) {
          const now = Date.now();
          const targetTime = new Date(job.scheduledFor).getTime();
          const delay = Math.max(0, targetTime - now);

          await emailQueue.add(
            'send-email',
            {
              jobId: job.id,
              userId: job.userId,
              from: job.from,
              to: job.to,
              subject: job.subject,
              body: job.body,
              scheduledFor: job.scheduledFor.toISOString(),
              delaySeconds: job.delaySeconds,
              hourlyLimit: job.hourlyLimit,
            },
            {
              jobId: bullJobId,
              delay,
            }
          );
          console.log(`🔄 Re-synced job ${bullJobId} with remaining delay ${delay}ms`);
        }
      }
    } catch (err: any) {
      console.warn(`[Worker] Pending jobs resync notice: ${err.message}`);
    }
  }

  /**
   * Close worker gracefully
   */
  static async stopWorker(): Promise<void> {
    if (workerInstance) {
      await workerInstance.close();
      workerInstance = null;
    }
  }
}
