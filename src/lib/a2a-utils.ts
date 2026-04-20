// ─── Strict A2A Schema Utilities for Prompt Opinion Orchestrator ──────────────
//
// CRITICAL: The remote parser deserializes task.status into A2A.TaskStatus.
// It ONLY accepts { "state": "PENDING"|"RUNNING"|"COMPLETED"|"FAILED" }.
// Any extra keys (timestamp, message, etc.) inside `status` WILL cause:
//   "The JSON value could not be converted to A2A.TaskState"
//
// Rule: keep status as { state } — nothing else inside it.

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type A2ATaskState = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface A2AStatus {
  state: A2ATaskState;
}

export interface A2ATask {
  id: string;
  sessionId?: string;
  status: A2AStatus;           // ← ONLY state; no timestamp, no message
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

// ─── State validator ──────────────────────────────────────────────────────────

const VALID_STATES: ReadonlySet<A2ATaskState> = new Set([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

/**
 * Normalizes and strictly validates an A2A task state.
 * Rejects any value not in the enum — never passes through
 * loose values like "done", "success", "ok", etc.
 */
export function validateA2AState(state: string): A2ATaskState {
  const upper = (state ?? "").toString().toUpperCase() as A2ATaskState;
  if (VALID_STATES.has(upper)) return upper;
  console.warn(`[A2A] ⚠ Invalid state "${state}" — defaulting to FAILED`);
  return "FAILED";
}

// ─── Response builder ─────────────────────────────────────────────────────────

/**
 * Builds a strictly-compliant A2A / JSON-RPC 2.0 response.
 *
 * Output shape (exactly what Prompt Opinion expects):
 * {
 *   "jsonrpc": "2.0",
 *   "id": <requestId>,
 *   "result": {
 *     "task": {
 *       "id": "<taskId>",
 *       "status": { "state": "COMPLETED" },   ← ONLY state — nothing else
 *       "artifacts": [ ... ]
 *     }
 *   }
 * }
 *
 * @param requestId  - JSON-RPC request id (pass through from the caller)
 * @param taskId     - stable task identifier (use crypto.randomUUID() if none)
 * @param state      - one of PENDING | RUNNING | COMPLETED | FAILED
 * @param summary    - human-readable clinical summary (goes into artifact text)
 * @param metadata   - structured payload (goes into a separate artifact)
 * @param sessionId  - optional A2A session id
 */
export function buildA2AResponse(
  requestId: string | number,
  taskId: string,
  state: A2ATaskState | string,
  summary: string,
  metadata: Record<string, unknown> = {},
  sessionId?: string
): A2AResponse {
  const normalizedState = validateA2AState(state);

  const task: A2ATask = {
    id: taskId,
    ...(sessionId ? { sessionId } : {}),
    // ↓ STRICT: only "state" — the remote parser cannot handle extra fields
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

  // DEBUG: log every outbound response for traceability
  console.log("[A2A] ✅ Outbound response:\n" + JSON.stringify(response, null, 2));

  return response;
}

// ─── Error response builder ───────────────────────────────────────────────────

/**
 * Builds a strictly-compliant JSON-RPC 2.0 error response.
 */
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

  console.log("[A2A] ❌ Error response:\n" + JSON.stringify(response, null, 2));

  return response;
}

// ─── Convenience alias (matches the simpler signature used in the spec) ────────

/**
 * Minimal builder — generates a fresh task ID automatically.
 * Useful for callers that don't need to track a specific taskId.
 */
export function buildSimpleA2AResponse(
  output: Record<string, unknown>,
  state: A2ATaskState = "COMPLETED"
): A2AResponse {
  return buildA2AResponse(
    crypto.randomUUID(),
    crypto.randomUUID(),
    state,
    String(output?.clinical_summary ?? JSON.stringify(output)),
    output
  );
}
