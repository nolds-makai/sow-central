import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ───────── Schema ─────────
//
// Anthropic structured outputs cap the number of nullable / union-typed
// parameters at 16 across the schema. Instead of marking optional fields as
// `["string", "null"]`, we keep them single-typed but omit them from `required` —
// that way the model can leave a field out entirely when the SOW doesn't
// specify it, with zero union types in the schema.

const DeliverableSchema = z.object({
  external_id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  acceptance_criteria: z.string().nullish(),
  due_date: z.string().nullish(),
  depends_on: z.array(z.string()).default([]),
});

const PhaseSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  deliverables: z.array(DeliverableSchema),
});

const WorkstreamSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  phases: z.array(PhaseSchema),
});

const MetadataSchema = z.object({
  title: z.string(),
  client_name: z.string().nullish(),
  engagement_name: z.string().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  total_value: z.string().nullish(),
  currency: z.string().nullish(),
  parties: z.array(z.string()).default([]),
  contract_number: z.string().nullish(),
  effective_date: z.string().nullish(),
  signed_date: z.string().nullish(),
  primary_contact_client: z.string().nullish(),
  primary_contact_makai: z.string().nullish(),
  payment_terms: z.string().nullish(),
  summary: z.string().nullish(),
});

export const SowExtractionSchema = z.object({
  metadata: MetadataSchema,
  workstreams: z.array(WorkstreamSchema),
});

export type SowExtraction = z.infer<typeof SowExtractionSchema>;

// ───────── JSON Schema (sent to the model) ─────────

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    metadata: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", description: "Document title or descriptive header" },
        client_name: { type: "string", description: "Client/customer organization" },
        engagement_name: { type: "string", description: "Engagement or project name" },
        start_date: { type: "string", description: "ISO 8601 date (YYYY-MM-DD) — omit when not specified" },
        end_date: { type: "string", description: "ISO 8601 date (YYYY-MM-DD) — omit when not specified" },
        total_value: { type: "string", description: "Total contract value as it appears (e.g. '$250,000', 'NTE $1.2M')" },
        currency: { type: "string", description: "ISO currency code if specified" },
        parties: {
          type: "array",
          items: { type: "string" },
          description: "Named legal parties beyond client and Makai (subcontractors, partners). [] if none.",
        },
        contract_number: { type: "string" },
        effective_date: { type: "string", description: "ISO 8601 date" },
        signed_date: { type: "string", description: "ISO 8601 date" },
        primary_contact_client: { type: "string" },
        primary_contact_makai: { type: "string" },
        payment_terms: { type: "string", description: "Free-form summary of payment schedule and terms" },
        summary: { type: "string", description: "1-2 sentence engagement summary" },
      },
      required: ["title", "parties"],
    },
    workstreams: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          phases: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                start_date: { type: "string", description: "ISO 8601 date" },
                end_date: { type: "string", description: "ISO 8601 date" },
                deliverables: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      external_id: {
                        type: "string",
                        description: "Stable short ID like D1, D2, D3 — used to reference dependencies",
                      },
                      title: { type: "string" },
                      description: { type: "string" },
                      acceptance_criteria: { type: "string" },
                      due_date: { type: "string", description: "ISO 8601 date" },
                      depends_on: {
                        type: "array",
                        items: { type: "string" },
                        description: "external_ids of other deliverables this depends on (any workstream)",
                      },
                    },
                    required: ["external_id", "title", "depends_on"],
                  },
                },
              },
              required: ["name", "deliverables"],
            },
          },
        },
        required: ["name", "phases"],
      },
    },
  },
  required: ["metadata", "workstreams"],
} as const;

// ───────── Prompt ─────────

const SYSTEM_PROMPT = `You are extracting structured engagement data from a Statement of Work (SOW) PDF for an internal Makai Labs tool.

Extract the SOW into this hierarchy:
- engagement metadata (client, dates, value, contacts, etc.)
- workstreams (top-level domains of work)
  - phases (chronological or logical groupings within a workstream)
    - deliverables (concrete, checkable artifacts)

Rules:
- Assign every deliverable a stable short external_id (D1, D2, D3, ...) numbered sequentially across the entire SOW. Use these IDs in depends_on arrays to capture cross-deliverable dependencies, including across workstreams.
- For dates, output ISO 8601 (YYYY-MM-DD) when an exact date is given. If only a relative timeline is given (e.g. "Week 4"), omit the date field entirely.
- If a field is not present in the SOW, omit it from the output (or use [] for empty arrays). Do not invent values.
- Preserve the SOW's own language for titles and acceptance criteria — do not rephrase.
- If the SOW lacks an explicit workstream/phase split, infer the most natural grouping from headings and section structure rather than dumping everything into one bucket.
- total_value: capture exactly as written (e.g. "$250,000", "Not to exceed $1.2M").
- parties: include only named legal entities beyond client and Makai (subcontractors, partners). Empty array if none.`;

// ───────── Public API ─────────

export async function extractSow(pdfBytes: Buffer): Promise<SowExtraction> {
  const pdfBase64 = pdfBytes.toString("base64");

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema: JSON_SCHEMA },
      effort: "high",
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: "Extract the SOW into the structured schema. Return only the JSON — no commentary.",
          },
        ],
      },
    ],
  });

  const final = await stream.finalMessage();
  const textBlock = final.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic returned no text content for SOW extraction");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (err) {
    throw new Error(
      `SOW extraction returned non-JSON output: ${(err as Error).message}\n--- output ---\n${textBlock.text.slice(0, 2000)}`,
    );
  }

  return SowExtractionSchema.parse(parsed);
}
