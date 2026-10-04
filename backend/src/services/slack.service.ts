import axios from 'axios';
import { WebClient } from '@slack/web-api';
import { config } from '../config/env.js';
import { prisma } from '../config/db.js';

export class SlackService {
  /**
   * Generate Slack OAuth Authorization URL
   */
  static getOAuthAuthorizeUrl(userId?: string): string {
    const clientId = config.slack.clientId;
    const redirectUri = encodeURIComponent(config.slack.redirectUri);
    const scope = encodeURIComponent('chat:write,incoming-webhook');
    const state = userId || 'default-user';

    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
  }

  /**
   * Exchange OAuth code for access token and webhook URL
   */
  static async handleOAuthCallback(code: string, stateUserId?: string): Promise<{ success: boolean; team?: string; channel?: string }> {
    try {
      const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
        params: {
          client_id: config.slack.clientId,
          client_secret: config.slack.clientSecret,
          code,
          redirect_uri: config.slack.redirectUri,
        },
      });

      const data = response.data;
      if (!data.ok) {
        throw new Error(data.error || 'Failed to exchange Slack OAuth code');
      }

      const accessToken = data.access_token;
      const teamName = data.team?.name || 'Slack Workspace';
      const webhookUrl = data.incoming_webhook?.url;
      const channel = data.incoming_webhook?.channel;

      const userId = stateUserId && stateUserId !== 'default-user' ? stateUserId : undefined;

      await prisma.slackIntegration.upsert({
        where: { userId: userId || 'system-global' },
        create: {
          userId: userId || 'system-global',
          accessToken,
          webhookUrl,
          teamName,
          channel,
          isConnected: true,
        },
        update: {
          accessToken,
          webhookUrl,
          teamName,
          channel,
          isConnected: true,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Slack connected successfully for team: ${teamName}`);
      return { success: true, team: teamName, channel };
    } catch (error: any) {
      console.error('❌ Slack OAuth Callback Error:', error.message);
      throw error;
    }
  }

  /**
   * Save incoming webhook URL directly (alternative to OAuth)
   */
  static async saveWebhook(webhookUrl: string, userId?: string): Promise<void> {
    const targetUserId = userId || 'system-global';
    await prisma.slackIntegration.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        webhookUrl,
        isConnected: true,
      },
      update: {
        webhookUrl,
        isConnected: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Disconnect Slack
   */
  static async disconnect(userId?: string): Promise<void> {
    const targetUserId = userId || 'system-global';
    await prisma.slackIntegration.updateMany({
      where: { userId: targetUserId },
      data: { isConnected: false, webhookUrl: null, accessToken: null },
    });
  }

  /**
   * Get active Slack integration status
   */
  static async getStatus(userId?: string): Promise<{ isConnected: boolean; teamName?: string | null; channel?: string | null; webhookConfigured: boolean }> {
    const targetUserId = userId || 'system-global';
    const integration = await prisma.slackIntegration.findFirst({
      where: {
        OR: [{ userId: targetUserId }, { userId: 'system-global' }],
        isConnected: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const hasEnvWebhook = Boolean(config.slack.webhookUrl);

    if (integration) {
      return {
        isConnected: true,
        teamName: integration.teamName || 'Connected Workspace',
        channel: integration.channel || 'general',
        webhookConfigured: Boolean(integration.webhookUrl || hasEnvWebhook),
      };
    }

    if (hasEnvWebhook) {
      return {
        isConnected: true,
        teamName: 'Configured via .env Webhook',
        channel: 'default',
        webhookConfigured: true,
      };
    }

    return {
      isConnected: false,
      teamName: null,
      channel: null,
      webhookConfigured: false,
    };
  }

  /**
   * Send Rate Limit Alert to Slack
   */
  static async sendRateLimitAlert(details: {
    sender: string;
    hourlyLimit: number;
    currentCount: number;
    nextWindowTime: Date;
    jobId?: string;
    recipient?: string;
  }): Promise<boolean> {
    const integration = await prisma.slackIntegration.findFirst({
      where: { isConnected: true },
      orderBy: { updatedAt: 'desc' },
    });

    const webhookUrl = integration?.webhookUrl || config.slack.webhookUrl;
    const accessToken = integration?.accessToken;

    if (!webhookUrl && !accessToken) {
      console.warn(`[Slack] Rate limit reached for ${details.sender}, but no Slack integration is connected. Skipping notification.`);
      return false;
    }

    const formattedTime = details.nextWindowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const messagePayload = {
      text: `🚨 [Rate Limit Reached] Sender ${details.sender} exceeded hourly limit!`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ ReachInbox Scheduler: Hourly Rate Limit Hit',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:*\n\`${details.sender}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n\`${details.hourlyLimit} emails / hr\``,
            },
            {
              type: 'mrkdwn',
              text: `*Current Counter:*\n\`${details.currentCount} sent\``,
            },
            {
              type: 'mrkdwn',
              text: `*Next Available Window:*\n\`${formattedTime}\``,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: details.recipient 
              ? `*Action Taken:* Email to \`${details.recipient}\` (Job: \`${details.jobId || 'N/A'}\`) has been preserved and automatically *delayed to the next window* without dropping.`
              : `*Action Taken:* Pending jobs for this sender have been automatically rescheduled to preserve delivery sequence and protect sender reputation.`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `⏰ Timestamp: ${new Date().toISOString()} | Powered by ReachInbox Job Scheduler`,
            },
          ],
        },
      ],
    };

    try {
      if (webhookUrl) {
        await axios.post(webhookUrl, messagePayload);
        console.log(`📣 [Slack Notification Sent via Webhook] Alerted rate limit for ${details.sender}`);
        return true;
      } else if (accessToken && integration?.channel) {
        const client = new WebClient(accessToken);
        await client.chat.postMessage({
          channel: integration.channel,
          ...messagePayload,
        });
        console.log(`📣 [Slack Notification Sent via WebClient] Alerted rate limit for ${details.sender}`);
        return true;
      }
    } catch (error: any) {
      console.error(`❌ Failed to send Slack alert: ${error.message}`);
    }

    return false;
  }
}
