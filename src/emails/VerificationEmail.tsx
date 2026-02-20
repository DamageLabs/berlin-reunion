import { Text, Link, Section } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

interface VerificationEmailProps {
  url: string;
}

VerificationEmail.PreviewProps = {
  url: "https://berlin-reunion.example.com/api/auth/verify-email?token=abc123",
} satisfies VerificationEmailProps;

export default function VerificationEmail({ url }: VerificationEmailProps) {
  return (
    <Layout preview="Verify your email address for Berlin Reunion">
      <Text style={heading}>Welcome to Berlin Reunion!</Text>
      <Text style={paragraph}>
        Click the link below to verify your email address:
      </Text>
      <Section style={buttonContainer}>
        <Link href={url} style={button}>
          Verify Email
        </Link>
      </Section>
      <Text style={paragraph}>This link expires in 1 hour.</Text>
      <Text style={muted}>
        If you didn&apos;t create an account, you can ignore this email.
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
