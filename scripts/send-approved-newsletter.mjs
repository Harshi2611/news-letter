const today = new Date().toISOString().slice(0, 10);
const approvedBy = process.env.APPROVED_BY || "Siri Shortcut";
const approvalNote = process.env.APPROVAL_NOTE || "Approved from iPhone";

const required = ["RESEND_API_KEY", "NEWSLETTER_FROM_EMAIL", "NEWSLETTER_TO_EMAIL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required GitHub secrets: ${missing.join(", ")}`);
}

const subject = `Daily newsletter - ${today}`;
const text = [
  `Daily newsletter for ${today}`,
  "",
  "Top items:",
  "1. Add your first real news source in scripts/send-approved-newsletter.mjs.",
  "2. Replace this placeholder content with generated newsletter content.",
  "3. This email was triggered by Siri through GitHub Actions.",
  "",
  `Approved by: ${approvedBy}`,
  `Approval note: ${approvalNote}`,
].join("\n");

const html = `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
    <h1 style="font-size: 22px;">Daily newsletter - ${today}</h1>
    <p>Your newsletter was approved from iPhone and sent by GitHub Actions.</p>
    <h2 style="font-size: 16px;">Top items</h2>
    <ol>
      <li>Add your first real news source in <code>scripts/send-approved-newsletter.mjs</code>.</li>
      <li>Replace this placeholder content with generated newsletter content.</li>
      <li>This email was triggered by Siri through GitHub Actions.</li>
    </ol>
    <p><strong>Approved by:</strong> ${escapeHtml(approvedBy)}</p>
    <p><strong>Approval note:</strong> ${escapeHtml(approvalNote)}</p>
  </body>
</html>`;

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": "newsletter-siri-approval/1.0",
  },
  body: JSON.stringify({
    from: process.env.NEWSLETTER_FROM_EMAIL,
    to: [process.env.NEWSLETTER_TO_EMAIL],
    subject,
    html,
    text,
  }),
});

const resultText = await response.text();

if (!response.ok) {
  throw new Error(`Email send failed: ${response.status} ${resultText}`);
}

console.log(`Newsletter email sent for ${today}.`);
console.log(resultText);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
