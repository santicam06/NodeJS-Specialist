import { ChromaClient } from "chromadb";
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const chromaHost = process.env.CHROMA_HOST || 'localhost';
const chromaPort = Number(process.env.CHROMA_PORT) || 8000;

const chroma = new ChromaClient({
  host: chromaHost,
  port: chromaPort,
});

async function reset() {
  await chroma.deleteCollection({ name: "node-docs" });
  console.log("🗑️ Deleted collection: node-docs");
}

reset().catch((err) => {
  console.error("Failed to delete collection:", err);
  process.exit(1);
});