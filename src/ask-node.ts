import { receiveQuery } from "./query.ts";
import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const instructPath = path.join(__dirname, 'INSTRUCTIONS.md');

let instructions = fs.readFileSync(instructPath, 'utf-8');


function escapeXml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function writeXML(source: string = "", breadcrumb: string = "", heading: string = "", docContent: string = "" ) : string {

    console.error("\n\nCONVERTING DOCUMENT TO XML...\n\n")

    return (
        `<doc source="${source}" breadcrumb="${breadcrumb}" heading="${heading}">\n${docContent}\n</doc>`
    )
}


/* 
QUERY RESULTS CHROMA STRUCTURE:

=> For each attribute: each embedded array represents the results for one question.
=> A result can have up to 5 documents in our case.
=> In this example we have two documents that answer our question. 
"documents": [["Chroma stores vectors.", "Embeddings power semantic search."]],
"metadatas": [[
    {"source": "string", "heading": "string", "breadcrumb": "string"},
    {"source": "string", "heading": "string", "breadcrumb": "string"},
]]
*/
async function processQuestion(question: string) {
    try {
        console.error("🤔 PROCESSING YOUR QUESTION...")

        let results = await receiveQuery(question);

        // Contains each <doc> element to insert in XML block of LLM's sysprompt 
        let docsPack: string[] = [];

        if (results) {

            const count = results.ids?.[0]?.length ?? 0

            // For each result extract source, bread, heading and document content
            // Then send those items to the XML sysprompt of the LLM
            for (let i = 0; i < count; i++) {
                console.error(`EXTRACTING INFO IN RESULT #${i + 1}: for XML.\n`);

                let source = (results.metadatas?.[0]?.[i] as any)?.source;
                if (source != null) source = escapeXml(source);
                else throw new TypeError(`Missing metadata.source[0][${i}] for result #${i}`);

                let breadcrumb = (results.metadatas?.[0]?.[i] as any)?.breadcrumb;
                if (breadcrumb != null) breadcrumb = escapeXml(breadcrumb);
                else throw new TypeError(`Missing metadata.breadcrumb[0][${i}] for result #${i}`);

                let heading = (results.metadatas?.[0]?.[i] as any)?.heading;
                if (heading != null) heading = escapeXml(heading);
                else throw new TypeError(`Missing metadata.heading[0][${i}] for result #${i}`);

                let document = results.documents?.[0]?.[i];
                if (document != null) document = escapeXml(document);
                else throw new TypeError(`Missing documents[0][${i}]`);

                console.error(`-SOURCE: ${source}`);
                console.error(`-BREADCRUMB: ${breadcrumb.replace(';', '>')}`);
                console.error(`-HEADING: ${heading}`);
                console.error(`-DOCUMENT: ${document}`);

                docsPack.push(writeXML(source, breadcrumb, heading, document));
            }

            // Pack ready, insert it to LLM's system prompt XML block
            instructions = instructions.replace(
                /(```XML[\s\S]*?<context>)[\s\S]*?(<\/context>[\s\S]*?```)/,
                `$1\n${docsPack.join('\n')}\n$2`
            );
            // Write the updated content back to INSTRUCTIONS.md
            fs.writeFileSync(instructPath, instructions, 'utf-8');
        }
    }
    catch (error) {
        console.error("An error occurred processing your question: " + error);
        throw error;
    }
}


async function main() {

    try {
        const { OPENROUTER_API_KEY } = process.env;
        if (!OPENROUTER_API_KEY) {
          throw 'Missing OPENROUTER_API_KEY environment variable';
        }

        const openai = new OpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: OPENROUTER_API_KEY,
        });

        const question = process.argv[2]?.trim();
        if (!question) 
            throw new Error("Missing question. Usage: ts-node ask-node.js \"[question]\"");

        await processQuestion(question);

        const gemini = await openai.chat.completions.create({
                model: 'google/gemini-3.1-flash-lite-preview',
                messages: [{ role: 'system', content: instructions},
                           { role: 'user', content: question}, 
                ],
        });

        console.log("\n🤖 Gemini says:\n" + gemini.choices[0]?.message.content);

    }
    catch (error) {
        console.log(`ask-node says —😕 An error occurred: ${error}`);
        process.exit(1);
    }
}

main();