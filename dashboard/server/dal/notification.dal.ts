import { Notification, type INotification } from '../models/Notification';
import { BaseDAL } from './base.dal';

export class NotificationDAL extends BaseDAL<INotification> {
  constructor() {
    super(Notification);
  }

  async findByOrganization(
    organizationId: string,
    options?: { read?: boolean; limit?: number; skip?: number }
  ): Promise<INotification[]> {
    const query: Record<string, any> = { organizationId };
    if (options?.read !== undefined) {
      query.read = options.read;
    }
    return this.find(query, {
      sort: { createdAt: -1 },
      limit: options?.limit ?? 50,
      skip: options?.skip ?? 0,
    });
  }

  async countByOrganization(organizationId: string, read?: boolean): Promise<number> {
    const query: Record<string, any> = { organizationId };
    if (read !== undefined) {
      query.read = read;
    }
    return this.count(query);
  }

  async markAsRead(notificationId: string, organizationId: string): Promise<INotification | null> {
    return this.updateById(notificationId, { read: true });
  }

  async markAllAsRead(organizationId: string): Promise<number> {
    const result = await Notification.updateMany(
      { organizationId, read: false },
      { read: true }
    );
    return result.modifiedCount;
  }
}

export const notificationDAL = new NotificationDAL();
