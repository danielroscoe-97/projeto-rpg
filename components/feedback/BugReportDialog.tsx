"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bug, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

type FeedbackType = "bug" | "suggestion" | "other";

export function BugReportDialog() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const typeOptions: { value: FeedbackType; label: string }[] = [
    { value: "bug", label: t("type_bug") },
    { value: "suggestion", label: t("type_suggestion") },
    { value: "other", label: t("type_other") },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("feedback").insert({
        type,
        message: message.trim(),
        email: email.trim() || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        user_id: user?.id ?? null,
      });

      if (error) throw error;

      toast.success(t("success"));
      setOpen(false);
      setType("bug");
      setMessage("");
      setEmail("");
    } catch {
      toast.error(t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all duration-200 min-h-[44px]"
        >
          <Bug className="h-4 w-4" />
          {t("btn_label")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <fieldset>
            <legend className="text-sm font-medium text-foreground mb-2">
              {t("type_label")}
            </legend>
            <div className="flex gap-3">
              {typeOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md cursor-pointer border transition-all duration-200 ${
                    type === opt.value
                      ? "bg-gold/15 text-gold border-gold/30"
                      : "text-muted-foreground border-border hover:text-foreground hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="feedback-type"
                    value={opt.value}
                    checked={type === opt.value}
                    onChange={() => setType(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Message */}
          <div>
            <label
              htmlFor="feedback-message"
              className="text-sm font-medium text-foreground mb-1 block"
            >
              {t("message_label")}
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("message_placeholder")}
              required
              minLength={10}
              rows={4}
              className="w-full rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="feedback-email"
              className="text-sm font-medium text-foreground mb-1 block"
            >
              {t("email_label")}
            </label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email_placeholder")}
              className="w-full rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || message.trim().length < 10}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md bg-gold text-black hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-h-[44px]"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("submit")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
