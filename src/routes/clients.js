const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/clients/:clientId
router.get("/:clientId", async (req, res) => {
  try {
    const { data, error } = await supabase.from("clients").select("*").eq("id", req.params.clientId).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load client" });
  }
});

// PATCH /api/clients/:clientId  — used by the "My details" tab
router.patch("/:clientId", async (req, res) => {
  try {
    const { entityName, entityAbn, applicantName, applicantEmail, applicantPhone, residency } = req.body;
    const { data, error } = await supabase
      .from("clients")
      .update({
        entity_name: entityName,
        entity_abn: entityAbn,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        residency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.clientId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update client details" });
  }
});

module.exports = router;
