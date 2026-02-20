import { Resend } from "resend";
import { render } from "@react-email/components";
import VerificationEmail from "@/emails/VerificationEmail";
import VerificationCodeEmail from "@/emails/VerificationCodeEmail";
import EmailChangeVerificationEmail from "@/emails/EmailChangeVerificationEmail";
import ResetPasswordEmail from "@/emails/ResetPasswordEmail";
import AdminPasswordResetEmail from "@/emails/AdminPasswordResetEmail";
import InviteEmail from "@/emails/InviteEmail";

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
  const html = await render(VerificationEmail({ url }));
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your email — Berlin Reunion",
    html,
  });
}

export async function sendVerificationCodeEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const html = await render(VerificationCodeEmail({ code }));
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your verification code — Berlin Reunion",
    html,
  });
}

export async function sendEmailChangeVerificationEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const html = await render(EmailChangeVerificationEmail({ code }));
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirm your new email — Berlin Reunion",
    html,
  });
}

export async function sendResetPasswordEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  const html = await render(ResetPasswordEmail({ url }));
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your password — Berlin Reunion",
    html,
  });
}

export async function sendAdminPasswordResetEmail({
  email,
  tempPassword,
}: {
  email: string;
  tempPassword: string;
}) {
  const html = await render(AdminPasswordResetEmail({ tempPassword }));
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your password has been reset — Berlin Reunion",
    html,
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

  const html = await render(InviteEmail({ inviterName, registerUrl, role }));
  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: "You're invited to the Berlin Reunion Tour - 2029!",
    html,
  });
}
