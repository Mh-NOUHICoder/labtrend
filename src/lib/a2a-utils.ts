// ─── Strict A2A Schema Utilities for Prompt Opinion Orchestrator ──────────────
//
// SPEC: google/A2A protocol — TaskState is a LOWERCASE string enum:
//   "submitted" | "working" | "input-required" | "completed" | "failed" | "unknown"
//
// C# deserializer (System.Text.Json) is CASE-SENSITIVE.
// Sending "COMPLETED" → throws "could not be converted to A2A.TaskState"
// Sending "completed" → ✅ works
//
// Internal aliases (PENDING → submitted, RUNNING → working) are mapped below.

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Canonical A2A TaskState values (all lowercase — matches the A2A protobuf spec).
 * These are the ONLY values the Prompt Opinion orchestrator will accept.
 */
export type A2ATaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "unknown";

/** Legacy aliases kept for backward-compat with our internal callers. */
export type A2ATaskStateAlias =
  | A2ATaskState
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "pending"
  | "running";

export interface A2AStatus {
  state: A2ATaskState;
}

export interface A2ATask {
  id: string;
  sessionId?: string;
  status: A2AStatus; // ← ONLY "state" inside — any extra key breaks remote parser
  artifacts?: A2AArtifact[];
}

export interface A2AArtifact {
  name: string;
  parts: Array<{ type: string; text: string }>;
}

export interface A2AResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: {
    task: A2ATask;
  };
}

export interface A2AErrorResponse {
  jsonrpc: "2.0";
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ─── State validator + normalizer ─────────────────────────────────────────────

/**
 * Converts ANY state string to a valid, lowercase A2A TaskState.
 *
 * Mappings:
 *   "PENDING"   / "pending"   → "submitted"
 *   "RUNNING"   / "running"   → "working"
 *   "COMPLETED" / "completed" → "completed"
 *   "FAILED"    / "failed"    → "failed"
 *   anything else             → "unknown"
 */
export function validateA2AState(state: string): A2ATaskState {
  const normalized = (state ?? "").trim().toLowerCase();

  const MAP: Record<string, A2ATaskState> = {
    // Standard spec values (pass through)
    submitted: "submitted",
    working: "working",
    "input-required": "input-required",
    completed: "completed",
    failed: "failed",
    unknown: "unknown",
    // Legacy uppercase aliases
    pending: "submitted",
    running: "working",
  };

  const mapped = MAP[normalized];
  if (mapped) return mapped;

  console.warn(`[A2A] ⚠ Invalid state "${state}" — defaulting to "unknown"`);
  return "unknown";
}

// ─── Response builder ─────────────────────────────────────────────────────────

/**
 * Builds a strictly-compliant A2A / JSON-RPC 2.0 response.
 *
 * Guaranteed output shape:
 * {
 *   "jsonrpc": "2.0",
 *   "id": <requestId>,
 *   "result": {
 *     "task": {
 *       "id": "<uuid>",
 *       "status": { "state": "completed" },   ← lowercase, nothing else
 *       "artifacts": [ ... ]
 *     }
 *   }
 * }
 */
export function buildA2AResponse(
  requestId: string | number,
  taskId: string,
  state: A2ATaskStateAlias | string,
  summary: string,
  metadata: Record<string, unknown> = {},
  sessionId?: string
): A2AResponse {
  const normalizedState = validateA2AState(state);

  const task: A2ATask = {
    id: taskId,
    ...(sessionId ? { sessionId } : {}),
    // CRITICAL: status contains ONLY "state" — no timestamp, no message, no extras
    status: {
      state: normalizedState,
    },
    artifacts: [
      {
        name: "clinical_analysis",
        parts: [{ type: "text", text: summary }],
      },
      {
        name: "metadata",
        parts: [{ type: "text", text: JSON.stringify(metadata, null, 2) }],
      },
    ],
  };

  const response: A2AResponse = {
    jsonrpc: "2.0",
    id: requestId,
    result: { task },
  };

  // Debug: log every outbound A2A response
  console.log("[A2A] ✅ Outbound:\n" + JSON.stringify(response, null, 2));

  return response;
}

// ─── Error builder ────────────────────────────────────────────────────────────

export function buildA2AErrorResponse(
  requestId: string | number,
  code: number,
  message: string,
  data?: unknown
): A2AErrorResponse {
  const response: A2AErrorResponse = {
    jsonrpc: "2.0",
    id: requestId,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };

  console.log("[A2A] ❌ Error:\n" + JSON.stringify(response, null, 2));

  return response;
}

// ─── Simple alias ─────────────────────────────────────────────────────────────

export function buildSimpleA2AResponse(
  output: Record<string, unknown>,
  state: A2ATaskStateAlias = "completed"
): A2AResponse {
  return buildA2AResponse(
    crypto.randomUUID(),
    crypto.randomUUID(),
    state,
    String(output?.clinical_summary ?? JSON.stringify(output)),
    output
  );
}
