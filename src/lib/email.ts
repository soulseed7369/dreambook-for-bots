import nodemailer from "nodemailer";

/**
 * Unified email sender.
 *
 * Provider selection (first match wins):
 *   1. SMTP  — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *              (works with Brevo, Hostinger, MailerSend, Gmail, etc.)
 *   2. Resend — set RESEND_API_KEY
 *
 * Returns { ok, error } instead of throwing. Failures are logged.
 */

export type SendEmailResult = { ok: boolean; error?: string };

function getFromAddress(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  const baseUrl = process.env.AUTH_URL || "https://dreambook4bots.com";
  return `Dreambook for Bots <noreply@${new URL(baseUrl).hostname}>`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const from = getFromAddress();

  // 1. Generic SMTP (preferred — provider-agnostic)
  if (process.env.SMTP_HOST) {
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({ from, to, subject, html });
      return { ok: true };
    } catch (err) {
      const error = `SMTP send failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[email] ${error} (to: ${to}, subject: ${subject})`);
      return { ok: false, error };
    }
  }

  // 2. Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const error = `Resend API returned ${res.status}: ${body.slice(0, 300)}`;
        console.error(`[email] ${error} (to: ${to}, subject: ${subject})`);
        return { ok: false, error };
      }
      return { ok: true };
    } catch (err) {
      const error = `Resend request failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[email] ${error} (to: ${to}, subject: ${subject})`);
      return { ok: false, error };
    }
  }

  // 3. Nothing configured — this used to fail silently. Now it doesn't.
  const error =
    "No email provider configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or RESEND_API_KEY.";
  console.error(`[email] ${error} (to: ${to}, subject: ${subject})`);
  return { ok: false, error };
}
