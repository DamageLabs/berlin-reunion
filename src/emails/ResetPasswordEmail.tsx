import { Text, Link, Section } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

interface ResetPasswordEmailProps {
  url: string;
}

ResetPasswordEmail.PreviewProps = {
  url: "https://berlin-reunion.example.com/api/auth/reset-password/token123?callbackURL=/reset-password",
} satisfies ResetPasswordEmailProps;

export default function ResetPasswordEmail({ url }: ResetPasswordEmailProps) {
  return (
    <Layout preview="Reset your password for Berlin Reunion">
      <Text style={heading}>Reset your password</Text>
      <Text style={paragraph}>
        Click the link below to reset your password:
      </Text>
      <Section style={buttonContainer}>
        <Link href={url} style={button}>
          Reset Password
        </Link>
      </Section>
      <Text style={paragraph}>This link expires in 1 hour.</Text>
      <Text style={muted}>
        If you didn&apos;t request a password reset, you can ignore this email.
      </Text>
    </Layout>
  );
}

const heading: React.CSSProperties = {
  color: "#F5F0E8",
  fontSize: "22px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const paragraph: React.CSSProperties = {
  color: "#D4D4D4",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const muted: React.CSSProperties = {
  color: "#888888",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#C5A04E",
  color: "#1A1A1A",
  padding: "12px 32px",
  borderRadius: "6px",
  fontSize: "15px",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
};
