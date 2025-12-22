# LiveKit Telephonic Agent Server

## Overview

This project is a production-ready AI voice calling system built with LiveKit Agents and Twilio. Its purpose is to enable outbound AI voice calls via a REST API, providing a seamless and intelligent conversational experience. Key capabilities include multi-language support, real-time conversation webhooks, call recording with Google Cloud Storage, natural call ending, intelligent tag detection, knowledge base integration for Retrieval-Augmented Generation (RAG), and the ability to transfer calls to human agents. The system aims to provide a robust, flexible, and cost-efficient solution for automated telephonic interactions with a focus on natural language understanding and generation.

## User Preferences

- Keep code structured and organized
- No large monolithic files
- Comprehensive documentation for complex features
- Production-ready error handling and logging

## System Architecture

### UI/UX Decisions
- **Typing Sound Effects**: Agent plays keyboard typing sounds when noting user data or searching the knowledge base to create a more human-like, "note-taking" ambiance. This is configurable.
- **Initial Message Delay**: Optimized to 3 seconds after call pickup to give users time to settle and ensure audio stability.
- **Brand Name Pronunciation**: Implemented a Pronunciation Normalization Module to ensure correct pronunciation of brand names (e.g., "G-mail" instead of "G-M-A-I-L") across all TTS providers and languages.

### Technical Implementations
- **Core Components**:
    - `main.py`: FastAPI server for the REST API endpoint.
    - `agent_worker.py`: LiveKit Agent responsible for handling voice calls and core logic.
- **Dynamic VAD (Voice Activity Detection)**: Automatically adjusts listening sensitivity during specific interactions, such as spelling email addresses, to prevent interruptions. Uses a new `prepare_for_email_input` function tool.
- **Barge-In/Interrupt Handling**: Uses prompt-based instructions to guide the AI to complete thoughts naturally when interrupted. Uses `min_endpointing_delay=0.5` and `max_endpointing_delay=6.0` for balanced voice activity detection.
- **Pre-flight Phone Number Validation**: Validates `from_phone` against the LiveKit SIP API before attempting a call to prevent failed calls.
- **Caller ID Support**: Sets `participant_identity` to `from_phone` for proper caller ID display on outbound calls.
- **Natural Call Ending**: Agent uses an `end_call` function tool to gracefully conclude conversations, offering a friendly farewell before disconnecting.
- **Call Pickup Detection**: Agent waits for `sip.callStatus="active"` before speaking, ensuring the user has picked up the phone.
- **Multi-Language Support**: Comprehensive support for English, Spanish, French, Hindi, and Arabic, including translated prompts and automatic model selection for TTS.
- **Cost Tracking**: Automatic calculation of calling provider, TTS, STT, and LLM costs for every call, included in the `TRANSCRIPT_COMPLETE` webhook.
- **Callback Detection**: LLM automatically detects callback requests and extracts preferred times, rounding them to 15-minute intervals.
- **Intelligent Tag Detection**: LLM-powered conversation analysis to identify relevant `user_tags` and `system_tags` from the full transcript, included in the `TRANSCRIPT_COMPLETE` webhook.
- **Transcript Complete Webhook**: A webhook sent after the call ends, containing the full transcript, recording URLs, detected tags, and callback information. It waits for recording finalization before sending.

### Feature Specifications
- **Outbound AI voice calls** via REST API.
- **LiveKit SIP integration** with Twilio.
- **Real-time conversation webhooks** (`PHONE_CALL_CONNECTED`, `LIVE_TRANSCRIPT`, `PHONE_CALL_ENDED`, `TRANSCRIPT_COMPLETE`).
- **Call recording** with Google Cloud Storage and signed URLs.
- **Knowledge Base RAG**: Pinecone-powered knowledge base for retrieval-augmented generation. The agent proactively uses this tool when users inquire about products, services, policies, or company information.
- **Call Transfer to Human**: Agent can transfer calls using the LiveKit SIP API when users request to speak with a human, configurable with `enable_call_transfer` and `transfer_phone_number`. Requires SIP REFER enabled on the Twilio trunk.

### System Design Choices
- **Modular Architecture**: Project structure separates concerns into `main.py` (FastAPI), `agent_worker.py` (LiveKit Agent), and `src/` for core modules like models, webhook sender, recording manager, and knowledge base.
- **Configuration**: Uses environment variables for sensitive credentials (LiveKit, GCS, Pinecone) and allows `LIVEKIT_SIP_TRUNK_ID` to be passed per request for multi-tenant flexibility.
- **Asynchronous Operations**: Leverages asyncio for handling concurrent tasks and callbacks, preventing blocking issues.

## External Dependencies

- **LiveKit Agents**: Core framework for AI voice calling.
- **Twilio**: Used for SIP trunk integration and telephonic connectivity.
- **ElevenLabs**: TTS provider for high-quality, natural voices (automatic model selection based on language).
- **OpenAI**:
    - **TTS**: Text-to-speech provider.
    - **STT**: Speech-to-text provider (`whisper-1`, `gpt-4o-mini-transcribe`).
    - **LLM**: For intelligent conversation analysis, tag detection, callback detection, and general agent reasoning.
    - **Embeddings**: `text-embedding-3-small` for knowledge base RAG.
- **Smallest.ai**: Ultra-fast TTS provider.
- **Deepgram**: Primary STT provider (`nova-2` model recommended).
- **Pinecone**: Vector database for knowledge base RAG.
- **Google Cloud Storage (GCS)**: For storing call recordings.
- **FastAPI**: Python web framework for the REST API.