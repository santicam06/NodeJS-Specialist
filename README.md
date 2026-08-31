# 🟢🧑‍💻 NodeJS-Specialist

AI-powered Node.js documentation specialist and CLI assistant. Provides accurate, grounded technical explanations based on official Node.js documentation. Parses Markdown documentation into structure-aware chunks, produces embeddings and indexes them into a **ChromaDB vector database**, and retrieves the most relevant documentation (through XML block injection into system prompt) to synthesize answers using Google Gemini.

The assistant automatically verifies if the vector database is indexed on startup, skipping re-indexing if documentation chunks are already populated.

## 🤖 LLMs used in this application:
- [Google Gemini 3.1 Flash Lite Preview](https://openrouter.ai/google/gemini-3.1-flash-lite-preview) — for fast, intelligent, and cost-effective technical answer generation.
- [OpenAI Text Embedding 3 Small](https://openrouter.ai/openai/text-embedding-3-small) — generates high-dimensional embeddings for structure-aware Markdown doc chunks.

---

## ⚙️ Setup Instructions

Before running the application, follow these steps:

### 1. Workspace Setup (Choose one of the two approaches):

- **Approach 1: GitHub Codespaces (Zero Installation — Cloud)**:
  - Create a **GitHub Codespace** directly from this repository in your browser.
  - Docker and Docker Compose are pre-installed and running out-of-the-box. No software installations required.

- **Approach 2: Local Machine (Docker Desktop)**:
  - Clone this repository locally:
    ```sh
    git clone https://github.com/santicam06/NodeJS-Specialist.git
    ```
  - Open the repository folder in your code editor (e.g. Visual Studio Code).
  - Ensure **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** is installed and **running** on your machine (Windows, macOS, or Linux).

> [!IMPORTANT]
> From this point on, make sure that your present working directory in your terminal is the root directory of the application: `NodeJS-Specialist`.

---

### 2. Environment Configuration

Create a local `.env` file by copying the template file `.env.example`. This file contains all required configuration and API keys for the application:

```sh
# On Windows (Command Prompt)
copy .env.example .env

# On macOS/Linux or PowerShell
cp .env.example .env
```

> [!IMPORTANT]
> Always **copy** the template. Do not rename `.env.example` directly, as it must remain in the repository as a reference for required environment variables.

Open the newly created `.env` file and insert your `OPENROUTER_API_KEY`. The application **will not** function without a valid OpenRouter API key.

```env
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
```

---

### 3. Main Directories Glossary

- `./src/ask-node.ts`: Main CLI entrypoint for querying the assistant.
- `./src/indexer.ts`: Reads `docs/`, generates structure-aware chunks, and populates the ChromaDB `node-docs` collection.
- `./src/chunker.ts`: Markdown chunker preserving heading hierarchy and breadcrumbs; this is the exact location of the resource needed in a file (e.g., `fs > readFile`).
- `./src/query.ts`: Queries ChromaDB collection for top 5 matching documentation chunks.
- `./src/deleteCollection.ts`: Helper script to delete/reset the `node-docs` ChromaDB collection.
- `./src/INSTRUCTIONS.md`: LLM System prompt template mutated at runtime with retrieved `<doc>` XML elements.
- `./docs/`: Official Node.js documentation markdown files.
- `./data/`: Local vector storage and database persistence directory (.gitignored).
- `./logs/`: Application diagnostic and debug output logs (.gitignored).
- `./docker-compose.yml`: Multi-container orchestrator managing ChromaDB and the Node.js application.
- `./Dockerfile`: Production container definition for the Node.js application.

> [!TIP]
> ChromaDB stores vector embeddings in a persistent Docker volume (`nodejs_specialist_chroma_data`). Your indexed documentation persists across container restarts, so indexing only runs once on the first run.

---

### 🚨 Troubleshooting

- **Missing API Key**: Ensure `OPENROUTER_API_KEY` is correctly set in your `.env` file at the repository root.
- **Docker Daemon Not Running**: On local setups, ensure Docker Desktop is open and active before running commands. On Codespaces, Docker runs **automatically**.
- **ChromaDB Connection**: If ChromaDB fails to connect, verify Docker Compose is running. The `app` service automatically resolves ChromaDB at `http://chromadb:8000`.
- **First Run Delay**: On your first execution, the assistant automatically indexes all documentation files in `docs/` into ChromaDB. Subsequent queries will be near-instantaneous.

---

## 🚀 Usage

❓ Ask technical questions about Node.js modules, APIs, asynchronous patterns, streams, buffers, clustering, and more.

#### Examples:
- `"How does EventEmitter work and how do I handle error events?"`
- `"What is the difference between Buffer.alloc() and Buffer.allocUnsafe()?"`
- `"How do I spawn and manage worker threads with the worker_threads module?"`
- `"How does stream backpressure work in Node.js?"`

### Run Command

```sh
docker compose run --rm app "<Your Question>" [--verbose]
```

#### Example:
```sh
docker compose run --rm app "How do I create an HTTPS server in Node.js?"
```

> [!NOTE]
> The verbose flag (`--verbose`) writes detailed retrieval traces and chunk scores to `logs/debug.txt` (overridden per run). Use it for engineering and debugging purposes.

---

### 🛠️ Developer & Maintenance Commands

You can run other individual scripts inside the Docker environment for isolated tasks:

- **Test Retrieval Only**:
  ```sh
  docker compose run --rm app npx tsx src/query.ts "How do I hash a password?"
  ```
- **Force Re-index Documentation**:
  ```sh
  docker compose run --rm app npx tsx src/indexer.ts
  ```
- **Reset ChromaDB Collection**:
  ```sh
  docker compose run --rm app npx tsx src/deleteCollection.ts
  ```
