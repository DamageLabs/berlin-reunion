import { describe, it, expect } from "vitest";
import { PRINTABLE_RE } from "../password-rules";

describe("PRINTABLE_RE", () => {
  it("accepts lowercase letters", () => {
    expect(PRINTABLE_RE.test("abcxyz")).toBe(true);
  });

  it("accepts uppercase letters", () => {
    expect(PRINTABLE_RE.test("ABCXYZ")).toBe(true);
  });

  it("accepts digits", () => {
    expect(PRINTABLE_RE.test("0123456789")).toBe(true);
  });

  it("accepts common special characters", () => {
    expect(PRINTABLE_RE.test("!@#$%^&*")).toBe(true);
  });

  it("accepts spaces", () => {
    expect(PRINTABLE_RE.test("hello world")).toBe(true);
  });

  it("accepts a mix of printable characters", () => {
    expect(PRINTABLE_RE.test("P@ssw0rd! 123")).toBe(true);
  });

  it("accepts brackets and braces", () => {
    expect(PRINTABLE_RE.test("[]{}()")).toBe(true);
  });

  it("accepts punctuation", () => {
    expect(PRINTABLE_RE.test(";':\",./<>?`~\\|")).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(PRINTABLE_RE.test("")).toBe(false);
  });

  it("rejects newline characters", () => {
    expect(PRINTABLE_RE.test("hello\nworld")).toBe(false);
  });

  it("rejects tab characters", () => {
    expect(PRINTABLE_RE.test("hello\tworld")).toBe(false);
  });

  it("rejects null byte", () => {
    expect(PRINTABLE_RE.test("hello\x00world")).toBe(false);
  });

  it("rejects non-ASCII unicode", () => {
    expect(PRINTABLE_RE.test("héllo")).toBe(false);
  });

  it("rejects emoji", () => {
    expect(PRINTABLE_RE.test("pass🔑word")).toBe(false);
  });

  it("rejects carriage return", () => {
    expect(PRINTABLE_RE.test("hello\rworld")).toBe(false);
  });
});
