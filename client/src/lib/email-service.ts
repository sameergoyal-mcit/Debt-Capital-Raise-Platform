
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<boolean>;
}

// Mock Provider (Default)
class MockEmailProvider implements EmailProvider {
  async sendEmail(payload: EmailPayload): Promise<boolean> {
    console.group("📧 [Mock Email Service] Sending Email");
    console.log("To:", payload.to);
    console.log("Subject:", payload.subject);
    console.log("Body Preview:", payload.html.substring(0, 100) + "...");
    console.log("Full Payload:", payload);
    console.groupEnd();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return true;
  }
}

// SendGrid Provider (Stub)
class SendGridProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(payload: EmailPayload): Promise<boolean> {
    console.log("🔌 [SendGrid Provider] Connecting to SendGrid API...");
    // In a real backend, this would use fetch() to SendGrid's API
    // const response = await fetch('https://api.sendgrid.com/v3/mail/send', { ... })
    
    console.warn("⚠️ SendGrid sending is not implemented in client-side mock mode. Falling back to console log.");
    console.log("Payload:", payload);
    return true;
  }
}

// Factory / Service
const SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY;

export const emailService = {
  provider: SENDGRID_API_KEY ? new SendGridProvider(SENDGRID_API_KEY) : new MockEmailProvider(),

  async send(payload: EmailPayload) {
    return this.provider.sendEmail(payload);
  }
};
