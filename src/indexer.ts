// indexer.ts: reads docs/, chunks, and populates Chroma

import { ChromaClient, type EmbeddingFunction } from 'chromadb';
import {chunkMarkdown} from './chunker.ts'

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docs = path.resolve(__dirname, '../docs');

// Resolve .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });



class OpenRouterEmbeddingFunction implements EmbeddingFunction {
  private openai: OpenAI;
  private model: string;

    constructor(apiKey: string, model: string = 'openai/text-embedding-3-small') {
      this.model = model;
      this.openai = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
    }

    // Receives an array of Chunks' contents (in string) OF A SINGLE FILE and returns its embeddings
    async generate(content: string[]): Promise<number[][]> {

        try {
            const response = await this.openai.embeddings.create({
                model: this.model,
                input: content,
                encoding_format: 'float',
            });

            const sorted = response.data.sort((a, b) => a.index - b.index);

            // Push all embeddings to an array
            let embeddingsArr: number[][] = [];
            sorted.forEach((item, index) => {
                embeddingsArr.push(item.embedding);
                console.error(`Embeddings PACK #${index + 1} pushed. `);
            });

            console.error(`\nEmbedding function says —TOTAL EMBEDDINGS PRODUCED: ${embeddingsArr.length}\n\n`)

            // Embeddings of each chunk
            return embeddingsArr;

        } catch (error) {
            throw error;
        }  
    }
}

const chromaHost = process.env.CHROMA_HOST || 'localhost';
const chromaPort = Number(process.env.CHROMA_PORT) || 8000;

const chroma = new ChromaClient({
  host: chromaHost,
  port: chromaPort,
});

const { OPENROUTER_API_KEY } = process.env;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

const embeddingFunction = new OpenRouterEmbeddingFunction(OPENROUTER_API_KEY);


export const collection = await chroma.getOrCreateCollection({
    name: "node-docs",
    embeddingFunction,
    configuration: {
    hnsw: {
      space: "cosine",
      ef_construction: 200,
    },
  },
});


// Push all files chunk packs to collection
export async function collectMarkdowns() {

    try {
        const files = fs.readdirSync(docs);
        let i = 0;
        for (const file of files) {

            console.error(`\n\nCOLLECTING FILE #${++i} INFO\n`)
            const filePath = path.join(docs, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Get chunks from file
            const chunks = chunkMarkdown(fileContent, filePath);
            const chunksContents : string[] = [];

            // Collect content attribute of each Chunk obj
            chunks.forEach((chunk) => { 
                chunksContents.push(chunk.content)
            });

            // Add embedding arrays of file to the chroma collection through its custom function
            await collection.upsert({

                ids: chunks.map(chunk => chunk.id),
                documents: chunksContents,
                // No embeddings attribute, collection handles them automatically with our function
                metadatas: chunks.map(chunk => chunk.metadata)
            });
        }

        console.error("\n\nAll files uploaded to the collection!")
    }
    catch (error) {    
        throw error;
    }
}

// Check if collection has documents; if not, automatically index docs/
export async function ensureIndexed(): Promise<number> {
    try {
        const count = await collection.count();
        if (count === 0) {
            console.log("📦 ChromaDB collection is empty. Indexing documentation from docs/...");
            await collectMarkdowns();
            const updatedCount = await collection.count();
            console.log(`✅ Indexing complete! (${updatedCount} chunks indexed)\n`);
            return updatedCount;
        }
        return count;
    } catch (error: any) {
        if (
            error?.name === 'ChromaConnectionError' ||
            error?.message?.includes('Failed to connect') ||
            error?.code === 'ECONNREFUSED'
        ) {
            console.error(`\n❌ Error: Failed to connect to ChromaDB at http://${chromaHost}:${chromaPort}.`);
            console.error('👉 Make sure your ChromaDB server is running (e.g. `docker run -d -p 8000:8000 chromadb/chroma` or `chroma run`).\n');
        }
        throw error;
    }
}

// Run indexing if executed directly as a script
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const count = await collection.count();
    if (count > 0) {
        console.log(`🗃️ All documentation files were ALREADY indexed (${count} chunks), no need to re-run indexer.`);
        process.exit(0);
    }

    ensureIndexed().catch((err) => {
        console.error("Failed to index markdowns:", err);
        process.exit(1);
    });
}


