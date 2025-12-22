# BoostMyLead

<div align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
</div>

## 🚀 Overview

A comprehensive enterprise-level voice AI agent management platform that enables businesses to create, manage, and monitor AI-powered voice agents. The platform features intelligent workflow automation, real-time call analytics, and seamless integration with multiple voice providers.

### ✨ Key Features

- **🤖 AI Voice Agents**: Create and manage AI-powered voice agents with customizable personas and behaviors
- **📞 Multi-Provider Support**: Integrated with ElevenLabs, Deepgram, and OpenAI for voice synthesis and AI capabilities
- **🔄 Visual Workflow Builder**: Drag-and-drop workflow editor with React Flow for creating complex call automation
- **📊 Real-time Analytics**: Monitor call metrics, success rates, and agent performance
- **🔐 Multi-Tenant Architecture**: Secure organization-based data isolation with role-based access control
- **📧 Email Integration**: SMTP integration for automated email notifications based on call outcomes
- **🎯 Webhook System**: Real-time call status updates and transcript processing
- **🎨 Modern UI**: Sleek black/white theme with #F74000 accent color

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Features](#-features)
- [API Documentation](#-api-documentation)
- [Workflow System](#-workflow-system)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## 🏗 Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query) + Zustand
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation
- **Workflow Visualization**: React Flow

### Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Caching/Queues**: Redis Cloud with BullMQ
- **Authentication**: JWT with bcrypt
- **Real-time Processing**: WebSocket for live updates
- **Voice Providers**: Vapi, ElevenLabs, Deepgram
- **AI**: OpenAI GPT-4o

### Infrastructure
- **Multi-Tenancy**: Organization-based data isolation
- **Queue System**: BullMQ for async job processing
- **File Storage**: Local storage with planned S3 integration
- **Deployment**: Replit with autoscaling

## 📦 Prerequisites

- Node.js 20.x or higher
- MongoDB 7.0 or higher
- Redis 7.0 or higher
- npm or yarn package manager

### Required API Keys
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o
- `ELEVENLABS_API_KEY` - ElevenLabs API key for voice synthesis
- `DEEPGRAM_API_KEY` - Deepgram API key for speech-to-text
- `DATABASE_URL` - MongoDB connection string
- `REDIS_URL` - Redis Cloud connection string
- `JWT_SECRET` - Secret key for JWT token signing

## 🛠 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd voice-ai-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # MongoDB will automatically create collections on first use
   # No manual schema setup required
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=mongodb://localhost:27017/voice-ai-platform
MONGODB_URI=mongodb://localhost:27017/voice-ai-platform

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Voice Providers
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=your-elevenlabs-key
DEEPGRAM_API_KEY=your-deepgram-key
VAPI_API_KEY=your-vapi-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# External Services
DEMO_NGROK_URL=https://your-ngrok-url.ngrok.io
```

## 🎯 Features

### 1. AI Agent Management
- Create AI agents with custom personas and instructions
- Configure voice providers (ElevenLabs, Deepgram)
- Set up knowledge bases and conversation parameters
- Real-time agent performance monitoring

### 2. Visual Workflow Builder
- **Drag-and-drop interface** for creating call workflows
- **Node types**:
  - **Trigger**: Start workflows on events (call connected/ended)
  - **AI Agent**: Process transcripts with GPT-4o
  - **Email**: Send conditional emails based on AI analysis
  - **Condition**: Branch logic based on data
- **Real-time execution** with complete audit trails

### 3. Call Management
- Initiate outbound calls through multiple providers
- Real-time call status tracking
- Automatic transcript generation
- Call recording and analytics
- Tag-based categorization

### 4. Analytics Dashboard
- Daily/weekly/monthly call metrics
- Success rate tracking
- Agent performance analytics
- Cost analysis per call/agent
- Export capabilities

### 5. Multi-Tenant System
- Organization-based data isolation
- Role-based access control (Owner, Admin, Manager, Agent)
- Secure API key management per organization
- Usage tracking and billing integration

## 📡 API Documentation

### Authentication
All API endpoints require JWT authentication:
```javascript
headers: {
  'Authorization': 'Bearer <your-jwt-token>'
}
```

### Core Endpoints

#### Agents
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/:id` - Get agent details
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

#### Calls
- `POST /api/calls/demo-initiate` - Initiate a call
- `GET /api/calls` - List calls with filtering
- `GET /api/calls/:id` - Get call details
- `POST /api/webhook/webhook-status` - Webhook endpoint

#### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `GET /api/workflows/:id/executions` - Get execution history

#### Metrics
- `GET /api/metrics/today` - Today's metrics
- `GET /api/metrics/summary` - Summary statistics

## 🔄 Workflow System

### How It Works

1. **Webhook Trigger**: External service sends webhook when call events occur
2. **Workflow Execution**: System finds matching workflows and executes them
3. **AI Processing**: AI agents analyze transcripts and make decisions
4. **Actions**: Based on AI output, system can send emails, update records, etc.

### Example Workflow
```
Phone Call Ended → AI Analyzes Transcript → Conditional Email
```

### Creating a Workflow

1. Navigate to Workflows page
2. Click "Create Workflow"
3. Drag nodes from the sidebar:
   - Add a Trigger node (e.g., PHONE_CALL_ENDED)
   - Add an AI Agent node
   - Configure the prompt and output schema
   - Add an Email node
   - Connect the nodes
4. Save the workflow

### AI Agent Configuration
```json
{
  "inputField": "transcript",
  "prompt": "Analyze if the customer wants a follow-up email",
  "outputSchema": {
    "email_want": "boolean",
    "email": "string",
    "customer_name": "string"
  }
}
```

## 🔧 Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and helpers
├── server/                # Express backend
│   ├── modules/          # Modular architecture
│   │   ├── agent/       # Agent module
│   │   ├── calls/       # Calls module
│   │   ├── workflow/    # Workflow engine
│   │   └── ...
│   ├── integrations/     # External integrations
│   └── middleware/       # Express middleware
├── shared/               # Shared types and schemas
└── attached_assets/      # Static assets
```

### Development Commands
```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Conventional commits for version control
- Modular architecture with clear separation of concerns

## 🚀 Deployment

### Replit Deployment

1. **Configure environment variables** in Replit Secrets
2. **Set up MongoDB Atlas** for production database
3. **Configure Redis Cloud** for queue management
4. **Deploy using Replit**:
   ```bash
   # Automatic deployment on push to main branch
   ```

### Production Considerations

- Enable HTTPS for all endpoints
- Set up proper CORS configuration
- Configure rate limiting
- Implement request logging
- Set up monitoring and alerting
- Regular database backups
- Implement proper error tracking

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Write tests for new features
- Update documentation
- Follow the existing code style
- Add appropriate TypeScript types
- Ensure no console errors

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React and Express
- UI components from shadcn/ui
- Voice capabilities powered by ElevenLabs and Deepgram
- AI powered by OpenAI GPT-4o
- Workflow visualization by React Flow
