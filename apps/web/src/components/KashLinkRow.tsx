"use client";

import { Link as LinkIcon, ChevronRight } from "@/components/icons";
import { Card } from "@/components/ui";
import { KASHLINK_APP_ID, kashLinkAppUrl } from "@/lib/kashlink";
import { useMiniApp } from "@/lib/miniapp/use-miniapps";

/**
 * "Send as a link", handing over to the KashLink Mini App. Shown only while
 * KashLink is listed and switched on, so the admin's kill switch hides it too.
 */
export function KashLinkRow() {
  const kashlink = useMiniApp(KASHLINK_APP_ID);
  if (kashlink.status !== "ready") return null;

  return (
    <Card>
      {/* A full page load: the app's page carries its own frame policy. */}
      <a href={kashLinkAppUrl()} className="pressable flex w-full items-center gap-3 px-4 py-4 text-left">
        <LinkIcon className="h-5 w-5 text-muted" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold">Send as a link</span>
          <span className="text-sm text-muted">For someone who isn&apos;t on CrackPay yet. Opens KashLink.</span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted" />
      </a>
    </Card>
  );
}
