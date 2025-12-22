module.exports = {
  apps: [
    {
      name: "my-next-app",
      script: "npm",
      args: "run start",
      cwd: process.env.PROJECT_CWD, // Path to your frontend folder
      interpreter: "none", // Let npm run directly
      env_production: {
        NODE_ENV: process.env.NODE_ENV,
        REDIS_CLOUD_URL: process.env.REDIS_CLOUD_URL,
        SESSION_SECRET: process.env.SESSION_SECRET,
        DATABASE_URL: process.env.DATABASE_URL,
        PGDATABASE: process.env.PGDATABASE,
        PGHOST: process.env.PGHOST,
        PGPORT: process.env.PGPORT,
        PGUSER: process.env.PGUSER,
        PGPASSWORD: process.env.PGPASSWORD,
        MONGODB_URI: process.env.MONGODB_URI,
        TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
        UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
        DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        SMTP_EMAIL: process.env.SMTP_EMAIL,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        EMAIL_FROM: process.env.EMAIL_FROM,
        SMTP_PASS: process.env.SMTP_PASS,
        SMTP_USER: process.env.SMTP_USER,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        VITE_STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY
      }
    }
  ]
};
