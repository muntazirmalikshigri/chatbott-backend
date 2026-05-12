# Multi-Tenant AI Agent Backend

This backend powers the multi-tenant AI agent system used by the frontend dashboard.
It is an Express + TypeScript + MongoDB API that:

- manages users, companies, agents, and knowledge chunks
- builds retrieval context from company knowledge
- sends chat prompts to Groq
- stores conversation sessions for follow-up questions

This README is written as a handoff guide so a coworker can understand how the agent was built and how it works end to end.

## What This Agent Does

The "agent" in this project is a company-scoped AI assistant.
Each company can have its own agent configuration, knowledge base, and chat history.

When a user sends a message:

1. the backend loads the agent
2. the backend retrieves relevant knowledge from MongoDB
3. the backend builds a prompt with agent instructions + retrieved context
4. the backend calls Groq for the response
5. the backend saves the chat session

This gives each tenant its own isolated assistant behavior.

## Core Idea

The project uses a RAG flow:

- **R**etrieval: find relevant knowledge chunks for the current question
- **A**ugmentation: add those chunks to the prompt
- **G**eneration: ask Groq to generate the final answer

That means the model does not answer from memory alone.
It answers using the company-specific knowledge uploaded into the system.

## High-Level Architecture

- **Frontend**: Next.js dashboard
- **Backend**: Express API written in TypeScript
- **Database**: MongoDB / Mongoose
- **AI Provider**: Groq chat completions
- **RAG Layer**: `rag.service.ts`
- **Session Storage**: MongoDB chat sessions

## Main Request Flow

### 1. User opens a chat

The frontend sends a request to:

```http
POST /v1/chat/:agentId
```

Body:

```json
{
  "message": "What are your business hours?",
  "sessionId": "optional-session-id"
}
```

### 2. Controller validates the request

`base_server/src/modules/chat/chat.controller.ts`:

- checks that `message` is present
- forwards the request to `chat.service.ts`

### 3. Chat service loads the agent

`base_server/src/modules/chat/chat.service.ts`:

- loads the public agent by `agentId`
- verifies the agent exists
- loads or creates a session id
- loads previous chat history from MongoDB

### 4. RAG builds context

`base_server/src/modules/chat/rag.service.ts`:

- loads the agent knowledge base
- creates an embedding for the user question
- searches the knowledge chunks
- builds a context string from the best matches

### 5. Groq generates the answer

`base_server/src/shared/utils/ai-client.ts`:

- sends the system prompt, context, history, and user message to Groq
- uses `GROQ_API_KEY` or `GROK_API_KEY`
- tries the configured model and fallback model if needed

### 6. Response is saved

The backend stores:

- the user message
- the assistant response
- the company id
- the agent id
- the session id
- the last message timestamp

That is what makes the chat feel stateful.

## How RAG Works In This Codebase

The important file is:

- `base_server/src/modules/chat/rag.service.ts`

### Context building

`buildContext(agentId, message, limit)` does this:

1. loads the agent
2. loads the agent's knowledge base
3. generates a query embedding from the user message
4. tries vector search if MongoDB supports it
5. falls back to cosine similarity if vector search is not available
6. returns:
   - matched chunks
   - formatted context text
   - source metadata

### Vector search

If MongoDB supports vector search, the service uses:

- `$vectorSearch`
- `knowledge_embeddings` index
- `embedding` field on the knowledge chunk

### Fallback search

If vector search is unavailable or fails:

- the service loads candidate chunks from MongoDB
- computes cosine similarity locally
- sorts by similarity score
- keeps the top matches

This makes the system work even when vector search is not available.

## How The Prompt Is Built

`rag.service.ts` builds the messages sent to Groq.

The system prompt includes:

- the agent name
- the agent tone
- the agent instructions
- a reminder to use the knowledge context

The chat prompt also includes:

- the retrieved knowledge context
- a short recent history window
- the latest user message

This is why the assistant behaves like a tenant-specific agent instead of a generic chatbot.

## Groq Integration

The Groq integration lives in:

- `base_server/src/shared/utils/ai-client.ts`

### Chat completion

`generateChatCompletion(messages)`:

- reads the Groq API key from env
- normalizes the requested model
- tries the requested model first
- falls back to a second model if needed
- returns the generated text and provider label

### Embeddings

This project does not call an external embedding API.
Instead, `createEmbedding(input)` currently uses a local deterministic fallback vector strategy.

That means:

- the app can still build retrieval context without an external embedding service
- the retrieval quality is simple and predictable
- the system is easier to run locally

If you want a production-grade semantic search later, this is the place to swap in a real embedding provider.

## Important Backend Files

- `src/modules/chat/chat.controller.ts`
  - validates incoming chat requests

- `src/modules/chat/chat.service.ts`
  - orchestrates the full chat flow
  - loads agent, session history, RAG context, and Groq response

- `src/modules/chat/rag.service.ts`
  - builds retrieval context and prompt messages

- `src/shared/utils/ai-client.ts`
  - Groq chat completions and embedding helpers

- `src/middlewares/authenticate.ts`
  - authenticates dashboard API requests

- `src/modules/company/company.routes.ts`
  - protects company endpoints

- `src/modules/knowledge/*`
  - handles knowledge chunk creation and retrieval

- `src/modules/agent/*`
  - handles agent CRUD and public agent lookups

## API Endpoints Used By The Agent

Chat:

```http
POST /v1/chat/:agentId
```

Companies:

```http
GET /v1/companies
POST /v1/companies
GET /v1/companies/:companyId
```

Agents:

```http
GET /v1/companies/:companyId/agents
POST /v1/companies/:companyId/agents
GET /v1/agents/:agentId
```

Knowledge:

```http
GET /v1/agents/:agentId/knowledge
POST /v1/agents/:agentId/knowledge/text
POST /v1/agents/:agentId/knowledge/pdf
DELETE /v1/agents/:agentId/knowledge/:chunkId
```

## Authentication

The backend accepts authenticated requests using:

- `Authorization: Bearer <token>`
- or the legacy `accessToken` cookie

That means the frontend can use localStorage tokens and still work with the same backend.

## Environment Variables

Set these in `.env` or your deployment platform:

```bash
PORT=3000
SERVER_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/base

GROQ_API_KEY=your_groq_key
GROK_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_FALLBACK_MODEL=llama-3.1-8b-instant
AI_TEMPERATURE=0.2

ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
```

Notes:

- both `GROQ_API_KEY` and `GROK_API_KEY` are supported by the code
- if both are present, the app will use whichever is available
- `GROQ_MODEL` should be a supported Groq model name

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file and add the required variables.

### 3. Start the server

```bash
npm run start:dev
```

### 4. Run tests

```bash
npm run test
```

### 5. Lint

```bash
npm run lint
```

## Why The Agent Is Tenant-Safe

The assistant is tied to the company and agent records in MongoDB.

That means:

- each company only sees its own agent data
- each agent uses its own knowledge base
- chat sessions are stored per agent
- knowledge search only pulls the current agent's chunks

This is what makes it multi-tenant.

## How To Explain This To Someone Quickly

If you need the short version for a coworker:

> The backend builds a company-specific RAG context from MongoDB knowledge, adds the agent instructions and recent chat history, and sends it to Groq for generation. The assistant response is then stored back into the session so the conversation stays continuous.

## Troubleshooting

### 401 on protected routes

Check that the request sends a valid bearer token or cookie.

### Groq request fails

Check:

- `GROQ_API_KEY` / `GROK_API_KEY`
- `GROQ_MODEL`
- network access to Groq

### Empty or weak answers

Check:

- whether knowledge chunks exist
- whether the agent has a knowledge base attached
- whether the retrieval query is finding relevant chunks

### Embedding / retrieval seems weak

Remember that the current embedding strategy is a local fallback.
If you want better semantic retrieval, replace `createEmbedding()` with a real embedding provider later.

## Summary

This backend is not just a chat API.
It is a tenant-aware AI agent platform with:

- agent configuration
- company-scoped knowledge
- RAG retrieval
- Groq generation
- persistent chat sessions

The most important flow is:

`user message -> RAG context -> Groq -> stored session -> final answer`

