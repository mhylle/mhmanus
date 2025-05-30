# Adding New Models to the AI Agent System

## Current Models

- **qwen3:14b** (Active) - General purpose reasoning and conversation
- **mistral:7b** (Available) - Fast responses for simple tasks

## Adding Devstral for Code Generation

When you're ready to add the Devstral model for enhanced code generation:

### 1. Pull the Model

```bash
# Option 1: Direct pull (requires ~15GB download)
docker exec mhmanus-ollama ollama pull devstral:24b

# Option 2: If you have the model on your host
docker exec mhmanus-ollama ollama pull deepseek-coder-v2:16b
```

### 2. Update Configuration

Edit `backend/src/llm/providers/ollama.provider.ts` to support model selection:

```typescript
// Add a method to switch models based on task type
async selectModel(taskType: 'general' | 'code' | 'fast'): string {
  const modelMap = {
    general: 'qwen3:14b',
    code: 'devstral:24b',  // or 'deepseek-coder-v2:16b'
    fast: 'mistral:7b'
  };
  return modelMap[taskType] || this.model;
}
```

### 3. Use in Code-Specific Endpoints

Create specialized endpoints for code tasks:

```typescript
@Post('code-completion')
async generateCodeCompletion(@Body() dto: CodeCompletionDto) {
  return this.llmService.generateCompletion(dto.prompt, {
    ...dto.options,
    provider: 'ollama',
    model: 'devstral:24b'
  });
}
```

## Model Selection Strategy

### For Phase 2-4 (Task Management & Agents)
- Continue using **qwen3:14b** for general reasoning
- Use **mistral:7b** for quick responses and simple tasks

### For Phase 5 (Code Development)
- Add **devstral:24b** or **deepseek-coder-v2:16b** for code generation
- Use specialized prompts optimized for code tasks
- Implement code-specific validation and formatting

## Performance Considerations

| Model | VRAM Usage | Speed | Best For |
|-------|------------|-------|----------|
| mistral:7b | ~4GB | Fast | Simple tasks, quick responses |
| qwen3:14b | ~8GB | Medium | General reasoning, planning |
| devstral:24b | ~12GB | Slower | Code generation, debugging |

## Multi-Model Architecture

For future phases, the system will support:

1. **Model Router**: Automatically select the best model based on task
2. **Parallel Processing**: Use multiple models simultaneously
3. **Fallback Chain**: Gracefully degrade to smaller models if needed
4. **Cost Optimization**: Balance performance vs resource usage

## Testing New Models

After adding a new model:

```bash
# List all models
docker exec mhmanus-ollama ollama list

# Test the model
curl -X POST http://localhost:3000/llm/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a Python function to calculate fibonacci numbers",
    "options": {
      "model": "devstral:24b",
      "temperature": 0.2,
      "maxTokens": 500
    }
  }'
```