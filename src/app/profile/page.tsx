"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [platoon, setPlatoon] = useState("");
  const [yearsServed, setYearsServed] = useState("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Email change state
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailChangeStep, setEmailChangeStep] = useState<"idle" | "pending">("idle");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Fetch profile data from DB so custom fields persist across reloads
  useEffect(() => {
    if (!session) return;
    fetch(`/api/users/${session.user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setName(data.name ?? "");
        setUsername(data.username ?? "");
        setLocation(data.location ?? "");
        setPlatoon(data.platoon ?? "");
        setYearsServed(data.yearsServed ?? "");
        setCurrentImage(data.image ?? null);
        setCurrentEmail(data.email ?? "");
        if (data.pendingEmail) {
          setNewEmail(data.pendingEmail);
          setEmailChangeStep("pending");
        }
      });
  }, [session]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleEmailCodeChange = useCallback((value: string) => {
    const raw = value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
    const stripped = raw.replace(/\s/g, "");
    if (stripped.length > 4) {
      setEmailCode(`${stripped.slice(0, 4)} ${stripped.slice(4, 8)}`);
    } else {
      setEmailCode(stripped);
    }
  }, []);

  if (isPending) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-cream/40">Loading...</p>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  async function handleInitiateEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");
    setEmailLoading(true);

    try {
      const res = await fetch(`/api/users/${session!.user.id}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      if (res.ok) {
        setEmailChangeStep("pending");
        setResendCooldown(60);
      } else {
        const body = await res.json();
        setEmailError(body.error ?? "Failed to send verification code");
      }
    } catch {
      setEmailError("Failed to send verification code");
    }
    setEmailLoading(false);
  }

  async function handleConfirmEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");
    setEmailLoading(true);

    try {
      const res = await fetch(`/api/users/${session!.user.id}/email/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: emailCode.replace(/\s/g, "") }),
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentEmail(data.email);
        setNewEmail("");
        setEmailCode("");
        setEmailChangeStep("idle");
        setEmailSuccess("Email updated successfully.");
      } else {
        setEmailError(
          data.remainingAttempts !== undefined
            ? `${data.error} (${data.remainingAttempts} attempt${data.remainingAttempts !== 1 ? "s" : ""} remaining)`
            : data.error,
        );
      }
    } catch {
      setEmailError("Failed to verify code");
    }
    setEmailLoading(false);
  }

  async function handleResendEmailCode() {
    if (resendCooldown > 0) return;
    setEmailError("");

    try {
      const res = await fetch(`/api/users/${session!.user.id}/email/resend`, {
        method: "POST",
      });

      if (res.ok) {
        setResendCooldown(60);
      } else {
        const body = await res.json();
        setEmailError(body.error ?? "Failed to resend code");
      }
    } catch {
      setEmailError("Failed to resend code");
    }
  }

  function handleCancelEmailChange() {
    setEmailChangeStep("idle");
    setEmailCode("");
    setNewEmail("");
    setEmailError("");
    setEmailSuccess("");
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const res = await fetch(`/api/users/${session!.user.id}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, location, platoon, yearsServed }),
    });

    if (res.ok) {
      setSuccess("Profile updated.");
    } else {
      const body = await res.json();
      setError(body.error ?? "Failed to update profile");
    }
    setSaving(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUploadPhoto() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setUploading(true);

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch(`/api/users/${session!.user.id}/photo`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setCurrentImage(data.image);
      setSuccess("Photo uploaded.");
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      const body = await res.json();
      setError(body.error ?? "Failed to upload photo");
    }
    setUploading(false);
  }

  const displayPhoto = photoPreview ?? currentImage;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wider text-gold">
            Edit Profile
          </h1>
          <p className="mt-1 text-sm text-cream/50">{session.user.name}</p>
        </div>

        {error && (
          <div className="rounded-md bg-crimson/15 p-3 text-sm text-crimson">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-field-green/15 p-3 text-sm text-field-green">
            {success}
          </div>
        )}

        {/* Photo section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-cream/70">Profile Photo</label>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gold-dark/20">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt="Profile photo"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl text-gold-dark">
                  {session.user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="text-sm text-cream/50 file:mr-2 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-charcoal hover:file:bg-gold-dark"
              />
              <p className="text-xs text-cream/40">JPEG, PNG, or WebP. Max 2MB.</p>
            </div>
          </div>
          {photoPreview && (
            <button
              type="button"
              onClick={handleUploadPhoto}
              disabled={uploading}
              className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Photo"}
            </button>
          )}
        </div>

        {/* Profile fields */}
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-cream/70">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-cream/70">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="platoon" className="block text-sm font-medium text-cream/70">
              Platoon
            </label>
            <select
              id="platoon"
              value={platoon}
              onChange={(e) => setPlatoon(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
            >
              <option value="">Select platoon...</option>
              <option value="Scouts">Scouts</option>
              <option value="Snipers">Snipers</option>
              <option value="4.2">4.2</option>
              <option value="Tow">Tow</option>
              <option value="HQ">HQ</option>
            </select>
          </div>
          <div>
            <label htmlFor="yearsServed" className="block text-sm font-medium text-cream/70">
              Years Served
            </label>
            <input
              id="yearsServed"
              type="text"
              value={yearsServed}
              onChange={(e) => setYearsServed(e.target.value)}
              placeholder="e.g. 1985-1989"
              className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-cream/70">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Berlin, Germany"
              className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Email change section */}
        <div className="border-t border-gold-dark/20 pt-6 space-y-3">
          <h2 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wider text-gold">
            Change Email
          </h2>

          {emailError && (
            <div className="rounded-md bg-crimson/15 p-3 text-sm text-crimson">
              {emailError}
            </div>
          )}
          {emailSuccess && (
            <div className="rounded-md bg-field-green/15 p-3 text-sm text-field-green">
              {emailSuccess}
            </div>
          )}

          {emailChangeStep === "idle" ? (
            <form onSubmit={handleInitiateEmailChange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-cream/70">
                  Current Email
                </label>
                <p className="mt-1 text-sm text-cream/50">{currentEmail}</p>
              </div>
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-cream/70">
                  New Email
                </label>
                <input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  required
                  className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream shadow-sm focus:border-gold focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={emailLoading || !newEmail.trim()}
                className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
              >
                {emailLoading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-cream/50">
                Code sent to <strong className="text-cream/80">{newEmail}</strong>
              </p>
              <form onSubmit={handleConfirmEmailChange} className="space-y-3">
                <div>
                  <label htmlFor="emailCode" className="block text-sm font-medium text-cream/70">
                    Verification Code
                  </label>
                  <input
                    id="emailCode"
                    type="text"
                    required
                    maxLength={9}
                    value={emailCode}
                    onChange={(e) => handleEmailCodeChange(e.target.value)}
                    placeholder="ABCD EFGH"
                    autoComplete="one-time-code"
                    className="mt-1 block w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-3 text-center font-mono text-lg tracking-widest text-cream uppercase shadow-sm focus:border-gold focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={emailLoading || emailCode.replace(/\s/g, "").length < 8}
                  className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-charcoal hover:bg-gold-dark disabled:opacity-50"
                >
                  {emailLoading ? "Confirming..." : "Confirm Email Change"}
                </button>
              </form>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResendEmailCode}
                  disabled={resendCooldown > 0}
                  className="text-sm font-medium text-gold-dark underline hover:text-gold disabled:opacity-50 disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEmailChange}
                  className="text-sm font-medium text-cream/50 underline hover:text-cream/70"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center">
          <Link
            href="/home"
            className="text-sm font-medium text-gold-dark underline hover:text-gold"
          >
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
