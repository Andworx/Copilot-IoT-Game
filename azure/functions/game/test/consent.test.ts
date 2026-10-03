import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { routeEnabled } from "../src/lib/apiSurface";
import { buildFollowUpEmail, buildOptInConfirmationEmail, FOLLOW_UP_SUBJECT } from "../src/lib/consentEmails";
import { maskEmail } from "../src/lib/consent";
import { followUpWindow, retentionCutoff } from "../src/lib/consentMaintenance";
import { buildPreferenceLink, signPreferenceToken, verifyPreferenceToken } from "../src/lib/preferenceToken";

const CONTACT = "11111111-1111-4111-8111-111111111111";

describe("preference tokens", () => {
  before(() => {
    process.env.PREFERENCE_TOKEN_SECRET = "test-secret-test-secret-test-secret-123";
  });

  it("round-trips a manage token for the same contact", () => {
    const token = signPreferenceToken({ contactId: CONTACT, purpose: "manage" });
    assert.deepEqual(verifyPreferenceToken(token, ["manage"]), { contactId: CONTACT, purpose: "manage" });
  });

  it("rejects the wrong purpose, so a manage link cannot confirm an opt-in", () => {
    const token = signPreferenceToken({ contactId: CONTACT, purpose: "manage" });
    assert.equal(verifyPreferenceToken(token, ["confirm"]), null);
  });

  it("rejects tampering, expiry, garbage and a claim-token-shaped value", () => {
    const token = signPreferenceToken({ contactId: CONTACT, purpose: "confirm" });
    const [payload, signature] = token.split(".");
    assert.equal(verifyPreferenceToken(`${payload}x.${signature}`, ["confirm"]), null);
    assert.equal(verifyPreferenceToken(token, ["confirm"], new Date(Date.now() + 8 * 24 * 3600 * 1000)), null);
    assert.equal(verifyPreferenceToken("not-a-token", ["manage", "confirm"]), null);
    assert.equal(verifyPreferenceToken("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", ["manage", "confirm"]), null);
    assert.equal(verifyPreferenceToken(null, ["manage"]), null);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signPreferenceToken({ contactId: CONTACT, purpose: "manage" });
    process.env.PREFERENCE_TOKEN_SECRET = "another-secret-another-secret-another-1";
    assert.equal(verifyPreferenceToken(token, ["manage"]), null);
    process.env.PREFERENCE_TOKEN_SECRET = "test-secret-test-secret-test-secret-123";
  });

  it("builds a link that keeps an existing query string", () => {
    assert.equal(buildPreferenceLink("https://example.test/prefs?lang=en", "abc.def"), "https://example.test/prefs?lang=en&pref=abc.def");
  });
});

describe("maskEmail", () => {
  it("hides most of the address", () => {
    assert.equal(maskEmail("ada.lovelace@example.com"), "a******@example.com");
    assert.equal(maskEmail("a@b.co"), "a**@b.co");
    assert.equal(maskEmail(null), "");
  });
});

describe("daily job windows", () => {
  const now = new Date("2026-10-10T14:00:00.000Z");

  it("considers a campaign only from its follow-up time until 3 days later", () => {
    assert.deepEqual(followUpWindow(now), { from: "2026-10-07T14:00:00.000Z", to: "2026-10-10T14:00:00.000Z" });
  });

  it("expires contacts 90 days after the drawing", () => {
    assert.equal(retentionCutoff(now), "2026-07-12T14:00:00.000Z");
  });
});

describe("follow-up email", () => {
  const base = { firstName: "Ada", eventName: "Expo", manageUrl: "https://example.test/prefs?pref=t", privacyNoticeUrl: "https://example.test/privacy" };

  it("is a neutral thank-you with only a manage link when there is no confirmed opt-in", () => {
    const email = buildFollowUpEmail({ ...base, marketing: null });
    assert.equal(email.subject, FOLLOW_UP_SUBJECT);
    assert.match(email.html, /Thank you for coming by the booth/);
    assert.match(email.html, /ask us to remove your details/);
    assert.doesNotMatch(email.html, /MARKETING-BLOCK/);
  });

  it("adds marketing content and the sender address only for an opted-in contact", () => {
    const email = buildFollowUpEmail({ ...base, marketing: { html: "<p>MARKETING-BLOCK</p>", senderAddress: "1 Main St" } });
    assert.match(email.html, /MARKETING-BLOCK/);
    assert.match(email.html, /1 Main St/);
  });

  it("escapes values interpolated into the confirmation email", () => {
    const email = buildOptInConfirmationEmail({ firstName: "<b>x</b>", confirmUrl: "https://example.test/?a=1&b=2" });
    assert.doesNotMatch(email.html, /<b>x<\/b>/);
    assert.match(email.html, /a=1&amp;b=2/);
  });
});

describe("API surface", () => {
  it("serves the preference route from the public app only", () => {
    assert.equal(routeEnabled("preferences", "public"), true);
    assert.equal(routeEnabled("preferences", "staff"), false);
  });
});
