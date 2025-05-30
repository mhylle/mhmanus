-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create initial schema
CREATE SCHEMA IF NOT EXISTS mhmanus;

-- Create embeddings table for vector storage
CREATE TABLE IF NOT EXISTS mhmanus.embeddings (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx ON mhmanus.embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create tasks table
CREATE TABLE IF NOT EXISTS mhmanus.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create agents table
CREATE TABLE IF NOT EXISTS mhmanus.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'idle',
    capabilities JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create execution_logs table
CREATE TABLE IF NOT EXISTS mhmanus.execution_logs (
    id SERIAL PRIMARY KEY,
    task_id UUID REFERENCES mhmanus.tasks(id),
    agent_id UUID REFERENCES mhmanus.agents(id),
    action VARCHAR(255),
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for tasks table
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON mhmanus.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();