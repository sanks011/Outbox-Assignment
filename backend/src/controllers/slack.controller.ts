import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { SlackService } from '../services/slack.service.js';
import { config } from '../config/env.js';

export class SlackController {
  /**
   * Get current Slack integration status
   */
  static async getStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const status = await SlackService.getStatus(req.user?.id);
      return res.json(status);
    } catch (error: any) {
      console.error('Slack Get Status Error:', error);
      return res.status(500).json({ error: 'Failed to retrieve Slack status' });
    }
  }

  /**
   * Save incoming webhook URL directly
   */
  static async saveWebhook(req: AuthenticatedRequest, res: Response) {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
        return res.status(400).json({ error: 'Valid Slack webhook URL is required (must start with https://hooks.slack.com/)' });
      }

      await SlackService.saveWebhook(webhookUrl, req.user?.id);
      return res.json({ success: true, message: 'Slack Webhook connected successfully' });
    } catch (error: any) {
      console.error('Save Webhook Error:', error);
      return res.status(500).json({ error: 'Failed to save Slack Webhook' });
    }
  }

  /**
   * Disconnect Slack integration
   */
  static async disconnect(req: AuthenticatedRequest, res: Response) {
    try {
      await SlackService.disconnect(req.user?.id);
      return res.json({ success: true, message: 'Slack disconnected' });
    } catch (error: any) {
      console.error('Disconnect Slack Error:', error);
      return res.status(500).json({ error: 'Failed to disconnect Slack' });
    }
  }

  /**
   * Slack OAuth Start - Redirect to Slack consent screen
   */
  static async oauthStart(req: AuthenticatedRequest, res: Response) {
    try {
      if (!config.slack.clientId) {
        return res.status(400).json({
          error: 'SLACK_CLIENT_ID not configured in .env. You can also connect via Slack Incoming Webhook directly.',
        });
      }
      const url = SlackService.getOAuthAuthorizeUrl(req.user?.id);
      return res.json({ url });
    } catch (error: any) {
      console.error('OAuth Start Error:', error);
      return res.status(500).json({ error: 'Failed to generate Slack OAuth URL' });
    }
  }

  /**
   * Slack OAuth Callback handler
   */
  static async oauthCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;
      if (!code) {
        return res.redirect(`${config.frontendUrl}?slack_error=no_code`);
      }

      await SlackService.handleOAuthCallback(code as string, state as string);
      return res.redirect(`${config.frontendUrl}?slack_connected=true`);
    } catch (error: any) {
      console.error('OAuth Callback Error:', error);
      return res.redirect(`${config.frontendUrl}?slack_error=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Trigger a live test rate-limit alert to Slack
   */
  static async testAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const nextWindow = new Date();
      nextWindow.setHours(nextWindow.getHours() + 1, 0, 0, 0);

      const sender = req.body.sender || req.user?.email || 'sender@reachinbox.ai';
      const hourlyLimit = req.body.hourlyLimit || 50;

      const sent = await SlackService.sendRateLimitAlert({
        sender,
        hourlyLimit,
        currentCount: hourlyLimit,
        nextWindowTime: nextWindow,
        jobId: `test-job-${Date.now()}`,
        recipient: 'lead-test@reachinbox.ai',
      });

      if (!sent) {
        return res.status(400).json({
          success: false,
          message: 'Slack alert could not be sent. Please configure a Slack Webhook or connect via Slack OAuth first.',
        });
      }

      return res.json({
        success: true,
        message: 'Live test rate-limit alert sent to Slack successfully! Check your Slack channel.',
      });
    } catch (error: any) {
      console.error('Test Alert Error:', error);
      return res.status(500).json({ error: error.message || 'Failed to send test alert' });
    }
  }
}
