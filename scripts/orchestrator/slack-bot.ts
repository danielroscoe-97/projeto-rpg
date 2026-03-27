/**
 * BMAD Orchestrator — Slack Bot (Server Mode)
 *
 * Listens for messages in a Slack channel and forwards them
 * to the orchestrator. Handles text and audio messages.
 *
 * This is the entry point for Railway deployment.
 */

import { config } from "./config.js";
import { startWatcher, setCommandHandler } from "./watcher.js";
import { handleCommand } from "./orchestrator.js";
import { transcribeAudio, notify } from "./slack.js";
import { logger } from "./logger.js";

// -- Command Queue (serialized execution) --

let isProcessing = false;
const commandQueue: string[] = [];

async function enqueueCommand(input: string): Promise<void> {
  if (isProcessing) {
    logger.info(`Busy — queuing: ${input.slice(0, 50)}...`);
    commandQueue.push(input);
    return;
  }

  isProcessing = true;
  try {
    await handleCommand(input);
  } catch (error) {
    logger.error("Command failed", { error: String(error) });
  } finally {
    isProcessing = false;
    // Process next in queue with proper await
    const next = commandQueue.shift();
    if (next) {
      logger.info(`Processing next: ${next.slice(0, 50)}...`);
      await enqueueCommand(next);
    }
  }
}

// -- Slack Socket Mode --

interface SlackEvent {
  type: string;
  subtype?: string;
  text?: string;
  files?: Array<{
    mimetype: string;
    url_private_download: string;
  }>;
  channel?: string;
  user?: string;
  bot_id?: string;
}

let watcherStarted = false;

async function startSlackBot(): Promise<void> {
  const appToken = process.env.SLACK_APP_TOKEN;
  const botToken = config.slack.botToken;
  const channelId = config.slack.channelId;

  if (!appToken || !botToken || !channelId) {
    logger.error("Missing Slack tokens", {
      needs: "SLACK_APP_TOKEN, SLACK_BOT_TOKEN, SLACK_CHANNEL_ID",
    });
    process.exit(1);
  }

  logger.info("BMAD Slack Bot starting in Socket Mode", {
    channelId,
    groq: !!config.groq.apiKey,
  });

  const wsUrl = await getSocketModeUrl(appToken);
  connectWebSocket(wsUrl, appToken, botToken, channelId);
}

async function getSocketModeUrl(appToken: string): Promise<string> {
  const response = await fetch("https://slack.com/api/apps.connections.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const data = (await response.json()) as { ok: boolean; url: string; error?: string };
  if (!data.ok) {
    throw new Error(`Failed to connect to Slack Socket Mode: ${data.error}`);
  }

  return data.url;
}

function connectWebSocket(
  wsUrl: string,
  appToken: string,
  botToken: string,
  channelId: string
): void {
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    logger.info("Connected to Slack Socket Mode");

    // Start watcher only once (not on reconnect)
    // Wire up circular dependency handler
    if (!watcherStarted) {
      setCommandHandler(handleCommand);
      startWatcher(15 * 60 * 1000);
      watcherStarted = true;
    }

    notify("🤖 BMAD Orchestrator online! Mande comandos em linguagem natural ou áudio.");
  };

  ws.onmessage = async (event: MessageEvent) => {
    try {
      const data = JSON.parse(String(event.data)) as {
        type: string;
        envelope_id?: string;
        payload?: {
          event?: SlackEvent;
        };
      };

      // Acknowledge the event immediately
      if (data.envelope_id) {
        ws.send(JSON.stringify({ envelope_id: data.envelope_id }));
      }

      // Handle message events
      if (data.type === "events_api" && data.payload?.event) {
        const slackEvent = data.payload.event;

        // Only process user messages in our channel
        if (
          slackEvent.type === "message" &&
          !slackEvent.subtype &&
          slackEvent.channel === channelId &&
          !slackEvent.bot_id
        ) {
          // Handle audio files
          if (slackEvent.files?.some((f) => f.mimetype.startsWith("audio/"))) {
            const audioFile = slackEvent.files.find((f) =>
              f.mimetype.startsWith("audio/")
            );
            if (audioFile) {
              await handleAudioMessage(audioFile.url_private_download, botToken);
              return;
            }
          }

          // Handle text messages
          if (slackEvent.text) {
            logger.info(`Slack message: ${slackEvent.text.slice(0, 80)}`);
            await enqueueCommand(slackEvent.text);
          }
        }
      }
    } catch (error) {
      logger.error("Error processing Slack event", { error: String(error) });
    }
  };

  ws.onclose = () => {
    logger.warn("Slack connection closed. Reconnecting in 5s...");
    setTimeout(async () => {
      try {
        const newUrl = await getSocketModeUrl(appToken);
        connectWebSocket(newUrl, appToken, botToken, channelId);
      } catch (error) {
        logger.error("Reconnect failed", { error: String(error) });
        setTimeout(async () => {
          try {
            const retryUrl = await getSocketModeUrl(appToken);
            connectWebSocket(retryUrl, appToken, botToken, channelId);
          } catch {
            logger.error("Reconnect retry failed. Will try again in 30s...");
            setTimeout(() => startSlackBot().catch(console.error), 30_000);
          }
        }, 10_000);
      }
    }, 5000);
  };

  ws.onerror = (error: Event) => {
    logger.error("WebSocket error", { error: String(error) });
  };
}

async function handleAudioMessage(
  fileUrl: string,
  botToken: string
): Promise<void> {
  try {
    await notify("🎤 Recebido áudio. Transcrevendo...");

    const response = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${botToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const text = await transcribeAudio(audioBuffer);
    await notify(`🎤 Transcrição: "${text}"`);
    await enqueueCommand(text);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await notify(`❌ Erro ao transcrever áudio: ${err.message}`);
  }
}

// -- Keep Alive & Error Recovery --

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message, stack: error.stack });
  notify(`🔴 Erro não tratado: ${error.message}`).catch(() => {});
});

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  logger.error("Unhandled rejection", { error: msg });
  notify(`🔴 Promise rejeitada: ${msg}`).catch(() => {});
});

// Log uptime every hour
setInterval(() => {
  const uptime = Math.floor(process.uptime() / 3600);
  logger.info(`Uptime: ${uptime}h`);
}, 60 * 60 * 1000);

// -- Entry Point --

startSlackBot().catch((error) => {
  logger.error("Fatal error", { error: String(error) });
  logger.info("Retrying in 10s...");
  setTimeout(() => startSlackBot().catch(() => process.exit(1)), 10_000);
});
