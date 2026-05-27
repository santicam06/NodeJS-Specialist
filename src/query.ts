import 'dotenv/config';
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

        console.error(`TOTAL RESULTS FOUND FOR QUESTION: ${results.ids[0]?.length}\n\n`);

        // Print info for each result of the top 5
        if (results) {
            const count = results.ids?.[0]?.length ?? 0

            for (let i = 0; i < count; i++) {
                console.error(`Result #${i + 1}:\n`);

                const id = results.ids?.[0]?.[i];
                if (id !== undefined) console.error(`-ID: ${id}`);

                const metadata = results.metadatas?.[0]?.[i];
                if (metadata !== undefined) console.error(`-METADATA: ${JSON.stringify(metadata)}`);

                const sim = results.distances?.[0]?.[i];
                if (typeof sim === 'number') {
                    console.error(`-COSINE SIMILARITY: ${sim}\n\n`);
                }
            }
        }
        
        return results;
    }
    catch (error) {
        console.error(`An error ocurred receiving the query: ${error}`);
        throw error;
    }
}

// TEST: receiveQuery("How do I hash a password?");