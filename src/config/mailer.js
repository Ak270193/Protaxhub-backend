const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  console.warn("[mailer] SMTP_* env vars not set — emails will not send until configured in .env");
}

async function sendNotification(subject, text) {
  if (!transporter) {
    console.log(`[mailer] (not configured) would have sent: ${subject}\n${text}`);
    return { sent: false };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL,
    subject,
    text,
  });
  return { sent: true };
}

module.exports = { sendNotification };
