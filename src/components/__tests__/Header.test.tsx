import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// --- Mocks ---

const mockUsePathname = vi.fn().mockReturnValue("/");
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockPush }),
}));

const mockUseSession = vi.fn();
const mockSignOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock next/link as a simple anchor
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import Header from "../Header";

// --- Tests ---

describe("Header", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/");
  });

  it("shows Sign In and Register when logged out", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false });
    render(<Header />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
  });

  it("shows loading indicator while session is pending", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true });
    render(<Header />);

    expect(screen.getByText("...")).toBeInTheDocument();
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
  });

  it("shows user name and Sign Out when logged in", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", role: "user" } },
      isPending: false,
    });
    render(<Header />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });

  it("shows Admin link for admin role", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "AdminUser", role: "admin" } },
      isPending: false,
    });
    render(<Header />);

    const adminLink = screen.getByRole("link", { name: "Admin" });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute("href", "/admin");
  });

  it("shows Admin link for moderator role", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Mod", role: "moderator" } },
      isPending: false,
    });
    render(<Header />);

    const adminLink = screen.getByRole("link", { name: "Admin" });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute("href", "/admin");
  });

  it("hides Admin link for regular users", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "User", role: "user" } },
      isPending: false,
    });
    render(<Header />);

    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });
});
