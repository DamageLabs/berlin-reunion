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
