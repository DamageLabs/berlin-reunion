"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
      });
  }, [session]);

  if (isPending) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-sm text-silver">Loading...</p>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
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
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="mt-1 text-sm text-silver">{session.user.name}</p>
        </div>

        {error && (
          <div className="rounded-md bg-crimson/10 p-3 text-sm text-crimson dark:bg-crimson/20">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-field-green/10 p-3 text-sm text-field-green dark:bg-field-green/20">
            {success}
          </div>
        )}

        {/* Photo section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">Profile Photo</label>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-silver/20">
              {displayPhoto ? (
                <Image
                  src={displayPhoto}
                  alt="Profile photo"
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl text-silver">
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
                className="text-sm text-silver file:mr-2 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gold hover:file:bg-navy-dark dark:file:bg-gold dark:file:text-navy"
              />
              <p className="text-xs text-silver">JPEG, PNG, or WebP. Max 2MB.</p>
            </div>
          </div>
          {photoPreview && (
            <button
              type="button"
              onClick={handleUploadPhoto}
              disabled={uploading}
              className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark disabled:opacity-50 dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
            >
              {uploading ? "Uploading..." : "Upload Photo"}
            </button>
          )}
        </div>

        {/* Profile fields */}
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
            />
          </div>
          <div>
            <label htmlFor="platoon" className="block text-sm font-medium">
              Platoon
            </label>
            <select
              id="platoon"
              value={platoon}
              onChange={(e) => setPlatoon(e.target.value)}
              className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
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
            <label htmlFor="yearsServed" className="block text-sm font-medium">
              Years Served
            </label>
            <input
              id="yearsServed"
              type="text"
              value={yearsServed}
              onChange={(e) => setYearsServed(e.target.value)}
              placeholder="e.g. 1985-1989"
              className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Berlin, Germany"
              className="mt-1 block w-full rounded-md border border-silver px-3 py-2 text-sm shadow-sm focus:border-gold focus:outline-none dark:border-silver/30 dark:bg-navy-light"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-navy px-4 py-2 text-sm font-medium text-gold hover:bg-navy-dark disabled:opacity-50 dark:bg-gold dark:text-navy dark:hover:bg-gold-dark"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <p className="text-center">
          <Link
            href="/hello"
            className="text-sm font-medium underline text-silver"
          >
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
