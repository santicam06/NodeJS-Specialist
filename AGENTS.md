# AGENTS.md

## Overview & Architecture
Node.js RAG CLI assistant (`ask-node`) using ChromaDB vector search and OpenRouter LLMs.
- `src/ask-node.ts`: Main CLI entrypoint. Checks if ChromaDB is indexed via `ensureIndexed()`, queries ChromaDB, mutates `src/INSTRUCTIONS.md` with retrieved XML context, and queries `google/gemini-3.1-flash-lite-preview` via OpenRouter.
- `src/chunker.ts`: Structure-aware Markdown chunker for files in `docs/`; preserves heading breadcrumbs and skips splitting inside code blocks.
- `src/indexer.ts`: Reads `docs/*.md`, generates embeddings via `openai/text-embedding-3-small`, and populates ChromaDB collection `node-docs`. Exports `ensureIndexed()` to auto-populate empty collections on first run.
- `src/query.ts`: Retrieves top 5 matching doc chunks from ChromaDB.
- `src/deleteCollection.ts`: Resets the `node-docs` ChromaDB collection.
- `src/INSTRUCTIONS.md`: LLM system prompt template mutated at runtime with `<doc>` XML elements.
- `docs/`: Node.js documentation markdown files.
- `data/chromadb/`: Pre-indexed Chroma database persistence directory mounted via bind mount into the ChromaDB container.
- `logs/`: Application diagnostic output and `debug.txt` (.gitignored).
- `Dockerfile` & `docker-compose.yml`: Multi-container setup orchestrating ChromaDB and the CLI app.

## Requirements & Environment
- **API Key**: `OPENROUTER_API_KEY` must be set in `.env` (copied from `.env.example`).
- **Vector DB**: ChromaDB running on `CHROMA_HOST:CHROMA_PORT` (defaults to `localhost:8000` or `chromadb:8000` in Docker).

## Developer Commands
- **Run via Docker (Recommended)**: `docker compose run --build --rm app "<question>" [--verbose]`
- **Run CLI directly**: `npx tsx src/ask-node.ts "<question>" [--verbose]`
- **Test retrieval**: `npm run testquery "<query>"`
- **Re-index docs**: `npm run reindex`
- **Delete Chroma collection**: `npm run deletecol`
- **Typecheck**: `npx -p typescript tsc --noEmit`

## Engineering Invariants & Coding Standards
- **Error Logging**: Maintain `try...catch` blocks for structure, but avoid duplicate `console.error` logs in inner helper functions—let `main()` act as the single point of failure reporting.
- **Verbose Logs**: When `--verbose` is enabled, write traces to `logs/debug.txt` and ensure streams are flushed before process exit.
- **Documentation Standards**: When creating or updating `README.md` upon user request, strictly follow the user's preferred template style (as exemplified in `README_SAMPLE.md`), preserving the header hierarchy, GitHub Markdown alert tags (`[!IMPORTANT]`, `[!NOTE]`, `[!TIP]`), glossary, troubleshooting, and usage layout.
- **Runtime Mutation**: `ask-node.ts` overwrites `src/INSTRUCTIONS.md` on every run with newly retrieved XML context.
- **ESM Import Syntax**: Relative TS imports explicitly require `.ts` extensions (e.g., `import { receiveQuery } from "./query.ts"`).
