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
  customOverrideReason?: string;
  monthlyFee: number;
  setupFee: number;
  approvalCode: string;
}) {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
    console.log("Slack not configured - cleanup override notification skipped");
    return;
  }

  // Try both channel ID and channel name formats
  let channel = process.env.SLACK_CHANNEL_ID;
  if (!channel.startsWith('C') && !channel.startsWith('#')) {
    channel = `#${channel}`;
  }

  // Try sending the message, with fallback to simple channel ID if channel name fails
  try {
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
            text: `*Approval Code: ${quoteData.approvalCode}*\n\nAn active quote needs cleanup override approval!`
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
        // Add custom override reason as a separate section if provided
        ...(quoteData.overrideReason === "Other" && quoteData.customOverrideReason ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Custom Override Reason:*\n${quoteData.customOverrideReason}`
          }
        } as any] : []),
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
  } catch (error) {
    // If channel format with # fails, try with the original channel ID
    if (channel.startsWith('#')) {
      const originalChannel = process.env.SLACK_CHANNEL_ID;
      await sendSlackMessage({
        channel: originalChannel,
        text: `🚨 *Cleanup Override Request*\n\n*APPROVAL CODE: ${quoteData.approvalCode}*\n\n*Contact:* ${quoteData.contactEmail}\n*Revenue:* ${quoteData.revenueBand}\n*Transactions:* ${quoteData.monthlyTransactions}\n*Industry:* ${quoteData.industry}\n*Cleanup Months:* ${quoteData.cleanupMonths}\n*Override Reason:* ${quoteData.overrideReason}${quoteData.overrideReason === "Other" && quoteData.customOverrideReason ? `\n*Custom Reason:* ${quoteData.customOverrideReason}` : ""}\n*Monthly Fee:* $${quoteData.monthlyFee}\n*Setup Fee:* $${quoteData.setupFee}`
      });
    } else {
      throw error;
    }
  }
}

export { sendSlackMessage, sendCleanupOverrideNotification };