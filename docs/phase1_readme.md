# Phase 1: Foundation and Basic Infrastructure

## Overview
This phase establishes the core infrastructure for the AI Agent System with basic LLM integration through Ollama.

## What's Implemented

### Infrastructure
- Docker Compose configuration with all required services
- PostgreSQL with pgvector extension for embedding storage
- Redis for caching and queuing
- Ollama container for local LLM inference
- Angular 19 frontend with chat interface
- NestJS 11 backend with LLM service

### LLM Integration
- Provider abstraction pattern for future extensibility
- Ollama provider implementation
- Basic completion API endpoint
- Health checking and provider status monitoring

### Frontend
- Simple chat interface with real-time messaging
- Angular signals for state management
- Responsive design with loading states
- HTTP service for backend communication

## Running the System

### Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ installed
- NVIDIA GPU (optional, for better Ollama performance)

### Quick Start

1. Start all services:
```bash
docker-compose up -d
```

2. Wait for Ollama to pull the Mistral 7B model (this may take a few minutes on first run)

3. Check service health:
```bash
# Check if all containers are running
docker-compose ps

# Check Ollama model status
curl http://localhost:11434/api/tags

# Check backend health
curl http://localhost:3000/llm/health
```

4. Access the application:
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- Ollama API: http://localhost:11434

### Development Mode

For local development with hot-reloading:

1. Start infrastructure services:
```bash
docker-compose up postgres redis ollama -d
```

2. Run backend in development mode:
```bash
cd backend
npm install
npm run start:dev
```

3. Run frontend in development mode:
```bash
cd frontend
npm install
npm start
```

## Testing the System

### Basic Chat Test
1. Open http://localhost:4200
2. Type a message like "Hello, how are you?"
3. You should receive a response from the Mistral 7B model

### API Testing
```bash
# Test completion endpoint
curl -X POST http://localhost:3000/llm/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the capital of France?",
    "options": {
      "temperature": 0.7,
      "maxTokens": 100
    }
  }'

# Check provider status
curl http://localhost:3000/llm/providers

# Get provider info
curl http://localhost:3000/llm/providers/ollama
```

## Architecture Decisions

### Provider Abstraction
The LLM service uses a provider pattern that allows:
- Easy addition of new LLM providers (Groq, OpenAI, etc.)
- Provider-specific optimizations
- Fallback mechanisms
- Unified interface for all models

### Technology Choices
- **pgvector**: Enables efficient vector similarity search for future memory features
- **Redis**: Provides fast caching and will power the task queue
- **Ollama**: Allows running LLMs locally without external dependencies
- **Angular Signals**: Modern reactive state management
- **Docker Compose**: Simplified development environment setup

## Next Steps (Phase 2)
- Implement task management system
- Add task queue with Redis
- Create task submission and tracking UI
- Implement basic task processing logic

## Troubleshooting

### Ollama Issues
If Ollama fails to start or pull models:
```bash
# Check Ollama logs
docker-compose logs ollama

# Manually pull model
docker exec mhmanus-ollama ollama pull mistral:7b

# Check available models
docker exec mhmanus-ollama ollama list
```

### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec -it mhmanus-postgres psql -U mhmanus -d mhmanus_db
```

### Frontend Not Loading
- Ensure backend is running on port 3000
- Check browser console for CORS errors
- Verify Angular is running on port 4200

## Phase 1 Checklist
- ✅ Docker Compose configuration
- ✅ PostgreSQL with pgvector
- ✅ Redis setup
- ✅ Ollama integration
- ✅ Basic LLM service
- ✅ Provider abstraction
- ✅ Frontend chat interface
- ✅ End-to-end communication