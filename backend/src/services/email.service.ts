import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';

let sharedTransporter: Transporter | null = null;
let etherealCredentials: { user: string; pass: string } | null = null;

export class EmailService {
  /**
   * Initialize or retrieve the Ethereal SMTP transporter
   */
  static async getTransporter(): Promise<Transporter> {
    if (sharedTransporter) {
      return sharedTransporter;
    }

    let user = config.ethereal.user;
    let pass = config.ethereal.pass;

    // Automatically create a dynamic Ethereal test account if credentials are not provided
    if (!user || !pass) {
      if (!etherealCredentials) {
        console.log('🔄 No Ethereal credentials in .env. Generating automatic Ethereal test account...');
        try {
          const testAccount = await nodemailer.createTestAccount();
          etherealCredentials = {
            user: testAccount.user,
            pass: testAccount.pass,
          };
          user = testAccount.user;
          pass = testAccount.pass;
          console.log(`✅ Generated Ethereal Test Account:`);
          console.log(`   User: ${user}`);
          console.log(`   Pass: ${pass}`);
          console.log(`   Web Interface: https://ethereal.email/messages`);
        } catch (err: any) {
          console.error('❌ Failed to create automatic Ethereal test account:', err.message);
          throw err;
        }
      } else {
        user = etherealCredentials.user;
        pass = etherealCredentials.pass;
      }
    }

    sharedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    return sharedTransporter;
  }

  /**
   * Send an email via Ethereal SMTP
   */
  static async sendEmail(params: {
    from: string;
    to: string;
    subject: string;
    body: string;
    attachments?: Array<{ filename: string; path?: string; content?: string }>;
  }): Promise<{ messageId: string; previewUrl: string | false }> {
    const transporter = await this.getTransporter();

    const info = await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.body,
      text: params.body.replace(/<[^>]*>?/gm, ''), // fallback plain text
      attachments: params.attachments,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`📧 Email sent to [${params.to}] from [${params.from}]`);
    if (previewUrl) {
      console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }
}
