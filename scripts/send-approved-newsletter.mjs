const today = new Date().toISOString().slice(0, 10);
const approvedBy = process.env.APPROVED_BY || "Siri Shortcut";
const approvalNote = process.env.APPROVAL_NOTE || "Approved from iPhone";

console.log(`Newsletter approved for ${today}.`);
console.log(`Approved by: ${approvedBy}`);
console.log(`Approval note: ${approvalNote}`);
console.log("TODO: connect this script to your email sender, such as Resend, SendGrid, Mailgun, or SES.");
