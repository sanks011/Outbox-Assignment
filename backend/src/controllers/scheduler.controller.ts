import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../config/db.js';
import { QueueService } from '../services/queue.service.js';
import { ElasticsearchService } from '../services/elasticsearch.service.js';
import { config } from '../config/env.js';

export class SchedulerController {
  /**
   * Schedule one or more emails (bulk CSV leads or single recipient)
   */
  static async scheduleEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        from,
        to,
        subject,
        body,
        scheduledTime,
        delayBetweenEmails,
        hourlyLimit,
        attachments,
      } = req.body;

      if (!from || !to || !subject || !body) {
        return res.status(400).json({
          error: 'Missing required fields: from, to, subject, body are required',
        });
      }

      // Normalize recipients list
      const recipients: string[] = Array.isArray(to)
        ? to.map((e: string) => e.trim()).filter(Boolean)
        : [to.trim()];

      if (recipients.length === 0) {
        return res.status(400).json({ error: 'At least one recipient email is required' });
      }

      const delaySec = typeof delayBetweenEmails === 'number' && delayBetweenEmails >= 0
        ? delayBetweenEmails
        : config.scheduler.defaultDelayBetweenEmails;

      const limit = typeof hourlyLimit === 'number' && hourlyLimit > 0
        ? hourlyLimit
        : config.scheduler.maxEmailsPerHourPerSender;

      const baseStartTime = scheduledTime ? new Date(scheduledTime).getTime() : Date.now();
      const currentNow = Date.now();
      const effectiveBaseTime = Math.max(currentNow, baseStartTime);

      const createdJobs: any[] = [];

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        // Stagger scheduled send time by delaySec for each email in list
        const staggeredTimestamp = effectiveBaseTime + i * (delaySec * 1000);
        const targetDate = new Date(staggeredTimestamp);

        // 1. Create Job in Database
        const tempId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const emailJob = await prisma.emailJob.create({
          data: {
            bullJobId: tempId,
            userId: req.user?.id || null,
            from,
            to: recipient,
            subject,
            body,
            attachments: attachments ? JSON.stringify(attachments) : null,
            status: 'scheduled',
            scheduledFor: targetDate,
            delaySeconds: delaySec,
            hourlyLimit: limit,
          },
        });

        // 2. Schedule in BullMQ with calculated delay
        const bullJobId = await QueueService.scheduleEmailJob(
          {
            jobId: emailJob.id,
            userId: req.user?.id || null,
            from,
            to: recipient,
            subject,
            body,
            scheduledFor: targetDate.toISOString(),
            delaySeconds: delaySec,
            hourlyLimit: limit,
          },
          targetDate
        );

        // Update bullJobId in database if different
        if (bullJobId !== emailJob.bullJobId) {
          await prisma.emailJob.update({
            where: { id: emailJob.id },
            data: { bullJobId },
          });
        }

        // 3. Index in Elasticsearch
        await ElasticsearchService.indexEmail({
          id: emailJob.id,
          bullJobId,
          userId: req.user?.id,
          from,
          to: recipient,
          subject,
          body,
          status: 'scheduled',
          scheduledFor: targetDate,
          createdAt: emailJob.createdAt,
        });

        createdJobs.push({
          id: emailJob.id,
          bullJobId,
          to: recipient,
          from,
          subject,
          scheduledFor: targetDate,
          delaySeconds: delaySec,
        });
      }

      return res.status(201).json({
        success: true,
        message: `Successfully scheduled ${recipients.length} email(s)`,
        count: recipients.length,
        jobs: createdJobs,
      });
    } catch (error: any) {
      console.error('Schedule Emails Error:', error);
      return res.status(500).json({ error: error.message || 'Failed to schedule email' });
    }
  }
}
