/**
 * User-facing Teams bot + Microsoft OAuth.
 * Keep false until Entra app, secrets, and Azure worker are live.
 * Set NEXT_PUBLIC_TEAMS_BOT_INTEGRATION_ENABLED=true to turn on.
 */
export const TEAMS_BOT_INTEGRATION_LAUNCHED =
  process.env.NEXT_PUBLIC_TEAMS_BOT_INTEGRATION_ENABLED === "true";
