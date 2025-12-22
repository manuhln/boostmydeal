// MongoDB/Mongoose models and types
import { Agent, type IAgent } from "./models/Agent";
import { Call, type ICall } from "./models/Call";
import { Metric, type IMetric } from "./models/Metric";
import { Contact, type IContact } from "./models/Contact";

export interface IStorage {
  // Agent operations
  getAgents(): Promise<IAgent[]>;
  getAgent(id: string): Promise<IAgent | undefined>;
  createAgent(agent: Partial<IAgent>): Promise<IAgent>;
  updateAgent(id: string, agent: Partial<IAgent>): Promise<IAgent | undefined>;
  deleteAgent(id: string): Promise<boolean>;

  // Call operations
  getCalls(filters?: {
    agentId?: string;
    callType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    contactName?: string;
  }): Promise<ICall[]>;
  getCall(id: string): Promise<ICall | undefined>;
  createCall(call: Partial<ICall>): Promise<ICall>;
  updateCall(id: string, call: Partial<ICall>): Promise<ICall | undefined>;

  // Metrics operations
  getMetrics(date?: string): Promise<IMetric | undefined>;
  createOrUpdateMetrics(metrics: Partial<IMetric>): Promise<IMetric>;
  getTodayMetrics(): Promise<IMetric | undefined>;

  // Contact operations
  getContacts(): Promise<IContact[]>;
  getContact(id: string): Promise<IContact | undefined>;
  createContact(contact: Partial<IContact>): Promise<IContact>;
  updateContact(id: string, contact: Partial<IContact>): Promise<IContact | undefined>;
  deleteContact(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Agent operations
  async getAgents(): Promise<IAgent[]> {
    return await Agent.find().sort({ createdAt: -1 });
  }

  async getAgent(id: string): Promise<IAgent | undefined> {
    const agent = await Agent.findById(id);
    return agent || undefined;
  }

  async createAgent(agentData: Partial<IAgent>): Promise<IAgent> {
    const agent = new Agent(agentData);
    return await agent.save();
  }

  async updateAgent(id: string, agentData: Partial<IAgent>): Promise<IAgent | undefined> {
    const agent = await Agent.findByIdAndUpdate(id, agentData, { new: true });
    return agent || undefined;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const result = await Agent.findByIdAndDelete(id);
    return !!result;
  }

  // Call operations  
  async getCalls(filters?: {
    agentId?: string;
    callType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    contactName?: string;
  }): Promise<ICall[]> {
    let query: any = {};

    if (filters) {
      if (filters.agentId) {
        query.agentId = filters.agentId;
      }
      
      if (filters.callType) {
        query.callType = filters.callType;
      }
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.createdAt.$lte = new Date(filters.dateTo);
        }
      }
      
      if (filters.contactName) {
        query.contactName = { $regex: filters.contactName, $options: 'i' };
      }
    }

    return await Call.find(query).populate('agentId').sort({ createdAt: -1 });
  }

  async getCall(id: string): Promise<ICall | undefined> {
    const call = await Call.findById(id).populate('agentId');
    return call || undefined;
  }

  async createCall(callData: Partial<ICall>): Promise<ICall> {
    const call = new Call(callData);
    return await call.save();
  }

  async updateCall(id: string, callData: Partial<ICall>): Promise<ICall | undefined> {
    const call = await Call.findByIdAndUpdate(id, callData, { new: true });
    return call || undefined;
  }

  // Metrics operations
  async getMetrics(date?: string): Promise<IMetric | undefined> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const metric = await Metric.findOne({ date: targetDate });
    return metric || undefined;
  }

  async createOrUpdateMetrics(metricsData: Partial<IMetric>): Promise<IMetric> {
    const existing = await this.getMetrics(metricsData.date);
    
    if (existing) {
      const updated = await Metric.findOneAndUpdate(
        { date: metricsData.date },
        metricsData,
        { new: true }
      );
      return updated!;
    } else {
      const metric = new Metric(metricsData);
      return await metric.save();
    }
  }

  async getTodayMetrics(): Promise<IMetric | undefined> {
    const today = new Date().toISOString().split('T')[0];
    return await this.getMetrics(today);
  }

  // Contact operations
  async getContacts(): Promise<IContact[]> {
    return await Contact.find().sort({ createdAt: -1 });
  }

  async getContact(id: string): Promise<IContact | undefined> {
    const contact = await Contact.findById(id);
    return contact || undefined;
  }

  async createContact(contactData: Partial<IContact>): Promise<IContact> {
    const contact = new Contact(contactData);
    return await contact.save();
  }

  async updateContact(id: string, contactData: Partial<IContact>): Promise<IContact | undefined> {
    const contact = await Contact.findByIdAndUpdate(id, contactData, { new: true });
    return contact || undefined;
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await Contact.findByIdAndDelete(id);
    return !!result;
  }
}

export const storage = new DatabaseStorage();
