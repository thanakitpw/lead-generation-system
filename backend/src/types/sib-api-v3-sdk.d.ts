declare module 'sib-api-v3-sdk' {
  export class ApiClient {
    static instance: ApiClient
    authentications: {
      'api-key': { apiKey: string }
    }
  }

  export class TransactionalEmailsApi {
    sendTransacEmail(emailData: SendSmtpEmail): Promise<{ messageId?: string }>
  }

  export class SendSmtpEmail {
    sender?: { name?: string; email?: string }
    to?: Array<{ email?: string; name?: string }>
    replyTo?: { email?: string; name?: string }
    subject?: string
    htmlContent?: string
    textContent?: string
    headers?: Record<string, string>
  }
}
