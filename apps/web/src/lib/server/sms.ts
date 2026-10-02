/**
 * A hosted verification service that generates, delivers and checks the code
 * itself, such as Twilio Verify. `start` returns the service's reference for
 * the verification; the phone number is not needed again to check a code.
 */
export interface CodeVerifier {
  start(phone: string): Promise<string>;
  check(reference: string, code: string): Promise<boolean>;
}

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
