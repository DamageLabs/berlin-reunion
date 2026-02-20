import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Preview,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function Layout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>Berlin Reunion</Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Berlin Reunion Tour of 2029. This is an automated message — please
              do not reply directly to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#1A1A1A",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "0",
  padding: "40px 0",
};

const container: React.CSSProperties = {
  maxWidth: "520px",
  margin: "0 auto",
  backgroundColor: "#2A2A2A",
  borderRadius: "8px",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  backgroundColor: "#1A1A1A",
  padding: "24px 32px",
  borderBottom: "2px solid #C5A04E",
};

const headerText: React.CSSProperties = {
  color: "#C5A04E",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
  textAlign: "center" as const,
};

const content: React.CSSProperties = {
  padding: "32px",
};

const hr: React.CSSProperties = {
  borderColor: "#3A3A3A",
  margin: "0",
};

const footer: React.CSSProperties = {
  padding: "20px 32px",
};

const footerText: React.CSSProperties = {
  color: "#888888",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
  textAlign: "center" as const,
};
