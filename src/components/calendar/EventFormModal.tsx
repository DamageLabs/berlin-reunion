"use client";

import { useState } from "react";
import type { EventFormData, EventDetail } from "./types";
import ModalOverlay from "@/components/ModalOverlay";

interface EventFormModalProps {
	event?: EventDetail | null;
	onClose: () => void;
	onSave: (data: EventFormData, eventId?: string) => Promise<void>;
}

function toLocalDate(iso: string): string {
	const d = new Date(iso);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function toLocalTime24(iso: string): string {
	const d = new Date(iso);
	const h = String(d.getHours()).padStart(2, "0");
	const min = String(d.getMinutes()).padStart(2, "0");
	return `${h}:${min}`;
}

function defaultDate(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function defaultTime(): string {
	const d = new Date();
	const nextHour = d.getHours() + 1;
	return `${String(nextHour % 24).padStart(2, "0")}:00`;
}

/** Auto-format time input: "1435" → "14:35", "930" → "09:30", etc. */
function formatTimeInput(raw: string): string {
	// Strip non-digits
	const digits = raw.replace(/\D/g, "");
	if (digits.length === 0) return raw;
	// Already has colon and is valid, keep as-is
	if (/^\d{1,2}:\d{2}$/.test(raw)) return raw;
	// 3 digits: H:MM (e.g. "930" → "09:30")
	if (digits.length === 3) {
		return `0${digits[0]}:${digits.slice(1)}`;
	}
	// 4 digits: HH:MM (e.g. "1435" → "14:35")
	if (digits.length >= 4) {
		return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
	}
	return raw;
}

/** Combine date (YYYY-MM-DD) and time (HH:MM) into a datetime-local string */
function combineDatetime(date: string, time: string): string {
	return `${date}T${time}`;
}

const inputClass =
	"mt-1 w-full rounded-md border border-gold-dark/30 bg-charcoal-light px-3 py-2 text-sm text-cream focus:border-gold/50 focus:outline-none";

export default function EventFormModal({
	event,
	onClose,
	onSave,
}: EventFormModalProps) {
	const isEdit = !!event;

	const [startDate, setStartDate] = useState(
		event?.startAt ? toLocalDate(event.startAt) : defaultDate(),
	);
	const [startTime, setStartTime] = useState(
		event?.startAt ? toLocalTime24(event.startAt) : defaultTime(),
	);
	const [recEndDate, setRecEndDate] = useState(
		event?.recurrenceEndAt ? toLocalDate(event.recurrenceEndAt) : "",
	);
	const [recEndTime, setRecEndTime] = useState(
		event?.recurrenceEndAt ? toLocalTime24(event.recurrenceEndAt) : "23:59",
	);

	const [form, setForm] = useState({
		title: event?.title ?? "",
		description: event?.description ?? "",
		durationMinutes: event?.durationMinutes ?? 60,
		location: event?.location ?? "",
		recurrenceType: event?.recurrenceType ?? "",
		visibility: event?.visibility ?? "public",
	});
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	function handleChange(
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) {
		const { name, value } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: name === "durationMinutes" ? Number(value) : value,
		}));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!form.title.trim()) {
			setError("Title is required");
			return;
		}
		if (!startDate || !startTime) {
			setError("Start date and time are required");
			return;
		}
		const formatted = formatTimeInput(startTime);
		setStartTime(formatted);
		if (!/^\d{2}:\d{2}$/.test(formatted)) {
			setError("Start time must be in HH:MM format");
			return;
		}

		const formData: EventFormData = {
			title: form.title,
			description: form.description,
			startAt: combineDatetime(startDate, formatted),
			durationMinutes: form.durationMinutes,
			location: form.location,
			recurrenceType: form.recurrenceType,
			recurrenceEndAt:
				form.recurrenceType && recEndDate
					? combineDatetime(recEndDate, recEndTime || "23:59")
					: "",
			visibility: form.visibility,
		};

		setSaving(true);
		try {
			await onSave(formData, event?.id);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save event");
		} finally {
			setSaving(false);
		}
	}

	return (
		<ModalOverlay open={true} onClose={onClose} panelClassName="w-full max-w-lg">
			{(labelId) => (
				<>
					<h3
						id={labelId}
						className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wider text-gold"
					>
						{isEdit ? "Edit Event" : "Create Event"}
					</h3>

					<form onSubmit={handleSubmit} className="mt-4 space-y-4">
						{error && (
							<div className="rounded-md border border-red-900/30 bg-red-950/20 p-2 text-sm text-red-400">
								{error}
							</div>
						)}

						{/* Title */}
						<div>
							<label htmlFor="title" className="block text-sm text-cream/50">
								Title *
							</label>
							<input
								id="title"
								name="title"
								type="text"
								value={form.title}
								onChange={handleChange}
								className={`${inputClass} placeholder:text-cream/30`}
								placeholder="Event title"
							/>
						</div>

						{/* Date + Time + Duration */}
						<div className="grid grid-cols-3 gap-4">
							<div>
								<label htmlFor="startDate" className="block text-sm text-cream/50">
									Date *
								</label>
								<input
									id="startDate"
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									className={`${inputClass} [color-scheme:dark]`}
								/>
							</div>
							<div>
								<label htmlFor="startTime" className="block text-sm text-cream/50">
									Time * (24h)
								</label>
								<input
									id="startTime"
									type="text"
									inputMode="numeric"
									value={startTime}
									onChange={(e) => setStartTime(e.target.value)}
									onBlur={() => setStartTime(formatTimeInput(startTime))}
									placeholder="14:30"
									pattern="\d{2}:\d{2}"
									className={`${inputClass} placeholder:text-cream/30`}
								/>
							</div>
							<div>
								<label
									htmlFor="durationMinutes"
									className="block text-sm text-cream/50"
								>
									Duration (min)
								</label>
								<input
									id="durationMinutes"
									name="durationMinutes"
									type="number"
									min={1}
									value={form.durationMinutes}
									onChange={handleChange}
									className={inputClass}
								/>
							</div>
						</div>

						{/* Location */}
						<div>
							<label htmlFor="location" className="block text-sm text-cream/50">
								Location
							</label>
							<input
								id="location"
								name="location"
								type="text"
								value={form.location}
								onChange={handleChange}
								className={`${inputClass} placeholder:text-cream/30`}
								placeholder="e.g., Zoom link, Berlin HQ"
							/>
						</div>

						{/* Recurrence */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="recurrenceType"
									className="block text-sm text-cream/50"
								>
									Recurrence
								</label>
								<select
									id="recurrenceType"
									name="recurrenceType"
									value={form.recurrenceType}
									onChange={handleChange}
									className={inputClass}
								>
									<option value="">None (one-time)</option>
									<option value="daily">Daily</option>
									<option value="weekly">Weekly</option>
									<option value="biweekly">Every 2 weeks</option>
									<option value="monthly">Monthly</option>
									<option value="yearly">Yearly</option>
								</select>
							</div>
							{form.recurrenceType && (
								<div className="space-y-2">
									<label className="block text-sm text-cream/50">
										Recurrence Ends
									</label>
									<input
										type="date"
										value={recEndDate}
										onChange={(e) => setRecEndDate(e.target.value)}
										className={`${inputClass} mt-0 [color-scheme:dark]`}
									/>
									<input
										type="text"
										inputMode="numeric"
										value={recEndTime}
										onChange={(e) => setRecEndTime(e.target.value)}
										onBlur={() => setRecEndTime(formatTimeInput(recEndTime))}
										placeholder="23:59"
										pattern="\d{2}:\d{2}"
										className={`${inputClass} mt-0 placeholder:text-cream/30`}
									/>
								</div>
							)}
						</div>

						{/* Visibility */}
						<div>
							<label className="block text-sm text-cream/50">Visibility</label>
							<div className="mt-1 flex gap-2">
								<button
									type="button"
									onClick={() => setForm((prev) => ({ ...prev, visibility: "public" }))}
									className={`rounded-md border px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider ${
										form.visibility === "public"
											? "border-gold/60 bg-gold-dark/30 text-gold"
											: "border-gold-dark/30 text-cream/40 hover:text-cream/60"
									}`}
								>
									Public
								</button>
								<button
									type="button"
									onClick={() => setForm((prev) => ({ ...prev, visibility: "private" }))}
									className={`rounded-md border px-3 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider ${
										form.visibility === "private"
											? "border-gold/60 bg-gold-dark/30 text-gold"
											: "border-gold-dark/30 text-cream/40 hover:text-cream/60"
									}`}
								>
									Private
								</button>
							</div>
						</div>

						{/* Description */}
						<div>
							<label
								htmlFor="description"
								className="block text-sm text-cream/50"
							>
								Description
							</label>
							<textarea
								id="description"
								name="description"
								rows={3}
								value={form.description}
								onChange={handleChange}
								className={`${inputClass} placeholder:text-cream/30`}
								placeholder="Optional description"
							/>
						</div>

						{/* Buttons */}
						<div className="flex justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={onClose}
								className="rounded-md border border-gold-dark/30 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-cream/60 hover:text-cream/80"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={saving}
								className="rounded-md border border-gold-dark/40 bg-gold-dark/20 px-4 py-1.5 font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-wider text-gold hover:border-gold/60 hover:bg-gold-dark/30 disabled:opacity-50"
							>
								{saving ? "Saving..." : isEdit ? "Update" : "Create"}
							</button>
						</div>
					</form>
				</>
			)}
		</ModalOverlay>
	);
}
