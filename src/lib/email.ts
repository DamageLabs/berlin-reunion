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

export async function sendVerificationCodeEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const formatted = `${code.slice(0, 4)} ${code.slice(4)}`;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your verification code — Berlin Reunion",
    html: `
      <h2>Your verification code</h2>
      <p>Enter this code to verify your email address:</p>
      <p style="font-family:monospace;font-size:32px;letter-spacing:4px;font-weight:bold;text-align:center;padding:16px 0">${formatted}</p>
      <p>This code expires in 15 minutes.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
  });
}

export async function sendEmailChangeVerificationEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const formatted = `${code.slice(0, 4)} ${code.slice(4)}`;
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirm your new email — Berlin Reunion",
    html: `
      <h2>Confirm your email change</h2>
      <p>Enter this code to confirm your new email address:</p>
      <p style="font-family:monospace;font-size:32px;letter-spacing:4px;font-weight:bold;text-align:center;padding:16px 0">${formatted}</p>
      <p>This code expires in 15 minutes.</p>
      <p>If you didn't request an email change, you can ignore this email.</p>
    `,
  });
}

export async function sendResetPasswordEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your password — Berlin Reunion",
    html: `
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${url}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request a password reset, you can ignore this email.</p>
    `,
  });
}

export async function sendAdminPasswordResetEmail({
  email,
  tempPassword,
}: {
  email: string;
  tempPassword: string;
}) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your password has been reset — Berlin Reunion",
    html: `
      <h2>Your password has been reset</h2>
      <p>An administrator has reset your password. Your temporary password is:</p>
      <p style="font-family:monospace;font-size:24px;font-weight:bold;text-align:center;padding:16px 0">${tempPassword}</p>
      <p>Please log in and change your password immediately. You will be required to set a new password on your next login.</p>
      <p>If you did not expect this, please contact an administrator.</p>
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
    subject: "You're invited to the Berlin Reunion Tour - 2029!",
    html: `
      <h2>You're Invited!</h2>
      <p>${inviterName} has invited you to join the <strong>Berlin Reunion Tour of 2029</strong> as a <strong>${role}</strong>.</p>
      <p><a href="${registerUrl}">Accept Invitation</a></p>
      <p>This link expires in 7 days. If you weren't expecting this invitation, you can safely ignore this email.</p>
    `,
  });
}
