import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { collection } from './indexer.ts'
import { QueryResult, type Metadata } from 'chromadb';

const { OPENROUTER_API_KEY } = process.env;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}


// Returns the query result object, with up to 5 documents in it.
export async function receiveQuery(query: string = "") : Promise<QueryResult<Metadata>>{

    try {

        // Retrieve the 5 most similar results according to our vector dimensions
        const results = await collection.query({
            // Our Embedding function produces the embedding vector for our query
            queryTexts: [query], // Must be an array of strings/embeddings (if queryEmbeddings used instead)
            nResults: 5 
        });

        console.error(`TOTAL RESULTS FOUND FOR QUESTION: ${results.ids[0]?.length}`);

        // Print info for each result of the top 5
        if (results) {
            const count = results.ids?.[0]?.length ?? 0

            for (let i = 0; i < count; i++) {
                console.error(`\n\nResult #${i + 1}:\n`);

                const id = results.ids?.[0]?.[i];
                if (id !== undefined) console.error(`-ID: ${id}`);

                const metadata = results.metadatas?.[0]?.[i];
                if (metadata !== undefined) console.error(`-METADATA: ${JSON.stringify(metadata)}`);

                const distance = results.distances?.[0]?.[i];
                if (typeof distance === 'number') {
                    const cossimilarity = 1 - distance;
                    console.error(`-COSINE SIMILARITY: ${cossimilarity.toFixed(4)} (Distance: ${distance.toFixed(4)})`);
                }
            }
        }
        
        return results;
    }
    catch (error) {
        throw error;
    }
}

// Only run standalone test query when query.ts is executed directly as a script
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const testQuery = process.argv[2] || "How do I hash a password?";
    receiveQuery(testQuery).catch((err) => {
        console.error(`An error occurred receiving the query: ${err}`);
        process.exit(1);
    });
}