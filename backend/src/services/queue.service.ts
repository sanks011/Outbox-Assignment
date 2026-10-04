import { Queue, QueueEvents } from 'bullmq';
import { redisOptions } from '../config/redis.js';

export const EMAIL_QUEUE_NAME = 'email-scheduler-queue';

export interface EmailJobData {
  jobId: string; // Database EmailJob UUID
  userId?: string | null;
  from: string;
  to: string;
  subject: string;
  body: string;
  scheduledFor: string;
  delaySeconds: number;
  hourlyLimit: number;
  attempt?: number;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false, // Keep in Redis for history and Bull-Board visibility
    removeOnFail: false,
  },
});

export const queueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: redisOptions,
});

queueEvents.on('completed', ({ jobId }) => {
  console.log(`[QueueEvent] Job ${jobId} completed successfully`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.warn(`[QueueEvent] Job ${jobId} failed: ${failedReason}`);
});

export class QueueService {
  /**
   * Schedule a single email job in BullMQ with calculated delay
   */
  static async scheduleEmailJob(data: EmailJobData, targetTime: Date): Promise<string> {
    const now = Date.now();
    const targetTimestamp = new Date(targetTime).getTime();
    const delay = Math.max(0, targetTimestamp - now);

    const bullJobId = `email-${data.jobId}`;

    const job = await emailQueue.add('send-email', data, {
      jobId: bullJobId, // Idempotent key
      delay,
    });

    console.log(`[QueueService] Enqueued job ${bullJobId} for ${data.to} (Scheduled delay: ${delay}ms / ${new Date(targetTime).toISOString()})`);
    return job.id || bullJobId;
  }

  /**
   * Remove or cancel a job from the queue
   */
  static async removeJob(bullJobId: string): Promise<boolean> {
    try {
      const job = await emailQueue.getJob(bullJobId);
      if (job) {
        await job.remove();
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn(`[QueueService] Error removing job ${bullJobId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Get queue statistics for dashboard
   */
  static async getQueueMetrics() {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        emailQueue.getWaitingCount(),
        emailQueue.getActiveCount(),
        emailQueue.getCompletedCount(),
        emailQueue.getFailedCount(),
        emailQueue.getDelayedCount(),
        emailQueue.isPaused(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
      };
    } catch {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
      };
    }
  }
}
