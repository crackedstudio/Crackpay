import { Mark } from "@/components/Brand";
import { QrCode } from "@/components/QrCode";

/**
 * The ticket stays black on white in both schemes, like the code inside it: it
 * is held up to a stranger's camera in daylight, and half of it is a QR.
 */
const TICKET_INK = "#12100e";
const TICKET_PAPER = "#f3f1ec";

export function PayTicket({ handle, link }: { handle: string; link: string }) {
  return (
    <div
      className="w-[17rem] self-center overflow-hidden rounded-[0.625rem] border-2"
      style={{ borderColor: TICKET_INK, background: "#ffffff", color: TICKET_INK, boxShadow: `6px 6px 0 ${TICKET_INK}` }}
    >
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: TICKET_INK, color: TICKET_PAPER }}
      >
        <span className="flex items-center gap-2">
          <Mark className="h-[1.3125rem] w-5" />
          <span className="display text-[0.9375rem]">CrackPay</span>
        </span>
        <span className="font-mono text-[0.625rem] font-semibold tracking-[0.1em]">SCAN TO PAY</span>
      </div>

      <div className="p-3.5">
        <QrCode value={link} label={`QR code to pay @${handle} on CrackPay`} />
      </div>

      {/* The tear line: a receipt you hand over, not a card you own. */}
      <div className="flex flex-col gap-0.5 border-t-2 border-dashed px-3.5 pb-3.5 pt-3" style={{ borderColor: TICKET_INK }}>
        <span className="display text-[1.625rem]">@{handle}</span>
        <span className="truncate font-mono text-[0.6875rem]" style={{ color: "#5c564f" }}>
          {link.replace(/^https?:\/\//, "")}
        </span>
      </div>
    </div>
  );
}

/** The link a pay-me code opens: the Send flow, addressed to `handle`. */
export function payLink(handle: string): string {
  return `${window.location.origin}/pay?to=${handle}`;
}
