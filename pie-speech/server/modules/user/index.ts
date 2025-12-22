/**
 * User Module Index
 * Central export file for all user-related components
 */

// Model exports
export { User, type IUser } from './User';

// DAL exports
export { UserDAL, userDAL } from './user.dal';

// DTO exports
export * from './user.dto';

// Service exports
export { UserService } from './UserService';

// Controller exports
export { UserController } from './UserController';

// Routes exports
export { default as userRoutes } from './users';