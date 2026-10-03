import { escapeHtml } from "./dataverse";

/** Fixed subject: the follow-up job treats any email on an entry with this subject as already attempted. */
export const FOLLOW_UP_SUBJECT = "Thanks for stopping by the Andworx Copilot IoT Game booth";
export const OPT_IN_CONFIRM_SUBJECT = "Please confirm: Andworx news and offers";

const shell = (body: string): string =>
  `<!doctype html><html lang="en"><body style="margin:0;background:#f4f7fb;color:#172033;font-family:Segoe UI,Arial,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border:1px solid #d8e0ea;border-radius:10px;overflow:hidden;"><tr><td style="background:#2a3380;color:#ffffff;padding:22px 28px;border-bottom:4px solid #f59e0b;"><p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;">andworx</p></td></tr><tr><td style="padding:28px;font-size:16px;line-height:1.6;">${body}</td></tr></table></td></tr></table></body></html>`;

const link = (url: string, text: string): string => `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`;

export function buildOptInConfirmationEmail(input: { firstName: string; confirmUrl: string; privacyNoticeUrl?: string | null }): { subject: string; html: string } {
  const notice = input.privacyNoticeUrl ? `<p style="font-size:13px;color:#53657a;">How we use your information: ${link(input.privacyNoticeUrl, input.privacyNoticeUrl)}</p>` : "";
  return {
    subject: OPT_IN_CONFIRM_SUBJECT,
    html: shell(
      `<p>Hi ${escapeHtml(input.firstName)},</p>` +
        `<p>You asked to hear from Andworx about news and offers. Please confirm it was you:</p>` +
        `<p style="margin:22px 0;"><a href="${escapeHtml(input.confirmUrl)}" style="background:#f59e0b;color:#14100a;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700;">Confirm my subscription</a></p>` +
        `<p>If you did not ask for this, ignore this email and you will not be subscribed. The link expires in 7 days.</p>${notice}`
    ),
  };
}

export function buildFollowUpEmail(input: {
  firstName: string;
  eventName: string;
  manageUrl: string;
  /** Only for contacts with a confirmed opt-in. */
  marketing?: { html: string; senderAddress: string } | null;
  privacyNoticeUrl?: string | null;
}): { subject: string; html: string } {
  const thanks = `<p>Hi ${escapeHtml(input.firstName)},</p><p>Thank you for coming by the booth and playing the Copilot IoT Game at ${escapeHtml(input.eventName)}. We hope you enjoyed it.</p>`;
  const marketing = input.marketing ? `<hr style="border:none;border-top:1px solid #d8e0ea;margin:22px 0;">${input.marketing.html}` : "";
  const manage =
    `<p style="font-size:14px;color:#53657a;">You can ${link(input.manageUrl, "manage your choices, unsubscribe, or ask us to remove your details")} at any time.` +
    (input.privacyNoticeUrl ? ` How we use your information: ${link(input.privacyNoticeUrl, input.privacyNoticeUrl)}.` : "") +
    `</p>`;
  const address = input.marketing ? `<p style="font-size:12px;color:#53657a;">${escapeHtml(input.marketing.senderAddress)}</p>` : "";
  return { subject: FOLLOW_UP_SUBJECT, html: shell(`${thanks}${marketing}${manage}${address}`) };
}
