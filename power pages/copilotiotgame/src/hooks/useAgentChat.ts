import { useCallback, useRef, useState } from "react";
import { API_BASE_URL } from "../lib/apiConfig";

// Direct Line REST, not the Web Chat embed: one prompt in, the agent's reply out. Ported
// from the sibling copilot-iot-service dashboard's useAgentChat, with the token endpoint
// pointed at this app's /api/directline-token (the secret stays server-side).
const DIRECTLINE_BASE = "https://directline.botframework.com/v3/directline";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // ~60 s
const DIRECTLINE_USER_ID = "dl_kiosk_user";
const ACCESS_DENIED_MESSAGE = "You don't have access to talk to this bot";

interface DLActivity {
  type: string;
  from: { id: string };
  text?: string;
}

interface DLActivities {
  activities: DLActivity[];
  watermark?: string;
}

export type AgentChatStatus = "idle" | "loading" | "done" | "error";

/** Thrown when the server has no Direct Line secret yet, so callers can fall back quietly. */
export class AgentUnavailableError extends Error {}

export interface AgentChat {
  status: AgentChatStatus;
  response: string | null;
  /** True when the agent isn't configured/reachable (as opposed to a mid-conversation failure). */
  unavailable: boolean;
  sendPrompt: (prompt: string) => Promise<void>;
  reset: () => void;
}

export function useAgentChat(): AgentChat {
  const [status, setStatus] = useState<AgentChatStatus>("idle");
  const [response, setResponse] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  // Bumped by reset() so a still-running request from before it can tell it was cancelled.
  const runRef = useRef(0);

  const reset = useCallback(() => {
    runRef.current += 1;
    setStatus("idle");
    setResponse(null);
    setUnavailable(false);
  }, []);

  const sendPrompt = useCallback(async (prompt: string) => {
    const run = ++runRef.current;
    const cancelled = () => run !== runRef.current;
    setStatus("loading");
    setResponse(null);
    setUnavailable(false);

    try {
      const tokenRes = await fetch(`${API_BASE_URL}/api/directline-token`);
      if (tokenRes.status === 503) throw new AgentUnavailableError("Direct Line is not configured");
      if (!tokenRes.ok) throw new AgentUnavailableError(`Token request failed (${tokenRes.status})`);
      const { token } = (await tokenRes.json()) as { token: string };
      if (cancelled()) return;

      const convRes = await fetch(`${DIRECTLINE_BASE}/conversations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!convRes.ok) throw new Error(`Start conversation failed (${convRes.status})`);
      const { conversationId, token: convToken } = (await convRes.json()) as {
        conversationId: string;
        token: string;
      };
      const headers = { Authorization: `Bearer ${convToken}` };
      const activitiesUrl = `${DIRECTLINE_BASE}/conversations/${conversationId}/activities`;
      if (cancelled()) return;

      // Skip any greeting the agent fires when the conversation opens.
      const initial = (await (await fetch(activitiesUrl, { headers })).json()) as DLActivities;
      let watermark = initial.watermark ?? "0";
      if (cancelled()) return;

      const sendRes = await fetch(activitiesUrl, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "message", from: { id: DIRECTLINE_USER_ID }, text: prompt }),
      });
      if (!sendRes.ok) throw new Error(`Send message failed (${sendRes.status})`);

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled()) return;

        const pollRes = await fetch(`${activitiesUrl}?watermark=${watermark}`, { headers });
        if (!pollRes.ok) throw new Error(`Poll failed (${pollRes.status})`);
        const data = (await pollRes.json()) as DLActivities;
        watermark = data.watermark ?? watermark;

        const replies = data.activities.filter(
          (a) => a.type === "message" && a.from.id !== DIRECTLINE_USER_ID && a.text?.trim()
        );
        if (replies.length > 0) {
          const reply = replies[replies.length - 1].text!.trim();
          if (reply.includes(ACCESS_DENIED_MESSAGE)) {
            throw new AgentUnavailableError("Direct Line user does not have access to this bot");
          }
          setResponse(reply);
          setStatus("done");
          return;
        }
      }
      throw new Error("The agent did not respond in time");
    } catch (error) {
      if (cancelled()) return;
      console.error("Agent request failed", error);
      setUnavailable(error instanceof AgentUnavailableError);
      setStatus("error");
    }
  }, []);

  return { status, response, unavailable, sendPrompt, reset };
}
