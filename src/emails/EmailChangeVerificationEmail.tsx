import { Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

interface EmailChangeVerificationEmailProps {
  code: string;
}

EmailChangeVerificationEmail.PreviewProps = {
  code: "WXYZ5678",
} satisfies EmailChangeVerificationEmailProps;

export default function EmailChangeVerificationEmail({
  code,
}: EmailChangeVerificationEmailProps) {
  const formatted = `${code.slice(0, 4)} ${code.slice(4)}`;

  return (
    <Layout preview={`Confirm your email change: ${formatted}`}>
      <Text style={heading}>Confirm your email change</Text>
      <Text style={paragraph}>
        Enter this code to confirm your new email address:
      </Text>
      <Text style={codeDisplay}>{formatted}</Text>
      <Text style={paragraph}>This code expires in 15 minutes.</Text>
      <Text style={muted}>
        If you didn&apos;t request an email change, you can ignore this email.
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

const codeDisplay: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "32px",
  letterSpacing: "4px",
  fontWeight: "bold",
  textAlign: "center" as const,
  padding: "16px 0",
  color: "#C5A04E",
  margin: "0 0 16px",
};
