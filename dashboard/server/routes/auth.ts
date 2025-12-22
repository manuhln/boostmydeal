import { Router, Express } from 'express';
import crypto from 'crypto';
import { User } from '../modules/user/User';
import { Organization } from '../modules/organization/Organization';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { userDAL } from '../modules/user/user.dal';
import { sendEmail } from '../utils/emailService';

const router = Router();

// Organization Signup
router.post('/signup', [
  body('organizationName').notEmpty().withMessage('Organization name is required'),
  body('organizationSlug').notEmpty().withMessage('Organization slug is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      organizationName, 
      organizationSlug, 
      email, 
      password, 
      firstName, 
      lastName,
      phone,
      website 
    } = req.body;

    // Check if organization slug already exists
    const existingOrg = await Organization.findOne({ slug: organizationSlug });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization slug already exists' });
    }

    // Check if user email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create organization
    const organization = new Organization({
      name: organizationName,
      slug: organizationSlug,
      email,
      phone,
      website,
    });

    await organization.save();

    // Create owner user
    const user = new User({
      organizationId: organization._id,
      email,
      password,
      firstName,
      lastName,
      role: 'owner',
      permissions: ['*'], // Full permissions for owner
      emailVerified: true, // Auto-verify for now
    });

    await user.save();

    // Send welcome email
    try {
      console.log('📧 [Signup] Sending welcome email to:', email);
      await sendEmail({
        to: email,
        subject: 'Welcome to BoostMyLead - Your AI Communication Platform!',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to BoostMyLead</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #F74000; margin-bottom: 30px; }
              .content { padding: 20px 0; }
              .cta-button { display: inline-block; padding: 12px 30px; background-color: #F74000; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .cta-button:hover { background-color: #E63900; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
              .feature-highlight { background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-left: 4px solid #F74000; border-radius: 4px; }
              .features-list { list-style: none; padding: 0; margin: 20px 0; }
              .features-list li { padding: 10px 0; border-bottom: 1px solid #eee; }
              .features-list li:before { content: "✓"; color: #F74000; font-weight: bold; margin-right: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="color: #F74000; margin: 0;">BoostMyLead</h1>
            </div>
            
            <div class="content">
              <h2 style="color: #F74000; margin-bottom: 20px;">Welcome to BoostMyLead! 🎉</h2>
              <p>Hello ${firstName},</p>
              <p>Congratulations on joining <strong>BoostMyLead</strong>! We're excited to have you and <strong>${organizationName}</strong> as part of our AI communication platform.</p>
              
              <div class="feature-highlight">
                <h3 style="color: #F74000; margin-top: 0;">What You Can Do with BoostMyLead:</h3>
                <ul class="features-list">
                  <li><strong>AI Voice Agents:</strong> Create intelligent voice agents that can handle phone calls automatically</li>
                  <li><strong>Workflow Automation:</strong> Build visual workflows to automate your communication processes</li>
                  <li><strong>Call Management:</strong> Track, analyze, and optimize all your phone interactions</li>
                  <li><strong>Real-time Analytics:</strong> Monitor performance with comprehensive dashboards and metrics</li>
                  <li><strong>CRM Integration:</strong> Connect with HubSpot, Zoho, and other popular CRM platforms</li>
                  <li><strong>Team Collaboration:</strong> Invite team members and manage roles and permissions</li>
                </ul>
              </div>
              
              <p>Your account is now active and ready to use. Start by creating your first AI agent or exploring our pre-built workflow templates.</p>
              
              
              <p><strong>Need Help Getting Started?</strong></p>
              <p>Check out our documentation, watch tutorial videos, or contact our support team if you have any questions. We're here to help you make the most of BoostMyLead!</p>
              
              <p>Welcome aboard!</p>
              <p>The BoostMyLead Team</p>
            </div>
            
            <div class="footer">
              <p><strong>BoostMyLead</strong> - AI Communication Platform</p>
              <p>Streamline your business communication through intelligent automation</p>
              <p>© 2025 BoostMyLead. All rights reserved.</p>
              <p>If you need help, contact our support team.</p>
            </div>
          </body>
          </html>
        `
      });
      console.log('✅ [Signup] Welcome email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ [Signup] Failed to send welcome email:', emailError);
      // Don't fail the signup process if email fails
    }

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Organization and user created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
      },
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// User Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) {
      console.log('User not found or inactive:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const organization = await Organization.findById(user.organizationId);
    if (!organization || !organization.isActive) {
      console.log('Organization not found or inactive for user:', email);
      return res.status(401).json({ message: 'Organization not found or deactivated' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id.toString());
    console.log('Login successful for:', email, 'Token generated:', !!token);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        settings: organization.settings,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const organization = req.organization!;

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        profileImage: user.profileImage,
        phone: user.phone,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        settings: organization.settings,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const token = generateToken(user._id);

    res.json({
      message: 'Token refreshed successfully',
      token,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required'),
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    console.log('Forgot password request for:', email);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      // For security, always return success even if user doesn't exist
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.',
        success: true 
      });
    }

    // Generate reset token (32 random bytes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update user with reset token
    await userDAL.setPasswordResetToken(user._id, resetToken, resetTokenExpiry);

    // Create reset URL - use production URL or fallback to APP_URL env variable
    const baseUrl = process.env.APP_URL || 'https://portal.boostmydeal.com';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    console.log('Password reset URL generated:', resetUrl);

    // Send password reset email
    await sendEmail({
      to: email,
      subject: 'Reset Your Password - BoostMyLead',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - BoostMyLead</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #F74000; margin-bottom: 30px; }
            .content { padding: 20px 0; }
            .cta-button { display: inline-block; padding: 12px 30px; background-color: #F74000; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .cta-button:hover { background-color: #E63900; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: #F74000; margin: 0;">BoostMyLead</h1>
          </div>
          
          <div class="content">
            <h2 style="color: #F74000; margin-bottom: 20px;">Reset Your Password</h2>
            <p>Hello ${user.firstName},</p>
            <p>We received a request to reset the password for your BoostMyLead account associated with <strong>${email}</strong>.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="cta-button">Reset Password</a>
            </div>
            <div class="warning">
              <p><strong>Important:</strong></p>
              <ul>
                <li>This link will expire in <strong>1 hour</strong> for security purposes</li>
                <li>If you didn't request this password reset, you can safely ignore this email</li>
                <li>Your password will not be changed unless you click the link above and complete the process</li>
              </ul>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
          </div>
          
          <div class="footer">
            <p><strong>BoostMyLead</strong> - AI Communication Platform</p>
            <p>© 2025 BoostMyLead. All rights reserved.</p>
            <p>If you need help, contact our support team.</p>
          </div>
        </body>
        </html>
      `
    });

    console.log('Password reset email sent to:', email);
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      success: true 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/(?=.*[0-9])/)
    .withMessage('Password must contain at least 1 number')
    .matches(/(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('Password must contain at least 1 special character'),
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;
    console.log('Password reset attempt with token:', token);

    // Find user by reset token
    const user = await userDAL.findUserByPasswordResetToken(token);
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token. Please request a new password reset.',
        error: 'INVALID_TOKEN'
      });
    }

    // Update password and clear reset token
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.updatedAt = new Date();
    await user.save();

    console.log('Password successfully reset for user:', user.email);
    res.json({ 
      message: 'Password has been reset successfully. You can now log in with your new password.',
      success: true 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export async function registerAuthRoutes(app: Express): Promise<void> {
  app.use('/api/auth', router);
}

export default router;