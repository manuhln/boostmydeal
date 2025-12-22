// Re-export from connection pool to maintain compatibility
export { redisConnection, redisPool } from './connection-pool';
export { redisConnection as default } from './connection-pool';