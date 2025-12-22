module.exports = {
  apps: [
    {
      name: "PieSpeech-Dashboard",
      script: "npm",
      args: "run start",
      cwd: "/home/xoidlabs/boostmydeal-dashboard/boostmylead", // Path to your frontend folder
      interpreter: "none", // Let npm run directly
      env_production: {"APP_URL": "",
        "SESSION_SECRET": "",
  "DATABASE_URL": "",
  "PGDATABASE": "",
  "PGHOST": "",
  "PGPORT": "",
  "PGUSER": "",
  "PGPASSWORD": "",
  "MONGODB_URI": "",
  "TWILIO_PHONE_NUMBER": "",
  "TWILIO_ACCOUNT_SID": "",
  "TWILIO_AUTH_TOKEN": "",
  "UPSTASH_REDIS_URL": "",
  "REDIS_CLOUD_URL": "",
  "OPENAI_API_KEY": "",
  "SMTP_HOST": "",
  "SMTP_PORT": "",
  "SMTP_SECURE": "",
  "STRIPE_SECRET_KEY": "",
  "VITE_STRIPE_PUBLIC_KEY": "",
  "ELEVENLABS_API_KEY": "",
  "SMTP_EMAIL": "",
  "SMTP_PASSWORD": "",
  "EMAIL_FROM": "",
  "SMTP_PASS": "",
  "SMTP_USER": "",
  "PINECONE_API_KEY": "",
  "PINECONE_ENVIRONMENT": "",
  "PINECONE_INDEX_NAME": "",
  "LIVEKIT_SIP_TRUNK_ID":"",
  "SMALLEST_AI_API_KEY":"",
  "TELEPHONIC_SERVER_URL": "",
  "BITBUCKET_PASS": "",

        
      }
    }
  ]
};
