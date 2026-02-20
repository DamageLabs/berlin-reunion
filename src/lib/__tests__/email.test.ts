import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue({ id: "email-id" });

describe("email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "test@example.com";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  async function loadModule() {
    mockSend.mockResolvedValue({ id: "email-id" });
    vi.doMock("resend", () => {
      return {
        Resend: class MockResend {
          emails = { send: mockSend };
        },
      };
    });
    return import("../email");
  }

  describe("sendVerificationEmail", () => {
    it("sends with correct from, to, subject, and html", async () => {
      const { sendVerificationEmail } = await loadModule();
      await sendVerificationEmail({
        email: "user@example.com",
        url: "http://localhost:3000/verify?token=abc",
      });

      expect(mockSend).toHaveBeenCalledOnce();
      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("test@example.com");
      expect(call.to).toBe("user@example.com");
      expect(call.subject).toContain("Verify your email");
      expect(call.html).toContain("http://localhost:3000/verify?token=abc");
    });
  });

  describe("sendResetPasswordEmail", () => {
    it("sends with correct from, to, subject, and reset URL", async () => {
      const { sendResetPasswordEmail } = await loadModule();
      await sendResetPasswordEmail({
        email: "user@example.com",
        url: "http://localhost:3000/api/auth/reset-password/abc123?callbackURL=/reset-password",
      });

      expect(mockSend).toHaveBeenCalledOnce();
      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("test@example.com");
      expect(call.to).toBe("user@example.com");
      expect(call.subject).toContain("Reset your password");
      expect(call.html).toContain(
        "http://localhost:3000/api/auth/reset-password/abc123?callbackURL=/reset-password",
      );
    });
  });

  describe("sendInviteEmail", () => {
    it("sends with correct from, to, subject, and body content", async () => {
      const { sendInviteEmail } = await loadModule();
      await sendInviteEmail({
        to: "invitee@example.com",
        inviterName: "Alice",
        token: "inv-token-123",
        role: "moderator",
      });

      expect(mockSend).toHaveBeenCalledOnce();
      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("test@example.com");
      expect(call.to).toBe("invitee@example.com");
      expect(call.subject).toContain("invited");
      expect(call.html).toContain("register?invite=inv-token-123");
      expect(call.html).toContain("Alice");
      expect(call.html).toContain("moderator");
    });
  });

  describe("sendVerificationCodeEmail", () => {
    it("sends with correct from, to, subject, and formatted code", async () => {
      const { sendVerificationCodeEmail } = await loadModule();
      await sendVerificationCodeEmail({
        email: "user@example.com",
        code: "ABCD1234",
      });

      expect(mockSend).toHaveBeenCalledOnce();
      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("test@example.com");
      expect(call.to).toBe("user@example.com");
      expect(call.subject).toContain("verification code");
      expect(call.html).toContain("ABCD 1234");
    });
  });

  describe("sendEmailChangeVerificationEmail", () => {
    it("sends with correct subject and body for email change", async () => {
      const { sendEmailChangeVerificationEmail } = await loadModule();
      await sendEmailChangeVerificationEmail({
        email: "new@example.com",
        code: "WXYZ5678",
      });

      expect(mockSend).toHaveBeenCalledOnce();
      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("test@example.com");
      expect(call.to).toBe("new@example.com");
      expect(call.subject).toContain("Confirm your new email");
      expect(call.html).toContain("WXYZ 5678");
      expect(call.html).toContain("email change");
    });
  });

  describe("sendAdminPasswordResetEmail", () => {
    it("sends with correct subject and temp password in body", async () => {
      const { sendAdminPasswordResetEmail } = await loadModule();
      await sendAdminPasswordResetEmail({
        email: "user@example.com",
        tempPassword: "TempPass123!",
      });

      expect(mockSend).toHaveBeenCalledOnce();
      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe("test@example.com");
      expect(call.to).toBe("user@example.com");
      expect(call.subject).toContain("password has been reset");
      expect(call.html).toContain("TempPass123!");
      expect(call.html).toContain("administrator");
    });
  });

  describe("missing API key", () => {
    it("throws when RESEND_API_KEY is not set", async () => {
      delete process.env.RESEND_API_KEY;
      vi.doMock("resend", () => {
        return {
          Resend: class MockResend {
            emails = { send: mockSend };
          },
        };
      });
      const { sendVerificationEmail } = await import("../email");

      await expect(
        sendVerificationEmail({
          email: "user@example.com",
          url: "http://localhost:3000/verify",
        }),
      ).rejects.toThrow("RESEND_API_KEY");
    });
  });
});
