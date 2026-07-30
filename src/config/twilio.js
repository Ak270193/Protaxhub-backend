const twilio = require("twilio");

let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
  console.warn("[twilio] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set — OTP SMS will not send until configured in .env");
}

module.exports = client;
