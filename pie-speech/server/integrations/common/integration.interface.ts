export interface IntegrationInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  performAction(payload: any): Promise<any>;
}