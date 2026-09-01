// ask-node.ts: the full RAG CLI application

import { receiveQuery } from "./query.ts";
import { ensureIndexed } from "./indexer.ts";
import OpenAI from "openai";
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
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
                console.error(`\n\nEXTRACTING INFO IN RESULT #${i + 1}: for XML.\n`);

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
                console.error(`-DOCUMENT CHUNK:\n${document.split('\n').map(line => `\t${line}`).join('\n')}`);

                docsPack.push(writeXML(source, breadcrumb, heading, document));
            }

            // Pack ready, to be inserted into LLM's system prompt XML block
            instructions = instructions.replace(
                /(```XML[\s\S]*?<context>)[\s\S]*?(<\/context>[\s\S]*?```)/,
                `$1\n${docsPack.join('\n')}\n$2`
            );
            // Write the updated content back to INSTRUCTIONS.md XML block
            fs.writeFileSync(instructPath, instructions, 'utf-8');
        }
    }
    catch (error) {
        throw error;
    }
}


async function main() {

    const args = process.argv.slice(2);
    const isVerbose = args.includes('--verbose');

    const validFlags = ['--verbose'];
    const invalidFlags = args.filter(arg => arg.startsWith('--') && !validFlags.includes(arg));
    if (invalidFlags.length > 0) {
      console.error(`An invalid flag was entered. Correct use: npx tsx src/ask-node.ts "<question>" [--verbose]`);
      process.exit(1);
    }

    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    // Redirect stderr to debug.txt when verbose mode is enabled (suppress terminal output)
    let debugStream: fs.WriteStream | null = null;
    if (isVerbose) {
        const logsDir = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const debugPath = path.join(logsDir, 'debug.txt');
        debugStream = fs.createWriteStream(debugPath, { flags: 'w' });
        process.stderr.write = (chunk: any, encoding?: any, callback?: any) => {
            debugStream?.write(chunk, encoding);
            if (callback) callback();
            return true;
        };
    } else {
        process.stderr.write = () => true;
    }
    try {
        const { OPENROUTER_API_KEY } = process.env;
        if (!OPENROUTER_API_KEY) {
          throw 'Missing OPENROUTER_API_KEY environment variable';
        }

        const openai = new OpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: OPENROUTER_API_KEY,
        });

        const question = args.filter(a => !a.startsWith('--')).join(' ').trim();
        if (!question) 
            throw new Error("Missing question. Usage: npx tsx src/ask-node.ts \"[question]\" [--verbose]");

        await ensureIndexed();

        await processQuestion(question);

        const gemini = await openai.chat.completions.create({
                model: 'google/gemini-3.1-flash-lite-preview',
                messages: [{ role: 'system', content: instructions},
                           { role: 'user', content: question}, 
                ],
        });

        console.log("\n\n\n🧑‍💻 Specialist says:\n\n" + gemini.choices[0]?.message.content);

        if (isVerbose && debugStream) {
            await new Promise<void>((resolve) => debugStream!.end(() => resolve()));
        }

    }
    catch (error: any) {
      process.stderr.write = originalStderrWrite;
      console.error(`\n⚠️ AN ERROR OCCURRED: ${error}`);
      if (isVerbose && debugStream) {
            debugStream.end();
        }
      process.exit(1);
    }
}

main();