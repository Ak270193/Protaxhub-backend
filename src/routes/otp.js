const express = require("express");
const supabase = require("../config/supabase");
const twilioClient = require("../config/twilio");

const router = express.Router();

const CODE_TTL_MINUTES = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// POST /api/otp/send  { phone }
router.post("/send", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone is required" });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    const { error } = await supabase.from("otp_codes").insert({ phone, code, expires_at: expiresAt });
    if (error) throw error;

    if (twilioClient) {
      await twilioClient.messages.create({
        to: phone,
        from: process.env.TWILIO_FROM_NUMBER,
        body: `Your Pro Tax Hub login code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
      });
    } else {
      console.log(`[otp] (Twilio not configured) code for ${phone}: ${code}`);
    }

    res.json({ sent: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send code" });
  }
});

// POST /api/otp/verify  { phone, code }
router.post("/verify", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "phone and code are required" });

    const { data: otp, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!otp) return res.status(401).json({ error: "Invalid or expired code" });

    await supabase.from("otp_codes").update({ used: true }).eq("id", otp.id);

    const { data: client } = await supabase.from("clients").select("*").eq("phone", phone).maybeSingle();

    res.json({ verified: true, client: client || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify code" });
  }
});

module.exports = router;
