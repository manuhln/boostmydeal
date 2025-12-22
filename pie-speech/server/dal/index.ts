/**
 * Data Access Layer (DAL) Index
 * Central export file for all DAL modules
 */

// Base DAL class
export { BaseDAL } from './base.dal';

// Individual DAL exports
export { UserDAL, userDAL } from '../modules/user/user.dal';
export { OrganizationDAL, organizationDAL } from '../modules/organization/organization.dal';
export { AgentDAL, agentDAL } from '../modules/agent/agent.dal';
export { CallDAL, callDAL } from './call.dal';
export { MetricDAL, metricDAL } from './metric.dal';
export { ContactDAL, contactDAL } from './contact.dal';
export { PhoneNumberDAL } from '../modules/phone_number/phone_number.dal';

// Import all DAL instances for the registry
import { userDAL } from '../modules/user/user.dal';
import { organizationDAL } from '../modules/organization/organization.dal';
import { agentDAL } from '../modules/agent/agent.dal';
import { callDAL } from './call.dal';
import { metricDAL } from './metric.dal';
import { contactDAL } from './contact.dal';
import { PhoneNumberDAL } from '../modules/phone_number/phone_number.dal';

/**
 * DAL Registry
 * Provides access to all DAL instances
 */
export const DAL = {
  user: userDAL,
  organization: organizationDAL,
  agent: agentDAL,
  call: callDAL,
  metric: metricDAL,
  contact: contactDAL,
  phoneNumber: new PhoneNumberDAL()
} as const;

/**
 * Type definitions for DAL instances
 */
export type DALRegistry = typeof DAL;
export type DALKey = keyof DALRegistry;

/**
 * Helper function to get DAL instance by key
 */
export function getDAL<K extends DALKey>(key: K): DALRegistry[K] {
  return DAL[key];
}

/**
 * Type definitions for all DAL classes
 */
export type { UserDAL as UserDALType } from '../modules/user/user.dal';
export type { OrganizationDAL as OrganizationDALType } from '../modules/organization/organization.dal';
export type { AgentDAL as AgentDALType } from '../modules/agent/agent.dal';
export type { CallDAL as CallDALType } from './call.dal';
export type { MetricDAL as MetricDALType } from './metric.dal';
export type { ContactDAL as ContactDALType } from './contact.dal';
export type { PhoneNumberDAL as PhoneNumberDALType } from '../modules/phone_number/phone_number.dal';