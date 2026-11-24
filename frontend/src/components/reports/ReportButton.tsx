"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { Button, FormErrors, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export type ReportTargetType = "post" | "comment" | "review" | "itinerary";

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
}

export function ReportButton({ targetType, targetId, className }: ReportButtonProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setReason("");
    setError(null);
  };

  const submit = async () => {
    if (!reason.trim()) {
      setError(new Error("Please provide a reason for this report."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/reports", { targetType, targetId, reason: reason.trim() });
      close();
      toast.success("Report submitted. Thank you for helping keep the community safe.");
    } catch (reportError) {
      setError(reportError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className={className} onClick={() => setOpen(true)}>
        Report
      </Button>
      <Modal
        open={open}
        title="Report this content"
        onClose={close}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
            <Button type="button" variant="danger" onClick={() => void submit()} loading={busy}>Submit report</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-muted">Tell us why this {targetType} should be reviewed.</p>
          <label htmlFor={`report-reason-${targetId}`} className="block text-sm font-semibold">Reason</label>
          <Textarea
            id={`report-reason-${targetId}`}
            value={reason}
            maxLength={500}
            placeholder="Describe the issue"
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            aria-describedby={`report-count-${targetId}`}
          />
          <p id={`report-count-${targetId}`} className="text-xs text-muted">{reason.length}/500 characters</p>
          <FormErrors error={error} />
        </div>
      </Modal>
    </>
  );
}
