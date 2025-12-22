import crypto from 'crypto';
import { User, IUser } from '../modules/user/User';
import { TeamInvite, ITeamInvite } from '../models/TeamInvite';
import { Organization } from '../modules/organization/Organization';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/emailService';

// Helper function to generate PieSpeech logo SVG
function generatePieSpeechLogoSVG(width = 300, height = 90): string {
  return `<svg width="${width}" height="${height}" viewBox="140 290 380 90" xmlns="http://www.w3.org/2000/svg">
    <!-- Black background -->
    <path
      d="M 0,0 H 500 V 500 H 0 Z"
      fill="#000000"
      transform="matrix(1.3333333,0,0,-1.3333333,0,666.66667)"
    />

    <!-- Letter B -->
    <path
      d="M 0,0 C 0,1.278 -0.923,1.953 -2.77,1.953 H -7.813 V -1.953 H -2.77 C -0.923,-1.953 0,-1.278 0,0 M -7.813,11.187 V 7.493 h 3.906 c 1.883,0 2.735,0.64 2.735,1.847 0,1.208 -0.852,1.847 -2.735,1.847 z M 8.452,-0.959 c 0,-4.333 -3.658,-6.854 -10.512,-6.854 h -13.992 v 24.86 H -2.77 c 6.854,0 10.05,-2.735 10.05,-6.499 C 7.28,8.239 6.108,6.321 3.835,5.185 6.748,4.12 8.452,1.989 8.452,-0.959"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,158.952,411.98653)"
    />

    <!-- Letter O -->
    <path
      d="m 0,0 c 0,3.871 -2.486,6.215 -5.576,6.215 -3.089,0 -5.576,-2.344 -5.576,-6.215 0,-3.871 2.487,-6.215 5.576,-6.215 C -2.486,-6.215 0,-3.871 0,0 m -19.604,0 c 0,7.529 5.931,12.998 14.028,12.998 8.097,0 14.029,-5.469 14.029,-12.998 0,-7.529 -5.932,-12.998 -14.029,-12.998 -8.097,0 -14.028,5.469 -14.028,12.998"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,198.9607,405.8308)"
    />

    <!-- Letter O -->
    <path
      d="m 0,0 c 0,3.871 -2.486,6.215 -5.576,6.215 -3.089,0 -5.576,-2.344 -5.576,-6.215 0,-3.871 2.487,-6.215 5.576,-6.215 C -2.486,-6.215 0,-3.871 0,0 m -19.604,0 c 0,7.529 5.931,12.998 14.028,12.998 8.097,0 14.029,-5.469 14.029,-12.998 0,-7.529 -5.932,-12.998 -14.029,-12.998 -8.097,0 -14.028,5.469 -14.028,12.998"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,239.1117,405.8308)"
    />

    <!-- Letter S -->
    <path
      d="m 0,0 2.699,6.108 c 2.344,-1.385 5.47,-2.273 8.204,-2.273 2.379,0 3.232,0.498 3.232,1.35 0,3.125 -13.744,0.604 -13.744,9.873 0,4.617 3.871,8.381 11.577,8.381 3.339,0 6.784,-0.71 9.376,-2.166 L 18.823,15.2 c -2.451,1.243 -4.759,1.847 -6.926,1.847 -2.45,0 -3.231,-0.711 -3.231,-1.563 0,-2.983 13.744,-0.497 13.744,-9.66 0,-4.546 -3.871,-8.381 -11.578,-8.381 C 6.677,-2.557 2.486,-1.527 0,0"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,252.3661,419.75227)"
    />

    <!-- Letter T -->
    <path
      d="M 0,0 H -7.281 V 6.499 H 15.661 V 0 H 8.381 V -18.361 H 0 Z"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,292.282,397.9232)"
    />

    <!-- Letter M -->
    <path
      d="M 0,0 -0.071,11.329 -5.469,2.237 h -3.694 l -5.398,8.701 V 0 h -7.635 v 24.86 h 6.89 L -7.209,11.613 0.675,24.86 h 6.89 L 7.636,0 Z"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,345.6437,422.40413)"
    />

    <!-- Letter Y -->
    <path
      d="m 0,0 v -9.021 h -8.382 v 9.127 l -9.375,15.733 h 8.843 l 5.078,-8.594 5.114,8.594 h 8.098 z"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,380.9171,410.37667)"
    />

    <!-- Letter D -->
    <path
      d="M 0,0 C 3.516,0 5.931,2.095 5.931,5.895 5.931,9.695 3.516,11.79 0,11.79 H -3.516 V 0 Z M -11.897,18.325 H 0.355 c 8.311,0 14.028,-4.723 14.028,-12.43 0,-7.706 -5.717,-12.43 -14.028,-12.43 h -12.252 z"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,411.16,413.6912)"
    />

    <!-- Letter E -->
    <path
      d="M 0,0 V -6.321 H -20.669 V 18.538 H -0.461 V 12.217 H -12.43 V 9.305 H -1.918 V 3.267 H -12.43 V 0 Z"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,460.5,413.97547)"
    />

    <!-- Letter A -->
    <path
      d="M 0,0 -2.415,6.25 -4.83,0 Z m 2.308,-6.037 h -9.447 l -1.669,-4.333 h -8.523 L -6.464,14.49 H 1.775 L 12.643,-10.37 H 3.977 Z"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,484.32,408.57733)"
    />

    <!-- Letter L -->
    <path
      d="M 0,0 H 8.381 V -18.361 H 19.604 V -24.86 H 0 Z"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,502.5,389.2576)"
    />

    <!-- Main logo element (white accent) -->
    <path
      d="m 0,0 c 0,-13.042 -10.611,-23.658 -23.658,-23.658 h -80.394 l 6.417,11.883 h 73.977 c 6.491,0 11.774,5.284 11.774,11.775 0,6.491 -5.283,11.775 -11.774,11.775 h -41.119 l 6.408,11.883 h 34.711 c 6.491,0 11.774,5.284 11.774,11.775 0,6.492 -5.283,11.775 -11.774,11.775 h -42.124 l 6.417,11.884 h 35.707 C -10.611,59.092 0,48.48 0,35.433 0,28.387 -3.095,22.049 -8.002,17.717 -3.095,13.384 0,7.046 0,0"
      fill="#ffffff"
      transform="matrix(1.3333333,0,0,-1.3333333,402.7003,322.2936)"
    />

    <!-- Red accent element -->
    <path
      d="m 0,0 h -70.803 l 25.555,47.317 h 13.503 L -50.878,11.884 H 0 c 3.278,0 5.942,-2.659 5.942,-5.942 C 5.942,4.303 5.273,2.817 4.199,1.738 3.124,0.664 1.639,0 0,0"
      fill="#3B82F6"
      transform="matrix(1.3333333,0,0,-1.3333333,371.1227,330.216)"
    />
  </svg>`;
}

export class TeamService {
  /**
   * Send a team invite
   */
  static async sendInvite(
    email: string,
    role: 'admin' | 'user',
    organizationId: string,
    invitedBy: string
  ): Promise<ITeamInvite> {
    // Check if user already exists in organization
    const existingUser = await User.findOne({ 
      email, 
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });
    
    if (existingUser) {
      throw new Error('User already exists in organization');
    }

    // Check if there's already a pending invite
    const existingInvite = await TeamInvite.findOne({
      email,
      organizationId: new mongoose.Types.ObjectId(organizationId),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvite) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invite
    const invite = await TeamInvite.create({
      email,
      role,
      organizationId: new mongoose.Types.ObjectId(organizationId),
      invitedBy: new mongoose.Types.ObjectId(invitedBy),
      token,
    });

    // Get organization details
    const organization = await Organization.findById(organizationId);
    const inviter = await User.findById(invitedBy);

    // Send invitation email
    // Use the production domain or fallback to development
    const baseUrl = process.env.REPL_SLUG 
      ? `https://boostmylead.xoidlabs.com`
      : process.env.APP_URL || 'http://localhost:5000';
    const inviteUrl = `${baseUrl}/accept-invite/${token}`;
    
    await sendEmail({
      to: email,
      subject: `Invitation to join ${organization?.name || 'the team'} - Pie-Speech`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation - Pie-Speech</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #3B82F6; margin-bottom: 30px; }
            .logo { max-width: 200px; height: auto; }
            .content { padding: 20px 0; }
            .cta-button { display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .cta-button:hover { background-color: #E63900; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .disclaimer { background-color: #f9f9f9; padding: 15px; margin-top: 20px; border-left: 4px solid #3B82F6; font-size: 11px; color: #555; }
          </style>
        </head>
        <body>
          <div class="header">
            ${generatePieSpeechLogoSVG(300, 90)}
          </div>
          
          <div class="content">
            <h2 style="color: #3B82F6; margin-bottom: 20px;">You've been invited to join our team!</h2>
            <p>Hello,</p>
            <p>${inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team member'} has invited you to join <strong>${organization?.name || 'our organization'}</strong> as a${role === 'admin' ? 'n' : ''} <strong>${role}</strong> on the Pie-Speech platform.</p>
            <p>Pie-Speech is an advanced AI communication and workflow automation platform that helps teams streamline their operations and boost productivity.</p>
            <p>Click the button below to accept your invitation and get started:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" class="cta-button">Accept Invitation</a>
            </div>
            <p><strong>Important:</strong> This invitation will expire in <strong>24 hours</strong> for security purposes.</p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
          </div>
          
          <div class="footer">
            <p><strong>Pie-Speech</strong> - AI Communication Platform</p>
            <p>Streamline your team collaboration through intelligent, adaptive technologies</p>
            <p>© 2025 Pie-Speech. All rights reserved.</p>
            <p>Visit us: <a href="https://boostmylead.xoidlabs.com" style="color: #3B82F6;">boostmylead.xoidlabs.com</a></p>
          </div>
          
          <div class="disclaimer">
            <p><strong>DISCLAIMER:</strong> This email contains confidential information intended only for the recipient named above. If you are not the intended recipient, you are hereby notified that any disclosure, copying, or distribution of this email is strictly prohibited. The information contained in this email is provided for informational purposes only and does not constitute legal, financial, or professional advice. Pie-Speech reserves the right to monitor email communications for security and compliance purposes. By accepting this invitation, you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        </body>
        </html>
      `
    });

    console.log(`📧 [TeamService] Invitation sent to ${email} for organization ${organizationId}`);
    return invite;
  }

  /**
   * Accept a team invite
   */
  static async acceptInvite(token: string, userData: {
    name: string;
    password: string;
  }): Promise<IUser> {
    const invite = await TeamInvite.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!invite) {
      throw new Error('Invalid or expired invitation');
    }

    // Check if user already exists
    let user = await User.findOne({ email: invite.email });
    
    if (user) {
      // If user exists but not in this organization, block them
      if (user.organizationId.toString() !== invite.organizationId.toString()) {
        throw new Error('User already exists in another organization');
      }
      
      // If user exists in this organization, block them
      throw new Error('User already exists in this organization');
    } else {
      // Split the full name into first and last name
      const nameParts = userData.name.trim().split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || 'Member';

      // Create new user
      user = await User.create({
        email: invite.email,
        firstName,
        lastName,
        password: userData.password,
        organizationId: invite.organizationId,
        role: invite.role,
        isActive: true,
        emailVerified: true,
        permissions: []
      });
    }

    // Update invite status
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    await invite.save();

    console.log(`✅ [TeamService] Invite accepted for ${invite.email} in organization ${invite.organizationId}`);
    return user;
  }

  /**
   * Get team members for an organization
   */
  static async getTeamMembers(organizationId: string): Promise<IUser[]> {
    console.log(`🔍 [TeamService] Looking for team members in organization: ${organizationId}`);
    
    const members = await User.find({
      organizationId: organizationId
    }).select('-password');

    console.log(`👥 [TeamService] Found ${members.length} team members:`, members.map(m => ({ 
      id: m._id, 
      name: `${m.firstName} ${m.lastName}`, 
      email: m.email, 
      role: m.role 
    })));

    return members;
  }

  /**
   * Get pending invites for an organization
   */
  static async getPendingInvites(organizationId: string): Promise<ITeamInvite[]> {
    const invites = await TeamInvite.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('invitedBy', 'name email');

    return invites;
  }

  /**
   * Remove a team member
   */
  static async removeTeamMember(userId: string, organizationId: string, removedBy: string): Promise<void> {
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!user) {
      throw new Error('User not found in organization');
    }

    // Don't allow removing the owner
    if (user.role === 'owner') {
      throw new Error('Cannot remove the organization owner');
    }

    // Don't allow users to remove themselves
    if (userId === removedBy) {
      throw new Error('You cannot remove yourself');
    }

    // Completely delete the user from the database
    await User.deleteOne({
      _id: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    console.log(`🗑️ [TeamService] User ${userId} completely deleted from organization ${organizationId}`);
  }

  /**
   * Cancel a pending invite
   */
  static async cancelInvite(inviteId: string, organizationId: string): Promise<void> {
    const invite = await TeamInvite.findOne({
      _id: new mongoose.Types.ObjectId(inviteId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      status: 'pending'
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    invite.status = 'expired';
    await invite.save();

    console.log(`❌ [TeamService] Invite ${inviteId} cancelled`);
  }

  /**
   * Update team member role
   */
  static async updateMemberRole(
    userId: string, 
    newRole: 'admin' | 'user', 
    organizationId: string
  ): Promise<IUser> {
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!user) {
      throw new Error('User not found in organization');
    }

    // Don't allow changing owner role
    if (user.role === 'owner') {
      throw new Error('Cannot change the role of the organization owner');
    }

    user.role = newRole;
    await user.save();

    console.log(`🔄 [TeamService] Updated role for user ${userId} to ${newRole}`);
    return user;
  }
}