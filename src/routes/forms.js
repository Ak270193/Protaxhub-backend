const express = require("express");
const supabase = require("../config/supabase");
const { sendNotification } = require("../config/mailer");

const router = express.Router();

// GET /api/forms/:clientId
router.get("/:clientId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .eq("client_id", req.params.clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load forms" });
  }
});

// POST /api/forms  { clientId, name }  — accountant adds a new form for a client to sign
router.post("/", async (req, res) => {
  try {
    const { clientId, name } = req.body;
    if (!clientId || !name) return res.status(400).json({ error: "clientId and name are required" });
    const { data, error } = await supabase.from("forms").insert({ client_id: clientId, name, status: "pending" }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create form" });
  }
});

// POST /api/forms/:formId/sign  { signatureType: 'type'|'draw', signatureValue }
router.post("/:formId/sign", async (req, res) => {
  try {
    const { formId } = req.params;
    const { signatureType, signatureValue } = req.body;
    if (!signatureType || !signatureValue) return res.status(400).json({ error: "signatureType and signatureValue are required" });

    const { data, error } = await supabase
      .from("forms")
      .update({ status: "signed", signature_type: signatureType, signature_value: signatureValue, signed_at: new Date().toISOString() })
      .eq("id", formId)
      .select()
      .single();
    if (error) throw error;

    await sendNotification("Form signed", `Form "${data.name}" was signed (client ID ${data.client_id}).`);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sign form" });
  }
});

module.exports = router;
