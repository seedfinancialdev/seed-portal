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
  requestedCleanupMonths?: number;
  originalCleanupMonths?: number;
  overrideReason: string;
  customOverrideReason?: string;
  customSetupFee?: string;
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
            text: `*Approval Code: ${quoteData.approvalCode}*`
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
              text: `*Industry:* ${quoteData.industry}`
            },
            {
              type: 'mrkdwn',
              text: `*Cleanup Months:* ${quoteData.originalCleanupMonths || quoteData.cleanupMonths} → ${quoteData.requestedCleanupMonths || quoteData.cleanupMonths}`
            },
            {
              type: 'mrkdwn',
              text: `*Override Reason:* ${quoteData.overrideReason}`
            }
          ]
        },
        // Add custom override reason and setup fee if provided
        ...(quoteData.overrideReason === "Other" ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:* ${quoteData.customOverrideReason || 'No details provided'}${quoteData.customSetupFee ? `\n*Custom Setup Fee:* $${parseInt(quoteData.customSetupFee).toLocaleString()}` : ''}`
          }
        } as any] : [])
      ]
    });
  } catch (error) {
    // If channel format with # fails, try with the original channel ID
    if (channel.startsWith('#')) {
      const originalChannel = process.env.SLACK_CHANNEL_ID;
      await sendSlackMessage({
        channel: originalChannel,
        text: `🚨 *Cleanup Override Request*\n\n*Approval Code: ${quoteData.approvalCode}*\n\n*Contact:* ${quoteData.contactEmail}\n*Industry:* ${quoteData.industry}\n*Cleanup Months:* ${quoteData.originalCleanupMonths || quoteData.cleanupMonths} → ${quoteData.requestedCleanupMonths || quoteData.cleanupMonths}\n*Override Reason:* ${quoteData.overrideReason}${quoteData.overrideReason === "Other" && quoteData.customOverrideReason ? `\n*Details:* ${quoteData.customOverrideReason}` : ""}${quoteData.overrideReason === "Other" && quoteData.customSetupFee ? `\n*Custom Setup Fee:* $${parseInt(quoteData.customSetupFee).toLocaleString()}` : ""}`
      });
    } else {
      throw error;
    }
  }
}

export { sendSlackMessage, sendCleanupOverrideNotification };