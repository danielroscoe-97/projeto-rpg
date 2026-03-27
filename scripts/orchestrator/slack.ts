/**
 * BMAD Orchestrator — Slack Integration
 *
 * Handles sending notifications, receiving commands,
 * and audio transcription via Groq Whisper.
 */

import { config } from "./config.js";

// -- Notification Types --

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: Array<{ type: string; text?: { type: string; text: string }; url?: string }>;
}

// -- Markdown → Slack mrkdwn --

function toSlack(md: string): string {
  // Extract and protect code blocks first
  const codeBlocks: string[] = [];
  let result = md.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `__CODEBLOCK_${codeBlocks.length - 1}__`;
  });

  // Apply markdown → mrkdwn conversions
  result = result
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/^### (.+)$/gm, "*$1*")
    .replace(/^## (.+)$/gm, "*$1*")
    .replace(/^# (.+)$/gm, "*$1*")
    .replace(/\[(.+?)\]\((.+?)\)/g, "<$2|$1>")
    .replace(/^- /gm, "• ");

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    result = result.replace(`__CODEBLOCK_${i}__`, codeBlocks[i]);
  }

  return result;
}

/**
 * Truncate message to Slack's limit with indicator.
 */
function truncateForSlack(text: string, maxLen: number = 3900): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "\n\n_...(mensagem truncada)_";
}

// -- Send Notifications --

export async function notify(message: string): Promise<void> {
  const formatted = truncateForSlack(toSlack(message));

  if (!config.slack.enabled) {
    console.log(`[SLACK] ${formatted}`);
    return;
  }

  await sendWebhook({ text: formatted });
}

export async function notifyPRReady(pr: {
  number: number;
  title: string;
  url: string;
  story: string;
  summary: string;
}): Promise<void> {
  const message: SlackMessage = {
    text: `PR #${pr.number} pronta pra review`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🔀 PR #${pr.number}: ${pr.title}` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Story:* ${pr.story}\n*Resumo:* ${truncateForSlack(pr.summary, 500)}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Ver PR no GitHub" },
            url: pr.url,
          },
        ],
      },
    ],
  };

  if (!config.slack.enabled) {
    console.log(`[SLACK] PR #${pr.number}: ${pr.title} — ${pr.url}`);
    return;
  }

  await sendWebhook(message);
}

export async function notifyEscalation(context: {
  type: string;
  description: string;
  options?: string[];
}): Promise<void> {
  const optionsText = context.options
    ? `\n*Opções:*\n${context.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`
    : "";

  const message: SlackMessage = {
    text: `⚠️ Decisão necessária: ${context.description}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "⚠️ Escalação — Decisão Necessária" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Tipo:* ${context.type}\n*Descrição:* ${context.description}${optionsText}`,
        },
      },
    ],
  };

  if (!config.slack.enabled) {
    console.log(`[SLACK ESCALATION] ${context.type}: ${context.description}`);
    return;
  }

  await sendWebhook(message);
}

export async function notifyStatus(status: {
  mode: string;
  currentTask: string;
  progress: string;
  errors?: string[];
}): Promise<void> {
  const errorsText = status.errors?.length
    ? `\n*Erros:*\n${status.errors.map((e) => `• ${e}`).join("\n")}`
    : "";

  await notify(
    `📊 *Status*\n*Modo:* ${status.mode}\n*Task:* ${status.currentTask}\n*Progresso:* ${status.progress}${errorsText}`
  );
}

export async function notifyComplete(summary: {
  task: string;
  duration: string;
  filesChanged: number;
  testsStatus: string;
}): Promise<void> {
  await notify(
    `✅ *Concluído:* ${summary.task}\n*Duração:* ${summary.duration}\n*Arquivos:* ${summary.filesChanged}\n*Testes:* ${summary.testsStatus}`
  );
}

export async function notifyError(error: {
  task: string;
  message: string;
  recoverable: boolean;
}): Promise<void> {
  const emoji = error.recoverable ? "⚠️" : "🔴";
  await notify(
    `${emoji} *Erro em:* ${error.task}\n*Mensagem:* ${error.message}\n*Recuperável:* ${error.recoverable ? "Sim — tentando resolver" : "Não — aguardando decisão"}`
  );
}

// -- Audio Transcription (Groq Whisper) --

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  if (!config.groq.apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: "audio/ogg" }),
    "audio.ogg"
  );
  formData.append("model", config.groq.model);
  formData.append("language", config.groq.language);

  const response = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Groq transcription failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}

// -- Internal --

async function sendWebhook(message: SlackMessage): Promise<void> {
  if (config.slack.webhookUrl) {
    try {
      const response = await fetch(config.slack.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        console.error(`Slack webhook failed: ${response.statusText}`);
      }
    } catch (e) {
      console.error("Slack webhook error:", e);
    }
  } else if (config.slack.botToken && config.slack.channelId) {
    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.slack.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: config.slack.channelId,
          text: message.text,
          blocks: message.blocks,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        console.error(`Slack API failed: ${data.error}`);
      }
    } catch (e) {
      console.error("Slack API error:", e);
    }
  }
}
