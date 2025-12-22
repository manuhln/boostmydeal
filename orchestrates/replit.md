# AI-Powered Telephony Platform

## Overview
An advanced AI-powered telephony platform with intelligent communication workflows, focusing on robust authentication, comprehensive debugging, and secure credential management. The platform aims to provide highly accurate call cost tracking, personalized voicemail delivery, and dynamic webhook configurations, suitable for production deployment on third-party servers.

## User Preferences
- Simplified codebase with minimal dependencies
- Direct use of Vocode's default factories where possible
- Focus on core functionality without unnecessary abstractions
- Enhanced user interruption capabilities for natural conversations

## System Architecture
The core application is built with FastAPI, integrating telephony functionalities and managing events.
- **UI/UX Decisions**: The platform prioritizes high reliability and low latency for telephony interactions. Features like reduced endpointing timeout (0.3s) and high interrupt sensitivity are implemented for natural, responsive conversations.
- **Technical Implementations**:
    - **Authentication & Configuration**: Dynamic credential configuration where API keys and settings are sourced directly from the JSON payload per call, with a simplified two-level fallback to environment variables. This eliminates environment pollution and streamlines setup.
    - **Cost Calculation**: Real-time call cost fetching from Twilio REST API (`TwilioCostFetcher`) is prioritized, with robust fallback logic to estimations if API data is unavailable. Includes comprehensive Call SID discovery and phone number matching.
    - **Recording**: Systematic call recording functionality enabled via `telephony_params` passed to Twilio, with recording URLs integrated into webhooks and a dedicated endpoint for retrieval.
    - **Voicemail Handling**: Supports custom voicemail message delivery when voicemail is detected, allowing agents to deliver personalized messages based on JSON payload configuration.
    - **Call Rejection Detection**: Implements a `CALL_REJECTED` webhook for immediate notification, utilizing multi-factor analysis (duration, end reason, Twilio status) and comprehensive rejection patterns.
    - **TTS Integration**: Supports multiple Text-to-Speech providers, including direct integration with Rime TTS with full parameter support (speakers, models, speed_alpha) optimized for telephony. Features intelligent language-based model selection where English automatically uses `eleven_flash_v2` (fastest) while Hindi, Spanish, French and other languages use `eleven_multilingual_v2` for optimal performance when no specific model is provided in JSON.
    - **Transcriber**: Deepgram integration with support for dynamic language parameters and optimized endpointing.
    - **Multi-Language Support**: Complete language-specific message support through `LanguageConfig` wrapper that configures vocode's internal constants:
        - **Idle check messages** ("Are you still there?") configured via vocode's `CHECK_HUMAN_PRESENT_MESSAGE_CHOICES` constant
        - **Critical Implementation**: Uses in-place list modification (`.clear()` and `.extend()`) instead of reassignment to ensure vocode's imported reference sees updated messages
        - **Technical Detail**: Vocode imports constants by reference during module initialization, so list reassignment creates a new object that vocode doesn't see
        - **Goodbye messages** for agent prompts in appropriate language
        - **Goodbye detection phrases** configured via vocode's `goodbye_phrases` AgentConfig parameter
        - **Supported languages**: English, Spanish, French, Hindi, German, Italian, Portuguese
        - Automatic language detection from JSON payload `language` parameter (default: "en")
        - Wrapper modifies vocode package constants at runtime for each conversation
    - **Keyboard Typing Audio**: Configured filler audio that plays when agent is thinking/processing:
        - Uses vocode's built-in `typing-noise.wav` file from package
        - Configured via `FillerAudioConfig` with `use_typing_noise=True`
        - Plays after 0.5 seconds of silence during agent response generation
        - Provides natural audio feedback instead of awkward silence
        - Works across all languages (non-verbal audio)
    - **Auto-Hangup on Disinterest**: Agent automatically ends calls when user expresses disinterest:
        - Detects phrases like "not interested", "I'm busy", "remove me from list"
        - Responds once with "Thank you for your time!" 
        - Uses **phrase-based action triggers** - when agent says trigger phrases, EndConversation action fires automatically
        - Phrase-based triggers are deterministic and reliable (monitors actual speech, not LLM function calls)
        - Trigger phrases: "Thank you for your time!", "Have a great day!", variations
        - Backup CutOffResponse mechanism for additional reliability
        - Prevents awkward silence and respects user time
        - Reduces wasted call minutes on disinterested prospects
    - **LLM Agent**: Supports dynamic `temperature` parameters for GPT agents.
    - **Webhook System**: Dynamic webhook URL configuration using environment variables for flexible and secure destination management. Includes live transcript streaming via LIVE_TRANSCRIPT events for real-time conversation monitoring.
    - **Memory Management**: Smart Redis configuration with automatic detection and InMemory fallback, compatible with Vocode requirements for production deployment.
- **System Design Choices**:
    - **Modularity**: Separation of concerns into components like `main.py` (core app), `simple_webhooks.py` (event management), `unified_cost_tracker.py` (unified cost and usage tracking), `twilio_cost_fetcher.py` (Twilio API), and browser calling system (`browser_call_endpoints.py`).
    - **Performance Optimization**: Significant latency improvements achieved through reduced webhook HTTP timeouts, HTTP connection pooling, optimized logging levels, configuration caching (LRU cache), pre-built prompt templates, and asynchronous operations. Unified cost tracking system eliminates redundancy and improves reliability.
    - **Code Optimization (Aug 2025)**: Consolidated three separate cost tracking modules (`cost_calculator.py`, `real_cost_calculator.py`, `usage_tracker.py`) into a single `unified_cost_tracker.py` module. This eliminates redundancy, fixes None type errors in cost calculations, and provides a more robust and maintainable codebase.
    - **Usage Tracking Accuracy Fix (Aug 2025)**: Resolved critical double-counting issue where usage metrics were being tracked multiple times through different code paths. Implemented smart fallback logic that prioritizes real-time Vocode data over transcript-based estimation, eliminating inflated usage numbers (e.g., 78.4s transcription for 23-second call). Added data source indication in usage reports to distinguish between real-time and estimated data.
    - **Production Readiness**: Configured for deployment on external servers with documented system requirements (ffmpeg, Redis) and a startup script.
    - **Browser Calling Integration**: Real-time WebSocket-based browser calling with bidirectional audio using Vocode orchestration. Pipeline: Browser audio → Deepgram STT → GPT-4o LLM → ElevenLabs TTS → Browser audio output.

## External Dependencies
- **Twilio**: For telephony services, call cost fetching, and recording management.
- **Vocode**: Core framework for AI telephony.
- **Deepgram**: Speech-to-Text (STT) transcription.
- **Rime**: Text-to-Speech (TTS) synthesis.
- **ElevenLabs**: Text-to-Speech (TTS) synthesis.
- **StreamElements**: Text-to-Speech (TTS) synthesis.
- **OpenAI**: Language Model (LLM) agent integration.
- **Redis**: For caching and session management in production environments.