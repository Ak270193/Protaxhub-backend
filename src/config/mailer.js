const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM || "onboarding@resend.dev";

if (!RESEND_API_KEY) {
  console.warn("[mailer] RESEND_API_KEY not set — emails will not send until configured in .env");
}

async function sendEmail({ to, subject, text }) {
  if (!RESEND_API_KEY) {
    console.log(`[mailer] (not configured) would have sent to ${to}: ${subject}\n${text}`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[mailer] Resend error:", errText);
    return { sent: false };
  }
  return { sent: true };
}

async function sendNotification(subject, text) {
  return sendEmail({ to: process.env.NOTIFY_EMAIL, subject, text });
}

module.exports = { sendNotification, sendEmail };
