import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { TeamService } from '../services/TeamService';
import { body, param, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Get team members
router.get('/members', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const members = await TeamService.getTeamMembers(req.user!.organizationId);
    res.json({ success: true, data: members });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get pending invites
router.get('/invites', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const invites = await TeamService.getPendingInvites(req.user!.organizationId);
    res.json({ success: true, data: invites });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send invite
router.post('/invite',
  authMiddleware,
  [
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['admin', 'user']),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      // Only owner and admin can send invites
      if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to send invites' 
        });
      }

      const { email, role } = req.body;
      
      const invite = await TeamService.sendInvite(
        email,
        role,
        req.user!.organizationId,
        req.user!._id
      );

      res.json({ success: true, data: invite });
    } catch (error: any) {
      console.error('Error sending invite:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Accept invite (public route)
router.post('/accept-invite/:token',
  [
    param('token').notEmpty(),
    body('name').notEmpty().trim(),
    body('password').isLength({ min: 6 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { name, password } = req.body;

      const user = await TeamService.acceptInvite(token, { name, password });

      res.json({ 
        success: true, 
        message: 'Invitation accepted successfully',
        data: { email: user.email, name: `${user.firstName} ${user.lastName}`.trim() }
      });
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Remove team member
router.delete('/member/:userId',
  authMiddleware,
  [param('userId').isMongoId()],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      // Only owner and admin can remove members
      if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to remove team members' 
        });
      }

      const { userId } = req.params;
      
      await TeamService.removeTeamMember(
        userId,
        req.user!.organizationId,
        req.user!._id
      );

      res.json({ success: true, message: 'Team member removed successfully' });
    } catch (error: any) {
      console.error('Error removing team member:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Cancel invite
router.delete('/invite/:inviteId',
  authMiddleware,
  [param('inviteId').isMongoId()],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      // Only owner and admin can cancel invites
      if (req.user!.role !== 'owner' && req.user!.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to cancel invites' 
        });
      }

      const { inviteId } = req.params;
      
      await TeamService.cancelInvite(inviteId, req.user!.organizationId);

      res.json({ success: true, message: 'Invite cancelled successfully' });
    } catch (error: any) {
      console.error('Error cancelling invite:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Update member role
router.patch('/member/:userId/role',
  authMiddleware,
  [
    param('userId').isMongoId(),
    body('role').isIn(['admin', 'user']),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      // Only owner can change roles
      if (req.user!.role !== 'owner') {
        return res.status(403).json({ 
          success: false, 
          message: 'Only the owner can change member roles' 
        });
      }

      const { userId } = req.params;
      const { role } = req.body;
      
      const updatedUser = await TeamService.updateMemberRole(
        userId,
        role,
        req.user!.organizationId
      );

      res.json({ success: true, data: updatedUser });
    } catch (error: any) {
      console.error('Error updating member role:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

export default router;