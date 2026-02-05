import IORedis from "ioredis";

// Singleton Redis connection pool for BullMQ
class RedisConnectionPool {
  private static instance: RedisConnectionPool;
  private connections: Map<string, IORedis> = new Map();

  private constructor() {}

  static getInstance(): RedisConnectionPool {
    if (!RedisConnectionPool.instance) {
      RedisConnectionPool.instance = new RedisConnectionPool();
    }
    return RedisConnectionPool.instance;
  }

  getConnection(name: string = "default"): IORedis {
    if (!this.connections.has(name)) {
      // Validate Redis Cloud URL
      const redisUrl = process.env.REDIS_CLOUD_URL!;
      // console.log(process.env);
      // console.log("REDIS_CLOUD_URL", redisUrl);
      if (!redisUrl || typeof redisUrl !== "string") {
        throw new Error(
          "REDIS_CLOUD_URL environment variable is required and must be a valid URL string"
        );
      }

      // Redis Cloud connection established

      const connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        lazyConnect: false,  // Changed to false to auto-connect
        connectTimeout: 30000, // Increased timeout for Redis Cloud
        commandTimeout: 30000, // Increased command timeout
        keepAlive: 30000, // Keepalive interval in milliseconds for Redis Cloud
        family: 4, // Use IPv4
      });

      connection.on("connect", () => {
        console.log(`📡 [Redis-${name}] Connected to Redis Cloud successfully`);
      });

      connection.on("error", (err) => {
        console.error(`❌ [Redis-${name}] Connection error:`, err.message);
      });

      connection.on("ready", () => {
        console.log(`✅ [Redis-${name}] Redis Cloud is ready for BullMQ`);
      });

      connection.on("close", () => {
        console.log(`🔌 [Redis-${name}] Connection closed`);
      });

      this.connections.set(name, connection);
    }

    return this.connections.get(name)!;
  }

  closeAll(): void {
    this.connections.forEach((connection, name) => {
      console.log(`🔌 [Redis-${name}] Closing connection...`);
      connection.disconnect();
    });
    this.connections.clear();
  }
}

export const redisPool = RedisConnectionPool.getInstance();
export const redisConnection = redisPool.getConnection("main");

export default redisConnection;
