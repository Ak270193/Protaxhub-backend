const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../config/supabase");
const { sendNotification } = require("../config/mailer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const BUCKET = "documents";

// GET /api/documents/:clientId?direction=inbox|sent
router.get("/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { direction } = req.query;
    let query = supabase.from("documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    if (direction) query = query.eq("direction", direction);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

// POST /api/documents/:clientId  (multipart form: file, direction, note)
// direction "sent" = client uploading to accountant. direction "inbox" = accountant sending to client.
router.post("/:clientId", upload.single("file"), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { direction = "sent", note } = req.body;
    if (!req.file) return res.status(400).json({ error: "file is required" });

    const path = `${clientId}/${uuidv4()}-${req.file.originalname}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
    });
    if (uploadError) throw uploadError;

    const { data: doc, error: insertError } = await supabase
      .from("documents")
      .insert({ client_id: clientId, direction, file_name: req.file.originalname, file_path: path, note: note || null })
      .select()
      .single();
    if (insertError) throw insertError;

    if (direction === "sent") {
      await sendNotification(
        "Client sent a new document",
        `A client (ID ${clientId}) uploaded: ${req.file.originalname}${note ? `\nNote: ${note}` : ""}`
      );
    }

    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

// GET /api/documents/:clientId/:docId/download
router.get("/:clientId/:docId/download", async (req, res) => {
  try {
    const { docId } = req.params;
    const { data: doc, error } = await supabase.from("documents").select("*").eq("id", docId).single();
    if (error) throw error;

    const { data: signed, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60 * 5);
    if (urlError) throw urlError;

    res.json({ url: signed.signedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get download link" });
  }
});

// DELETE /api/documents/:docId  — accountant-only in practice; gate this behind your admin auth, not the client app
router.delete("/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const { data: doc, error: fetchError } = await supabase.from("documents").select("*").eq("id", docId).single();
    if (fetchError) throw fetchError;

    await supabase.storage.from(BUCKET).remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) throw error;

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

module.exports = router;
