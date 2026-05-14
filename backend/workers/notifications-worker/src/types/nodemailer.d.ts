declare module 'nodemailer' {
  type TransportOptions = {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  };

  type MailOptions = {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };

  type Transporter = {
    sendMail(options: MailOptions): Promise<unknown>;
  };

  export function createTransport(options: TransportOptions): Transporter;
  const nodemailer: { createTransport: typeof createTransport };
  export default nodemailer;
}
