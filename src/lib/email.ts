import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

export async function sendVerificationEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your email — Berlin Reunion",
    html: `
      <h2>Welcome to Berlin Reunion!</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${url}">Verify Email</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
  });
}

export async function sendInviteEmail({
  to,
  inviterName,
  token,
  role,
}: {
  to: string;
  inviterName: string;
  token: string;
  role: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const registerUrl = `${baseUrl}/register?invite=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: "You're invited to Berlin Reunion!",
    html: `
      <h2>You've been invited!</h2>
      <p>${inviterName} has invited you to join Berlin Reunion as a <strong>${role}</strong>.</p>
      <p><a href="${registerUrl}">Accept Invitation</a></p>
      <p>This invitation expires in 7 days.</p>
      <p>If you weren't expecting this, you can ignore this email.</p>
    `,
  });
}
