import { Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

interface AccountDeletedEmailProps {
  name: string;
}

AccountDeletedEmail.PreviewProps = {
  name: "John",
} satisfies AccountDeletedEmailProps;

export default function AccountDeletedEmail({
  name,
}: AccountDeletedEmailProps) {
  return (
    <Layout preview="Your Berlin Reunion account has been deleted">
      <Text style={heading}>Your account has been deleted</Text>
      <Text style={paragraph}>
        Hi {name}, your Berlin Reunion account has been permanently deleted at
        your request. All of your personal data has been removed.
      </Text>
      <Text style={paragraph}>
        If you did not request this or believe this was a mistake, please contact
        an administrator as soon as possible.
      </Text>
      <Text style={muted}>
        This is a confirmation email. No further action is required.
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
