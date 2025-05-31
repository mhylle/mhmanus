# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL REQUIREMENT: LOCAL-ONLY DEPLOYMENT
**NO CLOUD SERVICES** - This application MUST run entirely on-premises:
- Use Ollama for LLMs (no OpenAI/Anthropic/cloud APIs)
- Use local PostgreSQL and Redis (no cloud databases)
- Use local Kubernetes (minikube/k3s/kind, no EKS/GKE/AKS)
- Use local storage (no S3/cloud storage)
- Use local container registry (no Docker Hub/cloud registries)
- All monitoring must be self-hosted (Prometheus/Grafana)

## Architecture Overview

This is a full-stack TypeScript application consisting of:
- **Frontend**: Angular 19 application (port 4200)
- **Backend**: NestJS 11 API server (port 3000)
- **LLM**: Ollama with local models only
- **Database**: PostgreSQL with pgvector (local container)
- **Cache/Queue**: Redis (local container)
- **Monitoring**: Self-hosted Prometheus, Grafana, Jaeger
- **Documentation**: AI agent architecture design using local LLMs

## Common Commands

### Frontend Development
```bash
cd frontend
npm install              # Install dependencies
npm start               # Start dev server (http://localhost:4200)
npm run build           # Production build
npm test                # Run unit tests with Karma
npm run watch           # Run tests in watch mode
```

### Backend Development
```bash
cd backend
npm install              # Install dependencies
npm run start:dev       # Start with watch mode (http://localhost:3000)
npm run start:prod      # Production mode
npm run build           # Build the application
npm test                # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Generate coverage report
npm run test:e2e        # Run end-to-end tests
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
```

## Project Structure

The codebase follows standard Angular and NestJS conventions:
- **frontend/src/app**: Angular components, services, and routing
- **backend/src**: NestJS modules, controllers, and services
- Both projects use TypeScript with strict mode enabled
- Separate TypeScript configs for build, test, and app compilation

## Testing Approach

- **Backend**: Jest for unit and e2e tests
- **Frontend**: Karma with Jasmine for unit tests
- Run individual backend tests: `npm test -- <test-name>`
- Run individual frontend tests: `npm test -- --include='**/path-to-spec.ts'`

## Development Guidelines

When working with Angular code:
- Use signals for state management where possible
- Follow the "rule of 7" - group files when approaching 7 items in a folder
- Adhere to separation of concerns principle