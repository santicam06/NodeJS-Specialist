import { ChromaClient } from "chromadb";

const chroma = new ChromaClient({
  host: "localhost",
  port: 8000,
});

async function reset() {
  await chroma.deleteCollection({ name: "node-docs" });
  console.log("Deleted collection: node-docs");
}

reset().catch((err) => {
  console.error("Failed to delete collection:", err);
  process.exit(1);
});