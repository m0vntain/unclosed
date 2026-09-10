import { useEffect, useRef, useState } from "react";
import { Clock3, X } from "lucide-react";

export function SnoozeDialog({
  name,
  onClose,
  onSnooze,
}: {
  name: string;
  onClose: () => void;
  onSnooze: (until: string) => Promise<boolean>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const submit = async (until: Date) => {
    setBusy(true);
    if (await onSnooze(until.toISOString())) onClose();
    setBusy(false);
  };

  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="snooze-title">
      <div className="dialog-heading">
        <div className="dialog-title-icon">
          <Clock3 size={18} />
          <h2 id="snooze-title">Snooze Work Item</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={17} />
        </button>
      </div>

      <p className="dialog-desc">
        Temporarily hide <strong>{name}</strong> from your active radar.
      </p>

      <div className="snooze-presets">
        {[
          ["Tomorrow", 1],
          ["1 week", 7],
          ["1 month", 30],
        ].map(([label, days]) => (
          <button
            disabled={busy}
            key={label}
            className="preset-btn"
            onClick={() => {
              const until = new Date();
              if (days === 30) until.setMonth(until.getMonth() + 1);
              else until.setDate(until.getDate() + Number(days));
              void submit(until);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="snooze-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(new Date(`${date}T09:00:00`));
        }}
      >
        <label htmlFor="snooze-date">Or select a custom date</label>
        <div className="date-row">
          <input
            id="snooze-date"
            type="date"
            required
            min={new Date(Date.now() + 86400000).toLocaleDateString("en-CA")}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="primary" disabled={!date || busy}>
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
