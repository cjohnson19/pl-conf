"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

interface ImportantDate {
  name: string;
  date: string;
}

const dateNames = [
  { key: "abstract", label: "Abstract" },
  { key: "paper", label: "Paper Submission" },
  { key: "notification", label: "Notification" },
  { key: "rebuttal", label: "Rebuttal" },
  { key: "conditional-acceptance", label: "Conditional Acceptance" },
  { key: "camera-ready", label: "Camera Ready" },
  { key: "revisions", label: "Revisions" },
] as const;

const eventTypes = ["conference", "workshop", "symposium"] as const;

export function SubmissionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);

  const addImportantDate = () => {
    const lastDate =
      importantDates.length > 0
        ? importantDates[importantDates.length - 1].date
        : "";
    setImportantDates([...importantDates, { name: "", date: lastDate }]);
  };

  const updateImportantDate = (
    index: number,
    field: keyof ImportantDate,
    value: string
  ) => {
    const updated = [...importantDates];
    updated[index][field] = value;
    setImportantDates(updated);
  };

  const removeImportantDate = (index: number) => {
    setImportantDates(importantDates.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    const importantDatesObj = importantDates.reduce(
      (acc, { name, date }) => {
        if (name && date) {
          acc[name] = date;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    const notes = (formData.get("notes") as string)
      .split("\n")
      .map((note) => note.trim())
      .filter((note) => note.length > 0);

    const payload = {
      name: formData.get("name"),
      abbreviation: formData.get("abbreviation"),
      type: formData.get("type"),
      url: formData.get("url") || undefined,
      location: formData.get("location") || undefined,
      importantDateUrl: formData.get("importantDateUrl") || undefined,
      date: {
        start: formData.get("startDate") || "TBD",
        end: formData.get("endDate") || "TBD",
      },
      importantDates: importantDatesObj,
      notes,
    };

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_SUBMISSION_API_URL || "/api/submit";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Submission successful`,
        });
        if (e.currentTarget) {
          e.currentTarget.reset();
        }
        setImportantDates([]);
      } else {
        const error = await response.json();
        setMessage({
          type: "error",
          text: error.details
            ? `Validation errors: ${error.details.map((d: { message: string }) => d.message).join(", ")}`
            : error.message || "Submission failed",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Submit New Event</h1>

      {message && (
        <div
          className={cn(
            "p-4 rounded-md mb-6",
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          )}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Event Name *
            </label>
            <Input id="name" name="name" required />
          </div>

          <div>
            <label
              htmlFor="abbreviation"
              className="block text-sm font-medium mb-2"
            >
              Abbreviation *
            </label>
            <Input id="abbreviation" name="abbreviation" required />
          </div>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-2">
            Event Type *
          </label>
          <select
            id="type"
            name="type"
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          >
            <option value="">Select type...</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <label
              htmlFor="startDate"
              className="block text-sm font-medium mb-2"
            >
              Start Date
            </label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              className="w-full"
            />
          </div>

          <div className="w-full">
            <label htmlFor="endDate" className="block text-sm font-medium mb-2">
              End Date
            </label>
            <Input id="endDate" name="endDate" type="date" className="w-full" />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-2">
            Location
          </label>
          <Input id="location" name="location" placeholder="City, Country" />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-2">
            Conference URL
          </label>
          <Input id="url" name="url" type="url" placeholder="https://..." />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Important Dates</label>
            <Button
              type="button"
              onClick={addImportantDate}
              variant="outline"
              size="sm"
            >
              Add Date
            </Button>
          </div>

          {importantDates.map((date, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <select
                value={date.name}
                onChange={(e) =>
                  updateImportantDate(index, "name", e.target.value)
                }
                className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="">Select date type...</option>
                {dateNames.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={date.date}
                onChange={(e) =>
                  updateImportantDate(index, "date", e.target.value)
                }
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => removeImportantDate(index)}
                variant="outline"
                size="sm"
              >
                Remove
              </Button>
            </div>
          ))}

          {importantDates.length > 0 && (
            <div className="mt-2">
              <label
                htmlFor="importantDateUrl"
                className="block text-sm font-medium mb-2"
              >
                Important Dates Reference URL
              </label>
              <Input
                id="importantDateUrl"
                name="importantDateUrl"
                type="url"
                placeholder="https://..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Required when important dates are specified
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Any additional notes about the conference..."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Event"}
        </Button>
      </form>
    </div>
  );
}
