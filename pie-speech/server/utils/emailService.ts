import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  console.log('📧 [EmailService] Attempting to send email to:', options.to);
  
  try {
    // Check if SMTP configuration is available
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@voiceai.com';

    if (!smtpHost) {
      console.log('📧 [EmailService] No SMTP configuration found, logging email instead');
      console.log('📧 Email preview:', {
        to: options.to,
        subject: options.subject,
        preview: options.html.substring(0, 100) + '...'
      });
      return;
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '587'),
      secure: smtpPort === '465', // true for 465, false for other ports
      auth: smtpUser && smtpPass ? {
        user: smtpUser,
        pass: smtpPass,
      } : undefined,
      // Allow self-signed certificates for development
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify SMTP connection
    console.log('📧 [EmailService] Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ [EmailService] SMTP connection verified successfully');

    // Send email
    const info = await transporter.sendMail({
      from: emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('✅ [EmailService] Email sent successfully:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject
    });

  } catch (error: any) {
    console.error('❌ [EmailService] Failed to send email:', {
      error: error.message,
      to: options.to,
      subject: options.subject,
      stack: error.stack
    });
    
    // Log email content for debugging
    console.log('📧 [EmailService] Email content (due to send failure):', {
      to: options.to,
      subject: options.subject,
      preview: options.html.substring(0, 200) + '...'
    });
    
    // Don't throw error to prevent breaking the invitation flow
    // Just log and continue - invitation is still created in the database
  }
}