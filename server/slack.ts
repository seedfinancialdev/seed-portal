import { type ChatPostMessageArguments, WebClient } from "@slack/web-api"

// Use
if (!process.env.SLACK_BOT_TOKEN) {
  console.warn("SLACK_BOT_TOKEN environment variable not set - Slack notifications disabled");
}

if (!process.env.SLACK_CHANNEL_ID) {
  console.warn("SLACK_CHANNEL_ID environment variable not set - Slack notifications disabled");
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Sends a structured message to a Slack channel using the Slack Web API
 * Prefer using Channel ID to Channel names because they don't change when the
 * channel is renamed.
 * @param message - Structured message to send
 * @returns Promise resolving to the sent message's timestamp
 */
async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | undefined> {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.log("Slack not configured - would have sent:", message);
    return undefined;
  }

  try {
    // Send the message
    const response = await slack.chat.postMessage(message);

    // Return the timestamp of the sent message
    return response.ts;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}

/**
 * Sends a notification about a cleanup override request
 */
async function sendCleanupOverrideNotification(quoteData: {
  contactEmail: string;
  revenueBand: string;
  monthlyTransactions: string;
  industry: string;
  cleanupMonths: number;
  overrideReason: string;
  monthlyFee: number;
  setupFee: number;
}) {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.log("Slack not configured - cleanup override notification skipped");
    return;
  }

  const channel = process.env.SLACK_CHANNEL_ID;

  await sendSlackMessage({
    channel,
    text: "An active quote needs a cleanup override approval!",
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Cleanup Override Request'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*An active quote needs a cleanup override approval!*'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Contact:* ${quoteData.contactEmail}`
          },
          {
            type: 'mrkdwn',
            text: `*Revenue Band:* ${quoteData.revenueBand}`
          },
          {
            type: 'mrkdwn',
            text: `*Monthly Transactions:* ${quoteData.monthlyTransactions}`
          },
          {
            type: 'mrkdwn',
            text: `*Industry:* ${quoteData.industry}`
          },
          {
            type: 'mrkdwn',
            text: `*Original Cleanup Months:* ${quoteData.cleanupMonths}`
          },
          {
            type: 'mrkdwn',
            text: `*Override Reason:* ${quoteData.overrideReason}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Monthly Fee:* $${quoteData.monthlyFee}`
          },
          {
            type: 'mrkdwn',
            text: `*Setup Fee:* $${quoteData.setupFee}`
          }
        ]
      }
    ]
  });
}

export { sendSlackMessage, sendCleanupOverrideNotification };