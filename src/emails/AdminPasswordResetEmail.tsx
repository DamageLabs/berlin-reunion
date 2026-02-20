import { Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

interface AdminPasswordResetEmailProps {
  tempPassword: string;
}

AdminPasswordResetEmail.PreviewProps = {
  tempPassword: "TempPass123!",
} satisfies AdminPasswordResetEmailProps;

export default function AdminPasswordResetEmail({
  tempPassword,
}: AdminPasswordResetEmailProps) {
  return (
    <Layout preview="Your password has been reset by an administrator">
      <Text style={heading}>Your password has been reset</Text>
      <Text style={paragraph}>
        An administrator has reset your password. Your temporary password is:
      </Text>
      <Text style={passwordDisplay}>{tempPassword}</Text>
      <Text style={paragraph}>
        Please log in and change your password immediately. You will be required
        to set a new password on your next login.
      </Text>
      <Text style={muted}>
        If you did not expect this, please contact an administrator.
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

const passwordDisplay: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  padding: "16px 0",
  color: "#C5A04E",
  margin: "0 0 16px",
};
