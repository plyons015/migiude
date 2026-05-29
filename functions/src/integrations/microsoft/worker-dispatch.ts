import * as logger from "firebase-functions/logger";
import {
  requireTeamsBotWorkerBaseUrl,
  teamsBotWorkerConfigured,
} from "./config";
import { markJobDispatched } from "./store";

/**
 * Notify the Azure Teams bot worker to process a queued job.
 * Worker repo: services/teams-bot-worker (see docs/TEAMS_CALLING_BOT.md).
 */
export async function dispatchTeamsBotJob(jobId: string): Promise<boolean> {
  if (!teamsBotWorkerConfigured()) {
    logger.info("teamsBot.worker_not_configured", { jobId });
    return false;
  }

  const base = requireTeamsBotWorkerBaseUrl().replace(/\/$/, "");
  const url = `${base}/jobs/${encodeURIComponent(jobId)}/dispatch`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "migiude-functions" }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn("teamsBot.dispatch_failed", {
        jobId,
        status: res.status,
        text: text.slice(0, 200),
      });
      return false;
    }
    await markJobDispatched(jobId);
    return true;
  } catch (err) {
    logger.warn("teamsBot.dispatch_error", {
      jobId,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
