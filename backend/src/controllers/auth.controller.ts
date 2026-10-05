import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const googleClient = new OAuth2Client(config.google.clientId);

export class AuthController {
  /**
   * Get Public Auth Configuration (Google Client ID, Slack features)
   */
  static getAuthConfig(_req: Request, res: Response) {
    return res.json({
      googleClientId: config.google.clientId || null,
      hasSlackWebhook: Boolean(config.slack.webhookUrl),
      hasSlackOAuth: Boolean(config.slack.clientId && config.slack.clientSecret),
    });
  }

  /**
   * Google OAuth Login / Token Verification
   */
  static async googleLogin(req: Request, res: Response) {
    try {
      const { credential, userInfo } = req.body;

      let email = userInfo?.email;
      let name = userInfo?.name;
      let avatar = userInfo?.picture;
      let googleId = userInfo?.sub || userInfo?.id;

      // If a real credential (Google ID token) was passed and client ID configured, verify it
      if (credential && config.google.clientId) {
        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: config.google.clientId,
          });
          const payload = ticket.getPayload();
          if (payload) {
            email = payload.email;
            name = payload.name;
            avatar = payload.picture;
            googleId = payload.sub;
          }
        } catch (err: any) {
          console.warn(`[Google Auth] ID Token verification notice: ${err.message}. Proceeding with payload.`);
        }
      }

      if (!email) {
        return res.status(400).json({ error: 'Email is required from Google sign-in' });
      }

      // Upsert User in DB
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            googleId,
          },
        });

        // Add default sender account for this user
        await prisma.senderAccount.create({
          data: {
            email,
            name: name || email.split('@')[0],
            isDefault: true,
            userId: user.id,
          },
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      return res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
  }

  /**
   * Email and Password Login (supports any email, auto-creates user if not exists)
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email ID is required' });
      }

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0],
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          },
        });

        await prisma.senderAccount.create({
          data: {
            email,
            name: user.name || email,
            isDefault: true,
            userId: user.id,
          },
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      console.error('Login Error:', error);
      return res.status(500).json({ error: 'Failed to login' });
    }
  }

  /**
   * Instant Demo Login as Oliver Brown (Figma design persona)
   */
  static async demoLogin(_req: Request, res: Response) {
    try {
      const demoEmail = 'oliver.brown@domain.io';
      let user = await prisma.user.findUnique({ where: { email: demoEmail } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: 'demo-user-oliver',
            email: demoEmail,
            name: 'Oliver Brown',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          },
        });

        await prisma.senderAccount.createMany({
          data: [
            {
              email: 'oliver.brown@domain.io',
              name: 'Oliver Brown',
              isDefault: true,
              userId: user.id,
            },
            {
              email: 'sender@example.com',
              name: 'Amanda Clark',
              isDefault: false,
              userId: user.id,
            },
          ],
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      console.error('Demo Login Error:', error);
      return res.status(500).json({ error: 'Failed to demo login' });
    }
  }

  /**
   * Get Current Authenticated User Profile
   */
  static async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const email = req.user?.email;
      if (!email) {
        return res.status(401).json({ error: 'Unauthorized: No email associated with token' });
      }

      let user = await prisma.user.findUnique({
        where: { email },
        include: { senderAccounts: true, slackIntegration: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: req.user?.id || undefined,
            email,
            name: req.user?.name || email.split('@')[0],
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          },
          include: { senderAccounts: true, slackIntegration: true },
        });

        await prisma.senderAccount.create({
          data: {
            email,
            name: user.name || email,
            isDefault: true,
            userId: user.id,
          },
        });
      }

      return res.json(user);
    } catch (error: any) {
      console.error('Get Me Error:', error);
      return res.status(500).json({ error: 'Failed to retrieve profile' });
    }
  }
}
