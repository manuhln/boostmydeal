import { Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';

const notificationService = new NotificationService();

export class NotificationController {
  async getNotifications(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ message: 'Organization ID required' });
      }

      const read = req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined;
      const page = parseInt(String(req.query.page || 1), 10);
      const limit = Math.min(parseInt(String(req.query.limit || 50), 10), 100);

      const result = await notificationService.getNotificationsByOrganization(organizationId, {
        read,
        page,
        limit,
      });

      return res.json({
        data: result.data,
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      console.error('❌ [NotificationController] getNotifications error:', error);
      return res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ message: 'Organization ID required' });
      }

      const notificationId = req.params.id;
      const success = await notificationService.markAsRead(notificationId, organizationId);

      if (!success) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('❌ [NotificationController] markAsRead error:', error);
      return res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ message: 'Organization ID required' });
      }

      const count = await notificationService.markAllAsRead(organizationId);
      return res.json({ success: true, markedCount: count });
    } catch (error) {
      console.error('❌ [NotificationController] markAllAsRead error:', error);
      return res.status(500).json({ message: 'Failed to mark all as read' });
    }
  }

  async getUnreadCount(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ message: 'Organization ID required' });
      }

      const count = await notificationService.getUnreadCount(organizationId);
      return res.json({ count });
    } catch (error) {
      console.error('❌ [NotificationController] getUnreadCount error:', error);
      return res.status(500).json({ message: 'Failed to get unread count' });
    }
  }
}

export const notificationController = new NotificationController();
