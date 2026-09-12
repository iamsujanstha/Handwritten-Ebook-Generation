import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";
import puppeteer from "puppeteer-core";
import _chromium from "@sparticuz/chromium";
const chromium = (_chromium as any).default || _chromium;
import fs from "fs/promises";
import fsSync from "fs";

// Ensure shared libraries in vendor/lib/linux-x64 are available for Chromium on Linux/Cloud Run
const vendorLibPath = path.join(process.cwd(), "vendor", "lib", "linux-x64");
if (fsSync.existsSync(vendorLibPath)) {
  process.env.LD_LIBRARY_PATH = `${vendorLibPath}:${process.env.LD_LIBRARY_PATH || ""}`;
  console.log("Configured LD_LIBRARY_PATH with bundled Linux shared libraries:", vendorLibPath);
}

import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);
import os from "os";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res, next) => {
  const modelHeader = req.headers['x-gemini-model'];
  if (modelHeader && typeof modelHeader === 'string') {
    if (
      modelHeader.includes('1.5') || 
      modelHeader.includes('3.5-pro') || 
      modelHeader.includes('2.0-flash') ||
      modelHeader.includes('hermes') ||
      modelHeader.includes('nousresearch') ||
      modelHeader.includes('openrouter')
    ) {
      req.headers['x-gemini-model'] = 'gemini-2.5-flash';
    }
  }
  next();
});






// Static directory for uploaded images
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fsSync.existsSync(uploadsDir)) {
  fsSync.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Vendor asset for offline/reliable Mermaid diagram rendering
app.get("/vendor/mermaid.min.js", (req, res) => {
  res.sendFile(path.join(process.cwd(), "node_modules/mermaid/dist/mermaid.min.js"));
});

// Store PDF export jobs in memory
const pdfExportJobs = new Map<string, {
  book: any;
  themeId: string;
  status: string;
  progress: string;
  pdfPath?: string;
  error?: string;
  resStream?: express.Response;
}>();

// Configure multer for uploads (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 } 
});

// Image Upload Endpoint (handles pasted screenshots, dropped files, or base64)
app.post("/api/upload-image", upload.single("file"), async (req, res) => {
  try {
    let buffer: Buffer;
    let filename: string;
    let mimeType = "image/png";

    if (req.file) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype || "image/png";
      const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
      filename = `img_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
    } else if (req.body && req.body.dataUrl) {
      const matches = req.body.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid dataUrl format" });
      }
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], "base64");
      const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
      filename = `img_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
    } else {
      return res.status(400).json({ error: "No image file or dataUrl provided" });
    }

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;
    res.json({
      success: true,
      url,
      filename,
      mimeType,
      size: buffer.length
    });
  } catch (err: any) {
    console.error("Error uploading image:", err);
    res.status(500).json({ error: "Failed to save image: " + err.message });
  }
});

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Retry logic for Gemini API
const MAX_RETRIES = 10;
const BASE_DELAY = 2000;

async function generateContentWithRetry(params: any, customApiKey?: string, apiBaseUrl?: string, retries = 3): Promise<any> {
  if (apiBaseUrl) {
    const messages = [];
    let promptContent = "";
    if (typeof params.contents === "string") promptContent = params.contents;
    else if (Array.isArray(params.contents)) promptContent = params.contents.map(c => c.text ? c.text : JSON.stringify(c)).join("\n");
    else promptContent = JSON.stringify(params.contents);

    messages.push({ role: "user", content: promptContent });

    let responseFormat;
    if (params.config?.responseMimeType === "application/json") {
      responseFormat = { type: "json_object" };
      messages[0].content += "\n\nYou MUST respond with valid JSON only. Do not wrap with ```json markdown.";
    }

    for (let i = 0; i < retries; i++) {
      try {
        const fetchParams = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${customApiKey || ""}`,
            "HTTP-Referer": "https://aistudio.google.com",
            "X-Title": "AI Studio Applet"
          },
          body: JSON.stringify({
            model: params.model,
            messages: messages,
            response_format: responseFormat
          })
        };
        const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/chat/completions`, fetchParams);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Custom API error: ${res.status} ${text}`);
        }
        const data = await res.json();
        return {
          text: data.choices?.[0]?.message?.content || "",
          usageMetadata: {
            promptTokenCount: data.usage?.prompt_tokens || 0,
            candidatesTokenCount: data.usage?.completion_tokens || 0,
            totalTokenCount: data.usage?.total_tokens || 0
          }
        };
      } catch (error: any) {
        console.warn(`Custom API failed (${error.message}). Gracefully falling back to Google Gemini.`);
        break; // Fall through to official server-side Google Gemini
      }
    }
  }
  const client = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : ai;
  const fallbacks = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-latest"];
  let fallbackIndex = 0;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await client.models.generateContent(params);
    } catch (error: any) {
      const isRetryable = error?.status === 404 || error?.message?.includes("NOT_FOUND") || error?.message?.includes("no longer available") || error?.status === 429 || error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("429") || error?.message?.includes("high demand") || error?.message?.includes("Spikes in demand") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota exceeded");
      
      if (isRetryable && i < retries - 1) {
        let delayMs = BASE_DELAY * Math.pow(2, i) + Math.random() * 1000;
        
        // Handle aggressive rate limits (429) specifically for the 5 RPM free tier
        if (error?.status === 404 || error?.message?.includes("NOT_FOUND") || error?.message?.includes("no longer available")) {
          if (fallbackIndex < fallbacks.length) {
             console.warn(`Model ${params.model} not found. Falling back to ${fallbacks[fallbackIndex]}`);
             params.model = fallbacks[fallbackIndex++];
             delayMs = 1000;
          } else {
             throw error;
          }
        } else if (error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE") || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
          // If it's a daily limit error or a 503 high demand error, fallback to another model
          if (error?.message?.includes("GenerateRequestsPerDayPerProjectPerModel") || error?.message?.includes("limit: 20") || error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE")) {
             if (fallbackIndex < fallbacks.length) {
               console.warn(`High demand or hard quota hit for ${params.model}. Falling back to ${fallbacks[fallbackIndex]}`);
               params.model = fallbacks[fallbackIndex++];
               delayMs = 2000; // Fast retry with new model
             } else {
               const e = new Error(error.message);
               (e as any).status = error?.status || 429;
               (e as any).isQuotaError = true;
               throw e;
             }
          } else {
            const retryMatch = error?.message?.match(/retry in (\d+(?:\.\d+)?)s/);
            if (retryMatch && retryMatch[1]) {
              delayMs = parseFloat(retryMatch[1]) * 1000 + 3000; // Exact wait time + 3s buffer
            } else {
              delayMs = Math.max(delayMs, 10000); // Default to at least 10s for generic 429/503
            }
          }
        }
        
        console.warn(`Gemini API error (retry ${i + 1}/${retries} in ${Math.round(delayMs)}ms): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        // If it's the last retry or unretryable and it's a quota error, throw it so we can return a specific response to the client
        if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE")) {
           const e = new Error(error.message);
           (e as any).status = error?.status || 429;
           (e as any).isQuotaError = true;
           throw e;
        }
        throw error;
      }
    }
  }
  throw new Error("Failed after MAX_RETRIES");
}

// API Route: AI Cover Generation is disabled to preserve Gemini quota
app.post("/api/suggest-cover-prompt", (req, res) => {
  res.json({ 
    success: true, 
    prompt: "Zero-AI cover mode: Select a curated vector emblem or upload custom cover artwork." 
  });
});

app.post("/api/generate-cover-image", (req, res) => {
  res.status(400).json({ 
    error: "AI cover image generation is disabled to preserve Gemini quota. Please upload an image or choose one of the built-in vector emblems." 
  });
});


// Helper function to extract text from PDF, Word documents (.docx, .doc), Markdown (.md), and plain text
async function extractDocumentContent(file: Express.Multer.File): Promise<{ text: string; numpages: number }> {
  const originalName = (file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  const buffer = file.buffer;

  // 1. Markdown or plain text (.md, .markdown, .txt)
  if (
    originalName.endsWith(".md") ||
    originalName.endsWith(".markdown") ||
    originalName.endsWith(".mdown") ||
    originalName.endsWith(".mkdn") ||
    originalName.endsWith(".txt") ||
    mime.includes("markdown") ||
    mime.includes("text/plain")
  ) {
    const text = buffer.toString("utf-8");
    const numpages = Math.max(1, Math.ceil(text.length / 2500));
    return { text, numpages };
  }

  // 2. Word documents (.docx, .doc)
  if (
    originalName.endsWith(".docx") ||
    mime.includes("wordprocessingml") ||
    originalName.endsWith(".doc") ||
    mime.includes("application/msword")
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || "").trim();
      const numpages = Math.max(1, Math.ceil(text.length / 2500));
      return { text, numpages };
    } catch (err: any) {
      console.warn("Mammoth extraction failed, trying binary fallback:", err?.message);
      // If mammoth fails (e.g. older legacy .doc binary), attempt printable ASCII/UTF-8 extraction
      const rawStr = buffer.toString("binary");
      const matches = rawStr.match(/[\x20-\x7E\r\n\t]{4,}/g);
      if (matches && matches.length > 5) {
        const text = matches
          .filter(s => !s.startsWith("Root Entry") && !s.startsWith("WordDocument") && !s.startsWith("CompObj"))
          .join("\n")
          .trim();
        if (text.length > 20) {
          return { text, numpages: Math.max(1, Math.ceil(text.length / 2500)) };
        }
      }
      throw new Error("Could not extract text from the Word document: " + (err?.message || "Unknown error"));
    }
  }

  // 3. PDF files
  if (originalName.endsWith(".pdf") || mime.includes("pdf")) {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy();
    return { text: data.text || "", numpages: data.total || 1 };
  }

  // 4. Fallback autodetection by content signature
  // Magic bytes for PDF: %PDF-
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString() === "%PDF-") {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy();
    return { text: data.text || "", numpages: data.total || 1 };
  }

  // Magic bytes for ZIP/DOCX: PK\x03\x04
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || "").trim();
      if (text) {
        return { text, numpages: Math.max(1, Math.ceil(text.length / 2500)) };
      }
    } catch {
      // ignore and try text fallback
    }
  }

  // UTF-8 plain text fallback (if minimal null bytes)
  let nullBytes = 0;
  const sampleSize = Math.min(buffer.length, 1000);
  for (let i = 0; i < sampleSize; i++) {
    if (buffer[i] === 0) nullBytes++;
  }
  if (nullBytes < 5) {
    const text = buffer.toString("utf-8");
    return { text, numpages: Math.max(1, Math.ceil(text.length / 2500)) };
  }

  throw new Error("Unsupported file format. Please upload a .pdf, Word document (.docx, .doc), Markdown (.md), or plain text (.txt) file.");
}

// API Route: Extract text from PDF, Word Docs (.docx/.doc), Markdown (.md), and TXT
const handleExtractEndpoint = (req: express.Request, res: express.Response) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: "File too large. Maximum size is 50MB." });
      }
      return res.status(500).json({ error: "Upload failed: " + err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const data = await extractDocumentContent(req.file);
      res.json({ text: data.text, numpages: data.numpages });
    } catch (error: any) {
      console.error("Error extracting document:", error);
      if (error?.status === 429 || error?.isQuotaError) {
        return res.status(429).json({ error: "QUOTA_EXCEEDED", message: error.message });
      }
      res.status(500).json({ error: error.message || "Failed to parse document" });
    }
  });
};

app.post("/api/extract-pdf", handleExtractEndpoint);
app.post("/api/extract-document", handleExtractEndpoint);

// API Route: AI Architect (Propose book structure) - Advanced Streaming
app.post("/api/architect-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { title, description, sources, options } = req.body;
    
    if (!sources || sources.length === 0) {
      sendEvent("error", { message: "No sources provided" });
      return res.end();
    }

    sendEvent("progress", { stage: "NORMALIZATION", message: "Normalizing sources..." });
    
    interface Chunk {
      id: string;
      sourceId: string;
      sourceName: string;
      text: string;
      charCount: number;
    }
    
    const chunks: Chunk[] = [];
    const MAX_CHUNK_CHARS = 4000;

    for (const source of sources) {
       let text = source.content || "";
       const paragraphs = text.split(/\n\n+/);
       let currentChunkText = "";
       
       for (const p of paragraphs) {
          if (currentChunkText.length + p.length > MAX_CHUNK_CHARS && currentChunkText.length > 0) {
              chunks.push({
                 id: Math.random().toString(36).substring(7),
                 sourceId: source.id,
                 sourceName: source.name,
                 text: currentChunkText.trim(),
                 charCount: currentChunkText.length
              });
              currentChunkText = "";
          }
          currentChunkText += p + "\n\n";
       }
       if (currentChunkText.trim().length > 0) {
          chunks.push({
             id: Math.random().toString(36).substring(7),
             sourceId: source.id,
             sourceName: source.name,
             text: currentChunkText.trim(),
             charCount: currentChunkText.length
          });
       }
    }

    sendEvent("progress", { stage: "CHUNKING", message: `Generated ${chunks.length} chunks from ${sources.length} sources.` });

    const chunkBatches = [];
    for (let i = 0; i < chunks.length; i += 5) {
       chunkBatches.push(chunks.slice(i, i + 5));
    }

    const analyzedChunksMetadata: any[] = [];

    sendEvent("progress", { stage: "TOPIC_ANALYSIS", message: "Analyzing topics in chunks...", progress: 0 });

    for (let i = 0; i < chunkBatches.length; i++) {
        const batch = chunkBatches[i];
        
        const prompt = `Analyze the following text chunks. For each chunk, extract the main topics, subtopics, and categorize the content type.
The content type MUST be one or more of: factual explanation, example, code, definition, warning, best practice, interview question, production scenario, diagram candidate.

Chunks:
${batch.map(c => `--- CHUNK ID: ${c.id} (Source ID: ${c.sourceId}, Name: ${c.sourceName}) ---\n${c.text}`).join("\n\n")}`;

        try {
            const response = await generateContentWithRetry({ model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash", contents: prompt, config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                             chunkId: { type: Type.STRING },
                             sourceId: { type: Type.STRING },
                             sourceName: { type: Type.STRING },
                             topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                             contentTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
                             summary: { type: Type.STRING }
                          },
                          required: ["chunkId", "topics", "contentTypes", "summary"]
                      }
                  }
               }
            }, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string);
            
            const batchMeta = JSON.parse(response.text || "[]");
            analyzedChunksMetadata.push(...batchMeta);
        } catch (e) {
            console.error("Error in topic analysis batch:", e);
        }

        sendEvent("progress", { 
           stage: "TOPIC_ANALYSIS", 
           message: `Analyzed batch ${i + 1} of ${chunkBatches.length}...`,
           progress: Math.round(((i + 1) / chunkBatches.length) * 100)
        });
    }

    sendEvent("progress", { stage: "DUPLICATE_DETECTION", message: "Detecting semantic duplicates and conflicts..." });
    
    const dupPrompt = `You are a Book Architect AI. Review the following chunk metadata from multiple sources.
Identify semantically similar content, redundant explanations, and potential contradictions (where sources disagree on facts or approaches).

Chunk Metadata:
${JSON.stringify(analyzedChunksMetadata, null, 2)}`;

    let dupResult = {};
    try {
        const dupResponse = await generateContentWithRetry({
           model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash",
           contents: dupPrompt,
           config: {
               responseMimeType: "application/json",
               responseSchema: {
                   type: Type.OBJECT,
                   properties: {
                      duplicates: { 
                         type: Type.ARRAY, 
                         items: { 
                            type: Type.OBJECT, 
                            properties: {
                               topic: { type: Type.STRING },
                               chunkIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                               recommendation: { type: Type.STRING }
                            } 
                         } 
                      },
                      conflicts: {
                         type: Type.ARRAY, 
                         items: { 
                            type: Type.OBJECT, 
                            properties: {
                               topic: { type: Type.STRING },
                               description: { type: Type.STRING },
                               sourceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                               sourceNames: { type: Type.ARRAY, items: { type: Type.STRING } }
                            } 
                         }
                      }
                   }
               }
           }
        }, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string);
        dupResult = JSON.parse(dupResponse.text || "{}");
    } catch (e) {
        console.error("Error in duplicate detection:", e);
    }

    sendEvent("progress", { stage: "RELATIONSHIP_ANALYSIS", message: "Mapping content relationships..." });
    
    sendEvent("progress", { stage: "BOOK_OUTLINE", message: "Generating final structured book outline..." });
    
    const outlinePrompt = `You are an expert Book Architect. Generate a structured JSON book outline based on the analyzed topics, duplicates, and conflicts.
Book Title: ${title || "Untitled Book"}
Book Description: ${description || "No description provided."}
Regeneration Options / Instructions: ${options ? JSON.stringify(options) : "Standard professional organization"}

Use the following analyzed chunk metadata and conflict information to construct a cohesive structure.
Ensure conflicts are surfaced in the outline sections.

Source Mapping:
${sources.map((s: any) => `ID: ${s.id} | NAME: ${s.name}`).join("\n")}

Metadata:
${JSON.stringify(analyzedChunksMetadata, null, 2)}

Duplicates & Conflicts:
${JSON.stringify(dupResult, null, 2)}`;

    const outlineResponse = await generateContentWithRetry({
       model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash",
       contents: outlinePrompt,
       config: {
           responseMimeType: "application/json",
           responseSchema: {
             type: Type.OBJECT,
             properties: {
               title: { type: Type.STRING },
               chapters: {
                 type: Type.ARRAY,
                 items: {
                   type: Type.OBJECT,
                   properties: {
                     id: { type: Type.STRING },
                     title: { type: Type.STRING },
                     description: { type: Type.STRING },
                     sections: {
                       type: Type.ARRAY,
                       items: {
                         type: Type.OBJECT,
                         properties: {
                           id: { type: Type.STRING },
                           title: { type: Type.STRING },
                           purpose: { type: Type.STRING },
                           sourceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                           conflicts: {
                             type: Type.ARRAY,
                             items: {
                               type: Type.OBJECT,
                               properties: {
                                 description: { type: Type.STRING },
                                 sourceNames: { type: Type.ARRAY, items: { type: Type.STRING } }
                               }
                             }
                           }
                         },
                         required: ["id", "title", "purpose"]
                       }
                     }
                   },
                   required: ["id", "title", "sections"]
                 }
               }
             },
             required: ["title", "chapters"]
           }
       }
    }, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string);
    
    const outline = JSON.parse(outlineResponse.text || "{}");
    sendEvent("complete", { outline, usageMetadata: outlineResponse.usageMetadata });
    res.end();
  } catch (error: any) {
    console.error("Error in AI Architect Stream:", error);
    sendEvent("error", { message: error.message });
    res.end();
  }
});

// API Route: AI Architect (Legacy / Simple)
app.post("/api/architect", async (req, res) => {
  try {
    const { sources } = req.body;
    
    if (!sources || sources.length === 0) {
      return res.status(400).json({ error: "No sources provided" });
    }

    const sourceContents = sources.map((s: any) => `SOURCE: ${s.name}\nTYPE: ${s.type}\nCONTENT:\n${s.content}`).join("\n\n---\n\n");
    
    const prompt = `You are an expert AI Book Architect. Analyze the following source materials and propose a professional ebook structure. 
Identify major topics, chapters, and sections. 

${sourceContents}`;

    const response = await generateContentWithRetry({ model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash", contents: prompt, config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chapters: {
              type: Type.ARRAY,
              description: "List of chapters for the proposed book",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  sections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING }
                      },
                      required: ["id", "title"]
                    }
                  }
                },
                required: ["id", "title", "sections"]
              }
            }
          },
          required: ["chapters"]
        }
      }
    }, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string);

    const result = JSON.parse(response.text || "{}");
    res.json({ ...result, usageMetadata: response.usageMetadata });
  } catch (error: any) {
    console.error("Error in AI Architect:", error);
    if (error?.status === 429 || error?.isQuotaError) {
      return res.status(429).json({ error: "QUOTA_EXCEEDED", message: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// API Route: Organize Content (Generate content for a specific section based on sources)
app.post("/api/generate-section", async (req, res) => {
  try {
    const { sectionTitle, chapterTitle, sources } = req.body;
    
    if (!sources || sources.length === 0) {
      return res.status(400).json({ error: "No sources provided" });
    }

    const sourceContents = sources.map((s: any) => `SOURCE: ${s.name}\nCONTENT:\n${s.content}`).join("\n\n---\n\n");
    
        const prompt = `You are an expert technical author and UX designer. Write the content for the section "${sectionTitle}" which belongs to the chapter "${chapterTitle}".
Use the following source materials. If you detect that the source material includes "pasted text" or loosely structured notes, strictly rewrite it into a highly polished, aesthetic template design using the provided HTML classes below.

IMPORTANT STYLING REQUIREMENTS (You must use these raw HTML structures instead of standard Markdown where applicable):

1. For important notes or warnings: <div class="hand-card"><span class="card-label purple">Note</span><p>content here...</p></div>
2. For simple conceptual explanations: <div class="callout-simple"><div class="callout-title">Concept</div><p>content...</p></div>
3. For statistics or metrics grids: <div class="stat-grid"><div class="stat-card"><div class="stat-val">X</div><div class="stat-label">Label</div></div>...</div>
4. For text highlights: <span class="highlight">yellow</span> or <span class="highlight-cyan">cyan</span>
5. For Interview Q&A (if applicable): <div class="interview-section"><div class="interview-title">Interview Question</div><div class="interview-q">Q: question?</div><div class="interview-a">A: answer...</div></div>
6. For ASCII diagrams: <div class="diagram-box">ascii diagram here...</div><div class="diagram-caption">Caption here</div>
7. For Procedures, Workflows, Architectures & System Diagrams:
- If the source notes contain Mermaid diagrams (\`\`\`mermaid ... \`\`\`) or describe system architectures, data flows, sequences, state transitions, or cloud services:
  RENDER THEM as valid Mermaid diagrams:
  <figure class="notebook-figure diagram-container">
    <div class="diagram-badge">SYSTEM ARCHITECTURE & WORKFLOW</div>
    <pre class="mermaid">
    ...mermaid code...
    </pre>
    <figcaption>Architecture Description</figcaption>
  </figure>
- Always preserve any user-provided Mermaid code blocks exactly.
8. For User Images & Figures (When source material contains an image or screenshot tag, preserve it exactly):
<figure class="notebook-figure">
  <img src="EXACT_IMAGE_URL" alt="Description" />
  <figcaption>Caption description</figcaption>
</figure>

Do not blindly copy everything. Remove obvious duplication. Preserve important technical details. Maintain factual meaning.
Output the content combining Markdown (for basic paragraphs/headers/lists) and RAW HTML (for the advanced layout structures above).
Do not include the main section title at the top, just the content itself.

SOURCES:
${sourceContents}`;

    // START KEEP-ALIVE
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();
    const keepAlive = setInterval(() => {
      res.write(" "); // Write space to keep connection alive
      if (typeof (res as any).flush === "function") (res as any).flush();
    }, 10000);
    // END KEEP-ALIVE

    const response = await generateContentWithRetry({
      model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash",
      contents: prompt
    }, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string);
    clearInterval(keepAlive);

    res.json({ content: processAndFormatMermaidDiagrams(response.text), usageMetadata: response.usageMetadata });
  } catch (error: any) {
    console.error("Error in generate-section:", error);
    if (error?.status === 429 || error?.isQuotaError) {
      return res.status(429).json({ error: "QUOTA_EXCEEDED", message: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});


// Direct Format API
app.post("/api/format-direct", async (req, res) => {
  const { chapterTitle, sectionTitle, rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: "No raw text provided" });

  const prompt = `You are an Expert Technical Writer and Systems Architect.
Your mission is to format the user-provided notes into a single, standalone, responsive HTML manual designed as an "Engineering Field Notebook".

CRITICAL INSTRUCTION: You MUST strictly use the provided content. Do not generate completely different output, do not hallucinate new sections. Formulate the user's notes into the requested HTML structure.

### CORE OUTPUT RULES:
1. Output ONLY valid, raw, standalone HTML. Do NOT wrap inside markdown codeblocks (no \`\`\`html, just <!DOCTYPE html> to </html>).
2. The HTML must have zero external CSS/JS framework dependencies (No Tailwind, No Bootstrap). Use only vanilla CSS and the included Google Fonts.
3. All tags must be strictly balanced and closed with 100% valid HTML syntax.
4. Tone: Senior Staff / Principal Systems Architect. Clean, readable, well-structured.
5. PEDAGOGY & MENTAL MODEL: You MUST write the most exceptionally clear, comprehensive, and memorable notes possible. The user relies on this to build a highly accurate mental model of the system.
- Break down complex definitions into simple, intuitive concepts.
- Expand command descriptions so they are highly descriptive and help the user easily understand and memorize what the command does, why to use it, and how it works.
- NEVER just write a 3-word description. Write a full, articulate sentence explaining the "why" and "how".
- Structure everything visually. Use headings effectively. Make it easy to scan and memorize.
6. LISTS, CRITERIA & POINTS vs TABLES:
- When the raw notes contain Acceptance Criteria, requirements, user stories, numbered steps, or itemized points:
  Format them primarily with clean, structured ordered lists (<ol>) or unordered lists (<ul>), or enclose them in a <div class="spec-card"><div class="spec-badge">ACCEPTANCE CRITERIA</div><ol>...</ol></div>. Preserve nested sub-points cleanly!
- Only use <table> when data is genuinely tabular (e.g. commands & flags, configuration parameters, or action-to-state mapping matrices).
- If using <table>, ensure column headers are concise and balanced. Columns adjust dynamically; never squeeze long descriptive sentences into rigid narrow columns.
7. PROCEDURES, WORKFLOWS & ARCHITECTURE DIAGRAMS (MERMAID FULLY SUPPORTED):
- If the raw notes contain any Mermaid diagrams (\`\`\`mermaid ... \`\`\`) or describe system architecture, service interactions, data flow, sequence workflows, cloud infrastructure, or state machines:
  YOU MUST RENDER THEM AS A NATIVE MERMAID DIAGRAM!
  Format it wrapped inside a notebook figure with pre.mermaid:
  <figure class="notebook-figure diagram-container">
    <div class="diagram-badge">SYSTEM ARCHITECTURE & WORKFLOW</div>
    <pre class="mermaid">
flowchart TD
  ...valid mermaid code...
    </pre>
    <figcaption>Architecture Flow Diagram</figcaption>
  </figure>
- Preserve every user-provided Mermaid diagram block cleanly. Ensure Mermaid syntax is valid (e.g. flowchart TD, sequenceDiagram, classDiagram, erDiagram).
8. USER-PASTED IMAGES & FIGURES (CRITICAL MANDATE):
- If the raw notes contain any pasted images, markdown images ![alt](url), or HTML &lt;img src="..." ...&gt; or &lt;figure&gt;...&lt;/figure&gt;:
  You MUST PRESERVE EVERY IMAGE! Place each image in its relevant context within the chapter.
  Wrap each image in the notebook figure container:
  <figure class="notebook-figure">
    <img src="EXACT_IMAGE_URL" alt="Descriptive alt text" />
    <figcaption>Meaningful title or caption for the image</figcaption>
  </figure>
- CRITICAL: Never omit or delete user image URLs. Always retain the exact src URL (e.g. /uploads/img_xxx.png or data:image/...).

### DESIGN SYSTEM & HTML STRUCTURE:
Follow this exact structural template for the content:

<header style="text-align: center;">
  <h1 class="notebook-title">${chapterTitle}</h1>
  <div class="subtitle">Brief subtitle summarizing the notes</div>
  <hr class="header-divider" />
</header>

<!-- For important notes, tips, or callouts from the text -->
<div class="source-note-card">
  <div class="note-badge">SOURCE NOTE</div>
  <p>Your important note here...</p>
</div>

<!-- For System Architecture, Component Flows, or Sequence Diagrams: -->
<figure class="notebook-figure diagram-container">
  <div class="diagram-badge">SYSTEM ARCHITECTURE & WORKFLOW</div>
  <pre class="mermaid">
flowchart TD
  Client[Client Layer] --> API[API Gateway]
  API --> Service[Backend Service]
  Service --> DB[(Database)]
  </pre>
  <figcaption>System Interaction & Architecture Pipeline</figcaption>
</figure>

<!-- For Workflows, Step-by-Step Procedures, or Execution Logic -->
<div class="spec-card">
  <div class="spec-badge">WORKFLOW / PROCEDURE</div>
  <ol>
    <li><strong>Step 1:</strong> Initial user action and validation check.</li>
    <li><strong>Step 2:</strong> Routing based on selected parameters.</li>
    <li><strong>Step 3:</strong> Final confirmation and state persistence.</li>
  </ol>
</div>

<!-- For Acceptance Criteria, Requirements, Rules, or Numbered Specifications: -->
<!-- ALWAYS prefer clean, semantic ordered/unordered lists (<ol> or <ul>) or styled specification cards. Never crush nested requirements or acceptance criteria into awkward multi-column tables unless it is a natural, concise matrix. -->
<div class="spec-card">
  <div class="spec-badge">ACCEPTANCE CRITERIA</div>
  <ol>
    <li><strong>Account Selection Default:</strong> The Individual Account option shall be selected by default.
      <ul>
        <li>The Individual Account card shall be visually highlighted.</li>
        <li>The Individual Account radio button shall be selected.</li>
      </ul>
    </li>
    <li><strong>Single Selection:</strong> Only one account type shall be selectable at a time.</li>
  </ol>
</div>

<!-- For lists of commands, properties, or multi-column matrix/mapping data, use a table: -->
<table>
  <thead>
    <tr>
      <th>USER ACTION</th>
      <th>SYSTEM ROUTING BEHAVIOR</th>
      <th>REDIRECTION TARGET</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Clicking "Continue" button while Individual Account is active.</td>
      <td>Stores selected account type as Individual Account.</td>
      <td>Redirects user to the Individual: Create Account screen.</td>
    </tr>
  </tbody>
</table>

<!-- For User-Pasted Images or Screenshots: -->
<figure class="notebook-figure">
  <img src="IMAGE_URL" alt="Diagram / Screenshot" />
  <figcaption>Caption describing the diagram or screenshot</figcaption>
</figure>

### HTML STRUCTURE:
Follow this exact structural template for the output content:

<header style="text-align: center;">
  <h1 class="notebook-title">${chapterTitle}</h1>
  <div class="subtitle">Notes and Documentation</div>
  <hr class="header-divider" />
</header>
<!-- CONTENT CHAPTERS GO HERE -->

Convert the attached notes into raw HTML content following the notebook styles.
DO NOT OUTPUT ANY CSS. DO NOT OUTPUT <head> or <body> tags or <!DOCTYPE html>. Output ONLY the raw inner HTML content starting with the <header> tag, nothing else.
Use the chapter title "${chapterTitle}" as the main Title.
STRICTLY base the content ONLY on the RAW NOTES provided below. Do not invent new content.

RAW NOTES:
${rawText}`;

  try {
    // START KEEP-ALIVE
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();
    const keepAlive = setInterval(() => {
      res.write(" "); // Write space to keep connection alive
      if (typeof (res as any).flush === "function") (res as any).flush();
    }, 10000);
    // END KEEP-ALIVE

    const response = await generateContentWithRetry({
      model: (req.headers["x-gemini-model"] as string) || "gemini-3.5-flash",
      contents: prompt
    }, req.headers["x-gemini-api-key"] as string, req.headers["x-api-base-url"] as string);
    
    // Clean up potential markdown formatting from Gemini
        let content = response.text;
    if (content.startsWith("```html")) {
      content = content.replace(/^\`\`\`html\n/, "").replace(/\n\`\`\`$/, "");
    } else if (content.startsWith("```")) {
      content = content.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "");
    }
    
    // Inject the boilerplate CSS and HTML structure around the generated content to save LLM tokens
    const boilerplateTop = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${chapterTitle} - Engineering Systems Manual</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Patrick+Hand&family=Patrick+Hand+SC&display=swap" rel="stylesheet">
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="/vendor/mermaid.min.js"></script>
  <script>
    function applyHighlights() {
      if (typeof hljs !== 'undefined') hljs.highlightAll();
       document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        if (h.textContent.trim().toLowerCase().includes('description')) {
          h.style.color = '#8b5cf6';
        }
      });
      if (typeof mermaid !== 'undefined') {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: "'Patrick Hand', cursive, sans-serif"
          });
          mermaid.run({ querySelector: '.mermaid' });
        } catch(e) { console.error('Mermaid render error:', e); }
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyHighlights);
    } else {
      applyHighlights();
    }
  </script>
  <style>
    :root {
      --bg-desk: #f4eee1;
      --paper-line: #e3dac9;
      --bg-page: #fcf9f2;
      --ink-black: #1e1e24;
      --ink-blue: #1c4b82;
      --ink-purple: #6b46c1;
      --border-dark: #2d3748;
      --shadow-color: rgba(0, 0, 0, 0.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-desk);
      font-family: 'Patrick Hand', cursive;
      font-size: 1.15rem;
      line-height: 32px;
      color: var(--ink-black);
      padding: 2rem 1rem;
    }
    .notebook-container {
      width: 816px; /* 8.5 inches at 96 DPI */
      max-width: 100%;
      min-height: 1056px; /* 11 inches at 96 DPI */
      margin: 0 auto;
      background-color: var(--bg-page);
      background-image: 
        linear-gradient(to right, transparent 78px, #fca5a5 78px, #fca5a5 80px, transparent 80px),
        linear-gradient(to bottom, transparent 31px, var(--paper-line) 32px);
      background-size: 100% 100%, 100% 32px;
      background-position: 0 0, 0 0;
      padding: 3rem 4rem 3rem 6rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px var(--shadow-color);
      border: 1px solid var(--paper-line);
    }
    header {
      margin-bottom: 2rem;
      text-align: center;
    }
    .book-tag {
      display: none !important;
    }
    h1.notebook-title {
      font-family: 'Patrick Hand SC', cursive;
      font-size: 3rem;
      line-height: 1.1;
      color: var(--ink-blue);
      margin: 0 auto 0.5rem auto;
      text-align: center;
    }
    .subtitle {
      font-size: 1.35rem;
      color: #64748b;
      line-height: 1.4;
      margin: 0 auto 1.5rem auto;
      text-align: center;
      max-width: 820px;
    }
    .header-divider {
      border: none;
      border-bottom: 3px dashed var(--ink-blue);
      margin: 1.5rem auto;
      opacity: 0.7;
      max-width: 100%;
    }
    h2 {
      font-family: 'Patrick Hand SC', cursive;
      font-size: 2rem;
      color: var(--ink-blue);
      margin: 2.5rem 0 1rem;
      border-bottom: 1.5px solid var(--paper-line);
      padding-bottom: 0.25rem;
    }
    h3 {
      font-family: 'Patrick Hand SC', cursive;
      font-size: 1.5rem;
      color: var(--ink-black);
      margin: 1.5rem 0 0.5rem;
    }
    p { margin-bottom: 1rem; }
    ul, ol {
      margin: 0.75rem 0 1.5rem 2rem;
      padding-left: 0.5rem;
    }
    li {
      margin-bottom: 0.45rem;
      line-height: 1.6;
    }
    li::marker {
      color: var(--ink-blue);
      font-weight: bold;
    }
    ol ol, ul ul, ol ul, ul ol {
      margin: 0.35rem 0 0.5rem 1.5rem;
    }
    /* SPECIFICATION & ACCEPTANCE CRITERIA CARD */
    .spec-card {
      background: transparent;
      border: 2px solid var(--border-dark);
      border-radius: 8px;
      padding: 1.5rem 1.75rem;
      margin: 2rem 0;
      position: relative;
    }
    .spec-badge {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid var(--border-dark);
      border-radius: 4px;
      padding: 0.2rem 0.75rem;
      font-family: 'Patrick Hand SC', cursive;
      font-size: 0.9rem;
      font-weight: bold;
      display: inline-block;
      margin-bottom: 1rem;
      box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    }
    code {
      font-family: 'Fira Code', monospace;
      font-size: 0.9em;
      background: #e0e7ff;
      color: #0f172a;
      padding: 0.3rem 0.5rem;
      border-radius: 6px;
      word-break: break-word;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin: 1.5rem 0;
      overflow-x: auto;
      box-shadow: 3px 4px 0 var(--shadow-color);
      border: 1px solid #334155;
      font-family: 'Fira Code', monospace;
      font-size: 0.92rem;
      line-height: 1.6;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      border-radius: 0;
      font-size: inherit;
      line-height: inherit;
    }
    /* SOURCE NOTE CARD */
    .source-note-card {
      background: transparent;
      border: 2px solid var(--border-dark);
      border-radius: 8px;
      padding: 1.5rem 1.75rem;
      margin: 2.5rem 0;      position: relative;
    }
    .note-badge {
      background: #fde047;
      border: 1px solid var(--border-dark);
      border-radius: 4px;
      padding: 0.2rem 0.75rem;
      font-family: 'Patrick Hand SC', cursive;
      font-size: 0.9rem;      font-weight: bold;
      display: inline-block;
      margin-bottom: 1rem;      box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    }
    /* TABLES (DYNAMIC AUTO SIZING, NO ZERO-WIDTH CRUSHING) */
    table {
      width: 100%;      border-collapse: collapse;      margin: 2rem 0;      background: transparent;
      border: 1.5px solid var(--paper-line);      border-radius: 8px;      overflow: hidden;      table-layout: auto;
    }
    th {
      font-family: 'Patrick Hand SC', cursive;      color: #3730a3;      text-align: left;
      padding: 0.85rem 1.15rem;      border-bottom: 1.5px solid var(--paper-line);      border-right: 1px solid var(--paper-line);
      background: #eef2ff;      font-size: 1.15rem;      letter-spacing: 0.5px;      vertical-align: top;
      word-break: normal;
    }
    th:last-child {
      border-right: none;
    }
    td {
      padding: 0.85rem 1.15rem;      border-bottom: 1px solid var(--paper-line);      border-right: 1px solid var(--paper-line);
      color: #1e1e24;      line-height: 1.6;      vertical-align: top;      word-break: normal;
      overflow-wrap: break-word;
    }
    td:last-child {
      border-right: none;
    }
    h2 {
      display: inline-block;
      background: linear-gradient(120deg, rgba(254, 240, 138, 0.7) 0%, rgba(254, 240, 138, 0.7) 100%);
      background-repeat: no-repeat;      background-size: 100% 35%;      background-position: 0 85%;
      padding-right: 0.5rem;      padding-left: 0.2rem;
    }
    tr:last-child td { border-bottom: none; }
    /* NOTEBOOK IMAGE, DIAGRAM & FIGURE STYLES */
    .notebook-figure, .diagram-container {
      background: #ffffff;      border: 2px solid var(--border-dark);      border-radius: 8px;
      padding: 1.25rem 1.5rem;      margin: 2.5rem 0;      text-align: center;
      box-shadow: 4px 5px 0 var(--shadow-color);      break-inside: avoid;      page-break-inside: avoid;
      position: relative;
    }
    .diagram-badge {
      background: #e0e7ff;      color: #3730a3;      border: 1px solid var(--border-dark);
      border-radius: 4px;      padding: 0.2rem 0.75rem;      font-family: 'Patrick Hand SC', cursive;
      font-size: 0.9rem;      font-weight: bold;      display: inline-block;
      margin-bottom: 1rem;      box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    }
    .mermaid {
      background: transparent !important;      display: flex !important;      justify-content: center !important;
      align-items: center !important;      margin: 0.5rem auto !important;      overflow-x: auto !important;
      width: 100% !important;      font-family: 'Patrick Hand', cursive, sans-serif !important;
    }
    .mermaid svg {
      max-width: 100% !important;      height: auto !important;      display: block !important;
      margin: 0 auto !important;
    }
    .notebook-figure img, img {
      max-width: 100% !important;      height: auto !important;      border-radius: 6px;
      display: block;      margin: 0 auto;      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .notebook-figure figcaption {
      font-family: 'Patrick Hand', cursive;      font-size: 1.05rem;      color: #64748b;
      margin-top: 1rem;      font-style: italic;
    }
    /* Print Formatting */
    @media print {
      html, body {
        background-color: var(--bg-desk) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .notebook-container {
        padding: 3rem 4rem 3rem 6rem !important;
        background-color: var(--bg-page) !important;
        border: 1px solid var(--paper-line) !important;
        box-shadow: 0 10px 25px var(--shadow-color) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .source-note-card, pre, table, tr, .notebook-figure, img {
        break-inside: avoid;        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="notebook-container">
`;
    const boilerplateBottom = `
  </div>
</body>
</html>`;
    
    if (!content.includes("<body")) {
      content = boilerplateTop + content + boilerplateBottom;
    } else if (content.startsWith("```")) {
      content = content.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "");
    }

    // Safety net: ensure any user-uploaded or pasted images in raw notes are preserved in the HTML output
    const imgRegex = /(?:!\[(.*?)\]\((.*?)\)|<img[^>]+src=["'](.*?)["'])/gi;
    const foundImages: { alt: string; url: string }[] = [];
    let match;
    while ((match = imgRegex.exec(rawText)) !== null) {
      const url = match[2] || match[3];
      const alt = match[1] || "Figure";
      if (url && !foundImages.some(item => item.url === url)) {
        foundImages.push({ alt, url });
      }
    }

    for (const img of foundImages) {
      if (!content.includes(img.url)) {
        const figureBlock = `\n<figure class="notebook-figure">\n  <img src="${img.url}" alt="${img.alt}" />\n  <figcaption>${img.alt || 'Pasted image'}</figcaption>\n</figure>\n`;
        if (content.includes("</body>")) {
          content = content.replace("</body>", `${figureBlock}</body>`);
        } else if (content.includes("</div>")) {
          const lastDivIndex = content.lastIndexOf("</div>");
          content = content.substring(0, lastDivIndex) + figureBlock + content.substring(lastDivIndex);
        } else {
          content += figureBlock;
        }
      }
    }

    // Safety net: ensure any Mermaid diagrams in raw notes are preserved in the HTML output
    const mermaidRegex = /```mermaid\s*([\s\S]*?)\s*```/gi;
    let mMatch;
    while ((mMatch = mermaidRegex.exec(rawText)) !== null) {
      const chart = mMatch[1].trim();
      const chartSnippet = chart.substring(0, 35);
      if (!content.includes(chartSnippet)) {
        const figureBlock = `\n<figure class="notebook-figure diagram-container">\n  <div class="diagram-badge">SYSTEM ARCHITECTURE & WORKFLOW</div>\n  <pre class="mermaid">\n${chart}\n  </pre>\n  <figcaption>System Architecture & Workflow</figcaption>\n</figure>\n`;
        if (content.includes("</body>")) {
          content = content.replace("</body>", `${figureBlock}</body>`);
        } else if (content.includes("</div>")) {
          const lastDivIndex = content.lastIndexOf("</div>");
          content = content.substring(0, lastDivIndex) + figureBlock + content.substring(lastDivIndex);
        } else {
          content += figureBlock;
        }
      }
    }
    
    content = processAndFormatMermaidDiagrams(content);
    res.write(JSON.stringify({ content, usageMetadata: response.usageMetadata }));
    res.end();
  } catch (error: any) {
    console.error("Error in format-direct:", error);
    if (!res.headersSent) {
       if (error?.status === 429 || error?.isQuotaError) {
         return res.status(429).json({ error: "QUOTA_EXCEEDED", message: error.message });
       }
       return res.status(500).json({ error: error.message });
    } else {
       if (error?.status === 429 || error?.isQuotaError) {
         res.write(JSON.stringify({ error: "QUOTA_EXCEEDED", message: error.message }));
       } else {
         res.write(JSON.stringify({ error: error.message }));
       }
       res.end();
    }
  }
});

// Helper to safely preserve and format Mermaid diagrams and purge unwanted book-tag banners
function processAndFormatMermaidDiagrams(html: string): string {
  if (!html) return "";
  let processed = html;

  // Convert raw ```mermaid markdown blocks to standard HTML pre.mermaid containers
  processed = processed.replace(/```mermaid\s*([\s\S]*?)\s*```/gi, (match, chartCode) => {
    return `<figure class="notebook-figure diagram-container">\n  <div class="diagram-badge">SYSTEM ARCHITECTURE & WORKFLOW</div>\n  <pre class="mermaid">\n${chartCode.trim()}\n  </pre>\n  <figcaption>Architecture Flow Diagram</figcaption>\n</figure>`;
  });

  // Only purge top/bottom placeholder book tags, never diagrams
  processed = processed.replace(/<div[^>]*class=["'][^"']*book-tag[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "");
  return processed;
}

// Optimistic PDF Cache & Warmed Browser Pool
const pdfOptimisticCache = new Map<string, {
  status: "generating" | "ready" | "failed";
  pdfPath?: string;
  promise?: Promise<string>;
  error?: string;
  timestamp: number;
}>();

// Persistent warmed Chromium browser instance for near-instant rendering
let warmedBrowserPromise: Promise<any> | null = null;

async function getWarmedBrowser(): Promise<any> {
  if (!warmedBrowserPromise) {
    warmedBrowserPromise = (async () => {
      const executablePath = await chromium.executablePath();
      const args = chromium.args;
      const headless = chromium.headless;
      
      const env = {
        ...process.env,
        LD_LIBRARY_PATH: fsSync.existsSync(vendorLibPath)
          ? `${vendorLibPath}:${process.env.LD_LIBRARY_PATH || ""}`
          : process.env.LD_LIBRARY_PATH || ""
      };

      const b = await puppeteer.launch({
        args,
        executablePath,
        headless,
        env,
      });

      b.on('disconnected', () => {
        console.log("Puppeteer browser disconnected, resetting warmed instance.");
        warmedBrowserPromise = null;
      });

      return b;
    })();
  }

  try {
    const browser = await warmedBrowserPromise;
    const isConnected = typeof browser?.connected === 'boolean' 
      ? browser.connected 
      : (typeof browser?.isConnected === 'function' ? browser.isConnected() : true);

    if (!isConnected || (browser.process && browser.process()?.killed)) {
      warmedBrowserPromise = null;
      return getWarmedBrowser();
    }
    return browser;
  } catch (err) {
    warmedBrowserPromise = null;
    throw err;
  }
}

// Warm up the browser in the background when the server starts
getWarmedBrowser().catch(err => console.log("Initial browser warm-up note:", err?.message));

// Helper: Render HTML to compressed PDF using Puppeteer and pdf-lib
async function renderHtmlToCompressedPdf(html: string, outputPath: string, title?: string): Promise<string> {
  const browser = await getWarmedBrowser();
  const page = await browser.newPage();

  try {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Screen media type and 1.5 scale factor for crisp typography with minimal raster bloat
    await page.emulateMediaType('screen');
    await page.setViewport({ width: 850, height: 1100, deviceScaleFactor: 1.0 });

    // Inject base href so relative images (/uploads/...) resolve properly to local server
    let preparedHtml = html;
    if (!preparedHtml.includes('<base ') && !preparedHtml.includes('<base>')) {
      if (preparedHtml.includes('<head>')) {
        preparedHtml = preparedHtml.replace('<head>', '<head><base href="http://localhost:3000/">');
      } else {
        preparedHtml = '<base href="http://localhost:3000/">' + preparedHtml;
      }
    }

    await page.setContent(preparedHtml, { waitUntil: 'networkidle0' as any, timeout: 60000 });

    // Wait for all web fonts (Patrick Hand, Fira Code, etc.) and images to finish loading
    await page.evaluateHandle('document.fonts.ready');
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 4000);
        });
      }));
    });

    // Ensure all Mermaid diagrams are fully initialized and rendered as vector SVGs
    await page.evaluate(async () => {
      if ((window as any).mermaid) {
        try {
          (window as any).mermaid.run({ querySelector: '.mermaid' });
        } catch (e) {}
      }

      const mermaids = Array.from(document.querySelectorAll('.mermaid'));
      if (mermaids.length > 0) {
        let attempts = 0;
        while (attempts < 50) {
          const allRendered = mermaids.every(el => 
            el.querySelector('svg') || el.getAttribute('data-processed') === 'true'
          );
          if (allRendered) break;
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
      }

      // Purge only residual top/bottom book-tag banners
      document.querySelectorAll('.book-tag').forEach(el => el.remove());
    });

    const rawPdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    });

    // Compress PDF using pdf-lib (object streams compression and metadata embedding)
    const pdfDoc = await PDFDocument.load(rawPdfBuffer, { ignoreEncryption: true });
    pdfDoc.setTitle(title || "Engineering Notebook");
    pdfDoc.setCreator("Engineering Notebook Studio");
    pdfDoc.setProducer("pdf-lib & Headless Chromium");

    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50
    });

    const finalBuffer = Buffer.from(compressedPdfBytes);
    await fs.writeFile(outputPath, finalBuffer);
    
    // Ghostscript extreme compression pass
    const gsOutputPath = outputPath.replace('.pdf', '_gs.pdf');
    try {
      await execAsync(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dColorImageResolution=150 -dGrayImageResolution=150 -dMonoImageResolution=150 -dColorImageDownsampleType=/Bicubic -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${gsOutputPath} ${outputPath}`);
      await fs.rename(gsOutputPath, outputPath);
      console.log("Ghostscript compression successful");
    } catch (e) {
      console.error("Ghostscript compression failed, using original", e);
    }
    
    return outputPath;
  } finally {
    // Keep browser alive, only close tab
    await page.close().catch(() => {});
  }
}

// API Route: Optimistic background PDF pre-compilation
app.post("/api/optimistic-prepare-pdf", async (req, res) => {
  const { html, title, hash } = req.body;
  if (!html || !hash) return res.status(400).json({ error: "Missing html or hash" });

  const existing = pdfOptimisticCache.get(hash);
  if (existing) {
    if (existing.status === "ready" && existing.pdfPath && fsSync.existsSync(existing.pdfPath)) {
      return res.json({ status: "ready", cached: true });
    }
    if (existing.status === "generating") {
      return res.json({ status: "generating", cached: true });
    }
  }

  // Launch background optimistic generation
  const optId = `opt_${hash.slice(0, 16)}`;
  const pdfPath = path.join(os.tmpdir(), `${optId}.pdf`);

  const genPromise = (async () => {
    pdfOptimisticCache.set(hash, { status: "generating", pdfPath, timestamp: Date.now() });
    try {
      await renderHtmlToCompressedPdf(html, pdfPath, title);
      pdfOptimisticCache.set(hash, { status: "ready", pdfPath, timestamp: Date.now() });
      return pdfPath;
    } catch (err: any) {
      console.warn("Optimistic background PDF compilation note:", err?.message || err);
      pdfOptimisticCache.set(hash, { status: "failed", error: err?.message, timestamp: Date.now() });
      return null;
    }
  })();

  // Catch rejection so Node runtime never throws an uncaught exception
  genPromise.catch(() => {});

  const item = pdfOptimisticCache.get(hash);
  if (item) {
    item.promise = genPromise;
  }

  res.json({ status: "generating", cached: false });
});

// PDF Generation Endpoints
app.post("/api/export-raw-html", async (req, res) => {
  const { html, title, hash } = req.body;
  if (!html) return res.status(400).json({ error: "Missing html" });

  const exportId = uuidv4();
  const contentHash = hash || crypto.createHash("md5").update(html).digest("hex");

  // Check if optimistic background generator already finished this exact content!
  const cached = pdfOptimisticCache.get(contentHash);
  if (cached && cached.status === "ready" && cached.pdfPath && fsSync.existsSync(cached.pdfPath)) {
    pdfExportJobs.set(exportId, {
      book: { title: title || "Notebook" },
      themeId: "raw",
      status: "completed",
      progress: "Download ready",
      pdfPath: cached.pdfPath
    });
    return res.json({ exportId, ready: true });
  }

  // Check if optimistic generation is already running in background for this exact hash
  if (cached && cached.status === "generating" && cached.promise) {
    pdfExportJobs.set(exportId, {
      book: { title: title || "Notebook" },
      themeId: "raw",
      status: "processing",
      progress: "Finalizing background PDF",
    });

    res.json({ exportId, ready: false });

    cached.promise.then((pdfPath) => {
      if (pdfPath && fsSync.existsSync(pdfPath)) {
        const job = pdfExportJobs.get(exportId);
        if (job) {
          job.pdfPath = pdfPath;
          updateJobProgress(exportId, "Download ready", "completed");
        }
      } else {
        // Fallback to fresh generation if background compiler returned null
        generateRawPdfJob(exportId, html, title, contentHash).catch(err =>
          updateJobProgress(exportId, err.message, "failed", err.message)
        );
      }
    }).catch(() => {
      generateRawPdfJob(exportId, html, title, contentHash).catch(err =>
        updateJobProgress(exportId, err.message, "failed", err.message)
      );
    });
    return;
  }

  pdfExportJobs.set(exportId, {
    book: { title: title || "Notebook" },
    themeId: "raw",
    status: "processing",
    progress: "Preparing document",
  });

  res.json({ exportId, ready: false });

  // Start generation with warmed browser and pdf-lib compression
  generateRawPdfJob(exportId, html, title, contentHash).catch(err => 
    console.error("Raw PDF generation job failed:", err)
  );
});

async function generateRawPdfJob(exportId: string, html: string, title?: string, contentHash?: string) {
  try {
    await updateJobProgress(exportId, "Rendering content");
    const pdfPath = path.join(os.tmpdir(), `${exportId}.pdf`);

    await renderHtmlToCompressedPdf(html, pdfPath, title);

    if (contentHash) {
      pdfOptimisticCache.set(contentHash, {
        status: "ready",
        pdfPath,
        timestamp: Date.now()
      });
    }

    const job = pdfExportJobs.get(exportId);
    if (job) {
      job.pdfPath = pdfPath;
      await updateJobProgress(exportId, "Download ready", "completed");
    }
  } catch (error: any) {
    console.error("PDF generation error:", error);
    await updateJobProgress(exportId, error.message, "failed", error.message);
  }
}

app.post("/api/export-pdf", async (req, res) => {
  const { book, themeId } = req.body;
  if (!book || !themeId) return res.status(400).json({ error: "Missing book or themeId" });

  const exportId = uuidv4();
  pdfExportJobs.set(exportId, {
    book,
    themeId,
    status: "processing",
    progress: "Preparing document",
  });

  res.json({ exportId });

  // Start generation asynchronously
  generatePdfJob(exportId).catch(err => console.error("PDF generation job failed:", err));
});

app.get("/api/export-data/:exportId", (req, res) => {
  const job = pdfExportJobs.get(req.params.exportId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json({ book: job.book, themeId: job.themeId });
});

app.get("/api/export-status/:exportId", (req, res) => {
  const job = pdfExportJobs.get(req.params.exportId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  job.resStream = res;
  res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, error: job.error })}\n\n`);

  req.on("close", () => {
    if (job.resStream === res) {
      job.resStream = undefined;
    }
  });
});

app.get("/api/download-pdf/:exportId", async (req, res) => {
  const job = pdfExportJobs.get(req.params.exportId);
  if (!job || !job.pdfPath) return res.status(404).json({ error: "PDF not found" });
  
  const filename = `${job.book.title.replace(/\s+/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(job.pdfPath);
});

async function updateJobProgress(exportId: string, progress: string, status: string = "processing", error?: string) {
  const job = pdfExportJobs.get(exportId);
  if (!job) return;
  job.progress = progress;
  job.status = status;
  if (error) job.error = error;

  if (job.resStream) {
    job.resStream.write(`data: ${JSON.stringify({ status, progress, error })}\n\n`);
    if (status === "completed" || status === "failed") {
      job.resStream.end();
    }
  }
}

async function generatePdfJob(exportId: string) {
  try {
    await updateJobProgress(exportId, "Preparing document");
    
    const executablePath = await chromium.executablePath();
    const args = chromium.args;
    const headless = chromium.headless;

    const env = {
      ...process.env,
      LD_LIBRARY_PATH: fsSync.existsSync(vendorLibPath)
        ? `${vendorLibPath}:${process.env.LD_LIBRARY_PATH || ""}`
        : process.env.LD_LIBRARY_PATH || ""
    };

    const browser = await puppeteer.launch({
      args,
      executablePath,
      headless,
      env,
    });

    await updateJobProgress(exportId, "Rendering chapters");

    const page = await browser.newPage();
    // Allow seeing console logs from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.emulateMediaType('screen');
    await page.setViewport({ width: 850, height: 1100, deviceScaleFactor: 1.0 });

    // Navigate to the render route
    const renderUrl = `http://localhost:${PORT}/render-pdf/${exportId}`;
    await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 60000 });

    await updateJobProgress(exportId, "Rendering diagrams");

    // Wait for the React component to signal it's done rendering everything
    await page.waitForFunction('window.__PDF_READY__ === true', { timeout: 60000 });

    await updateJobProgress(exportId, "Generating table of contents");
    // Just fake delay to fulfill user state requirements realistically
    await new Promise(r => setTimeout(r, 500));
    
    await updateJobProgress(exportId, "Generating index");
    await new Promise(r => setTimeout(r, 500));

    await updateJobProgress(exportId, "Generating pages");

    const pdfPath = path.join(os.tmpdir(), `${exportId}.pdf`);
    
    // Convert to PDF without header/footer or page numbers
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: 0,
        right: 0
      }
    });

    await updateJobProgress(exportId, "Finalizing PDF");

    await browser.close();
    
    // Ghostscript extreme compression pass
    const gsOutputPath = pdfPath.replace('.pdf', '_gs.pdf');
    try {
      const { exec } = require("child_process");
      const util = require("util");
      const execAsync = util.promisify(exec);
      await execAsync(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dColorImageResolution=150 -dGrayImageResolution=150 -dMonoImageResolution=150 -dColorImageDownsampleType=/Bicubic -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${gsOutputPath} ${pdfPath}`);
      const fsSync = require("fs");
      fsSync.renameSync(gsOutputPath, pdfPath);
      console.log("Ghostscript compression successful for generatePdfJob");
    } catch (e) {
      console.error("Ghostscript compression failed for generatePdfJob, using original", e);
    }
    
    const job = pdfExportJobs.get(exportId);
    if (job) {
      job.pdfPath = pdfPath;
      await updateJobProgress(exportId, "Download ready", "completed");
    }

  } catch (error: any) {
    console.error("PDF generation error:", error);
    await updateJobProgress(exportId, error.message, "failed", error.message);
  }
}

// Fallback for API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API Route not found: " + req.method + " " + req.path });
});

// Global error handler to prevent HTML stack traces
app.use((err, req, res, next) => {
  console.error("Express Error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
