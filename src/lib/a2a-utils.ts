// Strict A2A Schema Utilities for Prompt Opinion Orchestrator

export type A2ATaskState = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface A2ATaskStatus {
  state: A2ATaskState;
  timestamp: string;
  message?: {
    role: string;
    parts: Array<{ type: string; text: string }>;
  };
}

export interface A2AArtifact {
  name: string;
  parts: Array<{ type: string; text: string }>;
}

export interface A2ATask {
  id: string;
  sessionId?: string;
  status: A2ATaskStatus;
  artifacts?: A2AArtifact[];
}

/**
 * Normalizes and validates A2A Task State
 */
export function validateA2AState(state: string): A2ATaskState {
  const upperState = state.toUpperCase();
  const validStates: A2ATaskState[] = ["PENDING", "RUNNING", "COMPLETED", "FAILED"];
  
  if (validStates.includes(upperState as A2ATaskState)) {
    return upperState as A2ATaskState;
  }
  
  console.warn(`[A2A] Invalid state detected: ${state}. Defaulting to FAILED.`);
  return "FAILED";
}

/**
 * Strict A2A Response Builder
 */
export function buildA2AResponse(
  requestId: string | number,
  taskId: string,
  state: A2ATaskState,
  summary: string,
  metadata: Record<string, any> = {},
  sessionId?: string
) {
  const normalizedState = validateA2AState(state);
  
  const task: A2ATask = {
    id: taskId,
    ...(sessionId ? { sessionId } : {}),
    status: {
      state: normalizedState,
      timestamp: new Date().toISOString(),
      message: {
        role: "agent",
        parts: [{ type: "text", text: summary }],
      },
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

  return {
    jsonrpc: "2.0",
    id: requestId,
    result: {
      task
    }
  };
}

/**
 * Standard A2A Error Response Builder
 */
export function buildA2AErrorResponse(
  requestId: string | number,
  code: number,
  message: string,
  data?: any
) {
  return {
    jsonrpc: "2.0",
    id: requestId,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  };
}
