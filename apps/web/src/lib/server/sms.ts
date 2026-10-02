export interface SmsSender {
  send(phone: string, message: string): Promise<void>;
}

/**
 * Development stand-in: prints the message to the server log instead of sending
 * it. Only ever selected outside production (see context.ts).
 */
export const consoleSms: SmsSender = {
  async send(phone, message) {
    console.info(`[dev sms] to ${phone}: ${message}`);
  },
};
