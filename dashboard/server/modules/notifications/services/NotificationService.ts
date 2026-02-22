import { notificationDAL } from '../../../dal/notification.dal';
import { Notification, type INotification, type NotificationType } from '../../../models/Notification';

export interface CreateNotificationParams {
  organizationId: string;
  workspaceId?: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  async createNotification(params: CreateNotificationParams): Promise<INotification | null> {
    try {
      const notification = await Notification.create({
        organizationId: params.organizationId,
        workspaceId: params.workspaceId ?? '1',
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata ?? {},
        read: false,
      });
      console.log(`✅ [NotificationService] Created notification: ${params.type} for org ${params.organizationId}`);
      return notification;
    } catch (error) {
      console.error(`❌ [NotificationService] Error creating notification:`, error);
      return null;
    }
  }

  async getNotificationsByOrganization(
    organizationId: string,
    filters?: { read?: boolean; page?: number; limit?: number }
  ): Promise<{ data: any[]; total: number }> {
    const limit = filters?.limit ?? 50;
    const skip = ((filters?.page ?? 1) - 1) * limit;

    const query: Record<string, any> = { organizationId };
    if (filters?.read !== undefined) {
      query.read = filters.read;
    }

    const [data, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
    ]);

    return { data, total };
  }

  async markAsRead(notificationId: string, organizationId: string): Promise<boolean> {
    const updated = await notificationDAL.markAsRead(notificationId, organizationId);
    return !!updated;
  }

  async markAllAsRead(organizationId: string): Promise<number> {
    return notificationDAL.markAllAsRead(organizationId);
  }

  async getUnreadCount(organizationId: string): Promise<number> {
    return notificationDAL.countByOrganization(organizationId, false);
  }
}

// Helper to create call-related notifications (used by CallService and callTimeoutChecker)
export async function createCallNotification(
  organizationId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const service = new NotificationService();
    await service.createNotification({
      organizationId,
      type,
      title,
      message,
      metadata,
    });
  } catch (error) {
    console.error(`❌ [createCallNotification] Failed to create notification:`, error);
  }
}
