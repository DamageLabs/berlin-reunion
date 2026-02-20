import { Text, Link, Section } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

interface InviteEmailProps {
  inviterName: string;
  registerUrl: string;
  role: string;
}

InviteEmail.PreviewProps = {
  inviterName: "Alice",
  registerUrl: "https://berlin-reunion.example.com/register?invite=inv-token-123",
  role: "moderator",
} satisfies InviteEmailProps;

export default function InviteEmail({
  inviterName,
  registerUrl,
  role,
}: InviteEmailProps) {
  return (
    <Layout
      preview={`${inviterName} has invited you to join the Berlin Reunion Tour`}
    >
      <Text style={heading}>You&apos;re Invited!</Text>
      <Text style={paragraph}>
        {inviterName} has invited you to join the{" "}
        <strong>Berlin Reunion Tour of 2029</strong> as a{" "}
        <strong>{role}</strong>.
      </Text>
      <Section style={buttonContainer}>
        <Link href={registerUrl} style={button}>
          Accept Invitation
        </Link>
      </Section>
      <Text style={muted}>
        This link expires in 7 days. If you weren&apos;t expecting this
        invitation, you can safely ignore this email.
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
