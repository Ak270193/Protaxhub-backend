const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/payments/:clientId
router.get("/:clientId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payment_options")
      .select("*")
      .eq("client_id", req.params.clientId)
      .order("due_date", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load payment options" });
  }
});

// POST /api/payments  { clientId, title, amount, reference, dueDate, method }  — accountant adds a payment option
router.post("/", async (req, res) => {
  try {
    const { clientId, title, amount, reference, dueDate, method } = req.body;
    if (!clientId || !title || !amount || !reference) {
      return res.status(400).json({ error: "clientId, title, amount, and reference are required" });
    }
    const { data, error } = await supabase
      .from("payment_options")
      .insert({ client_id: clientId, title, amount, reference, due_date: dueDate || null, method })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add payment option" });
  }
});

module.exports = router;
