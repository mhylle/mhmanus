# AI Agent System (MHManus)

An autonomous AI agent system built with Angular 19, NestJS 11, and Large Language Models (LLMs). This system provides a foundation for building intelligent agents capable of understanding tasks, executing code, and learning from experience.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- NVIDIA GPU with CUDA support (optional, for better performance)
- 32GB+ RAM recommended for running 14B parameter models

### Running the System

1. Clone the repository:
```bash
git clone <repository-url>
cd mhmanus
```

2. Start all services:
```bash
docker-compose up -d
```

3. Wait for the model to be ready (first run may take 5-10 minutes):
```bash
# Check if services are running
docker-compose ps

# Monitor Ollama model download
docker logs -f mhmanus-model-init
```

4. Access the application:
- **Frontend Chat Interface**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api

## 🏗️ Architecture

### System Components

- **Frontend**: Angular 19 with signals for reactive state management
- **Backend**: NestJS 11 with modular architecture
- **LLM Provider**: Ollama (local) with support for cloud providers
- **Database**: PostgreSQL 16 with pgvector extension
- **Cache/Queue**: Redis 7
- **Current Model**: Qwen3 14B (general purpose)

### Port Configuration

| Service | Internal Port | External Port | Description |
|---------|--------------|---------------|-------------|
| Frontend | 4200 | 4200 | Angular development server |
| Backend | 3000 | 3000 | NestJS API server |
| PostgreSQL | 5432 | 5433 | Database with pgvector |
| Redis | 6379 | 6380 | Cache and message queue |
| Ollama | 11434 | 11434 | LLM inference server |

## 🧪 Testing

Run the comprehensive test suite:
```bash
./test-phase1.sh
```

Test individual components:
```bash
# Test LLM health
curl http://localhost:3000/llm/health

# Test completion endpoint
curl -X POST http://localhost:3000/llm/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how can you help me?",
    "options": {
      "temperature": 0.7,
      "maxTokens": 100
    }
  }'
```

## 💻 Development

### Local Development Setup

1. Start infrastructure services only:
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

### Environment Variables

Backend configuration (`.env`):
```env
NODE_ENV=development
DATABASE_URL=postgresql://mhmanus:mhmanus123@localhost:5433/mhmanus_db
REDIS_URL=redis://localhost:6380
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:14b
PORT=3000
```

### Available Models

| Model | Size | Purpose | Status |
|-------|------|---------|---------|
| qwen3:14b | 9.3GB | General reasoning, conversation | ✅ Active |
| mistral:7b | 4.1GB | Fast responses, simple tasks | ✅ Available |
| devstral:24b | ~15GB | Code generation, debugging | 🔄 Planned |

To switch models, update `OLLAMA_MODEL` in the backend `.env` file and restart the backend.

## 📦 Project Structure

```
mhmanus/
├── frontend/               # Angular 19 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   └── chat/   # Chat interface component
│   │   │   └── services/
│   │   │       └── llm.service.ts
│   │   └── ...
│   └── Dockerfile
├── backend/                # NestJS 11 API
│   ├── src/
│   │   ├── llm/           # LLM module
│   │   │   ├── providers/ # Model providers (Ollama, etc.)
│   │   │   ├── dto/       # Data transfer objects
│   │   │   └── interfaces/
│   │   └── config/        # Configuration files
│   └── Dockerfile
├── docs/                   # Documentation
│   ├── implementation_plan.md
│   └── solution_description.md
├── docker-compose.yml      # Service orchestration
├── init-db.sql            # Database initialization
└── test-phase1.sh         # Testing script
```

## 🛠️ Common Commands

### Docker Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart a specific service
docker-compose restart [service-name]
```

### Model Management
```bash
# List available models
docker exec mhmanus-ollama ollama list

# Pull a new model
docker exec mhmanus-ollama ollama pull model-name

# Remove a model
docker exec mhmanus-ollama ollama rm model-name
```

### Database Access
```bash
# Connect to PostgreSQL
docker exec -it mhmanus-postgres psql -U mhmanus -d mhmanus_db

# Run SQL file
docker exec -i mhmanus-postgres psql -U mhmanus -d mhmanus_db < your-file.sql
```

## 🚨 Troubleshooting

### Ollama Connection Issues
If the backend shows Ollama as unavailable:
1. Check if Ollama is running: `docker logs mhmanus-ollama`
2. Verify the model exists: `docker exec mhmanus-ollama ollama list`
3. Restart the backend: `docker restart mhmanus-backend`

### Port Conflicts
If you get "port already allocated" errors:
1. Check what's using the port: `lsof -i :PORT_NUMBER`
2. Either stop the conflicting service or change ports in `docker-compose.yml`
3. Update the corresponding `.env` file if you change ports

### Memory Issues
For large models (14B+):
1. Ensure you have sufficient RAM (32GB+ recommended)
2. Check Docker memory limits: `docker stats`
3. Consider using smaller models (mistral:7b) for development

## 📚 Implementation Phases

This project follows a phased implementation approach:

- **Phase 1**: ✅ Foundation and Basic Infrastructure (Complete)
- **Phase 2**: 🔄 Task Management System (Next)
- **Phase 3**: 📅 Agent Architecture
- **Phase 4**: 📅 Cloud Provider Integration
- **Phase 5**: 📅 Code Development Vertical

See `docs/implementation_plan.md` for detailed phase information.

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Use Angular signals for state management
3. Implement proper error handling
4. Add tests for new features
5. Update documentation as needed

## 📄 License

[Your License Here]

## 🔗 Additional Resources

- [Angular 19 Documentation](https://angular.dev)
- [NestJS Documentation](https://nestjs.com)
- [Ollama Documentation](https://ollama.ai)
- [pgvector Documentation](https://github.com/pgvector/pgvector)