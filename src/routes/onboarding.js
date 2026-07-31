const express = require("express");
const supabase = require("../config/supabase");
const { sendNotification } = require("../config/mailer");

const router = express.Router();

function formatPerson(p, label) {
  let line = `${label}: ${p.name}\n  ${p.tfnAbnType}: ${p.tfnAbn}\n  DOB: ${p.dob}\n  Address: ${p.address}\n  Email: ${p.email}\n  Phone: ${p.phone}\n  BSB: ${p.bsb}  Account: ${p.account}\n  Marital status: ${p.marital}`;
  if (p.marital === "Married") {
    line += ` (${p.kids || 0} kids)`;
  }
  line += `\n  Residency: ${p.residency}`;
  if (p.marital === "Married" && p.spouse?.name) {
    line += `\n  Spouse: ${p.spouse.name}, ${p.spouse.tfnAbnType} ${p.spouse.tfnAbn}, DOB ${p.spouse.dob}, ${p.spouse.address}, ${p.spouse.email}, ${p.spouse.phone}, BSB ${p.spouse.bsb} Acc ${p.spouse.account}, ${p.spouse.residency}`;
  }
  return line;
}

// POST /api/onboarding
// body: { entityType, entityName, entityAbn, people: [ {role, name, tfnAbnType, tfnAbn, dob, address, email, phone, bsb, account, marital, kids, residency, spouse} ], consent: { agreed, signatureType, signatureValue } }
router.post("/", async (req, res) => {
  try {
    const { entityType, entityName, entityAbn, people, consent } = req.body;
    if (!entityType || !Array.isArray(people) || people.length === 0) {
      return res.status(400).json({ error: "entityType and at least one person are required" });
    }
    const primary = people[0];
    const isEntity = ["Company", "Trust", "Partnership"].includes(entityType);

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .upsert(
        {
          phone: primary.phone,
          entity_type: entityType,
          entity_name: entityName || null,
          entity_abn: entityAbn || null,
          applicant_name: primary.name,
          applicant_email: primary.email,
          applicant_phone: primary.phone,
          residency: primary.residency,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" }
      )
      .select()
      .single();

    if (clientError) throw clientError;

    // Store each person (director/trustee/partner/applicant) and their spouse if present
    const peopleRows = [];
    people.forEach((p) => {
      const role = people.length > 1 ? (entityType === "Company" ? "director" : entityType === "Trust" ? "trustee" : "partner") : "applicant";
      peopleRows.push({
        client_id: client.id,
        role,
        name: p.name,
        tfn_abn_type: p.tfnAbnType,
        tfn_abn: p.tfnAbn,
        dob: p.dob || null,
        address: p.address,
        email: p.email,
        phone: p.phone,
        bsb: p.bsb,
        account_number: p.account,
        marital_status: p.marital,
        kids: p.marital === "Married" ? Number(p.kids || 0) : null,
        residency: p.residency,
      });
      if (p.marital === "Married" && p.spouse?.name) {
        peopleRows.push({
          client_id: client.id,
          role: "spouse",
          name: p.spouse.name,
          tfn_abn_type: p.spouse.tfnAbnType,
          tfn_abn: p.spouse.tfnAbn,
          dob: p.spouse.dob || null,
          address: p.spouse.address,
          email: p.spouse.email,
          phone: p.spouse.phone,
          bsb: p.spouse.bsb,
          account_number: p.spouse.account,
          residency: p.spouse.residency,
        });
      }
    });

    if (peopleRows.length > 0) {
      const { error: peopleError } = await supabase.from("people").insert(peopleRows);
      if (peopleError) throw peopleError;
    }

    // Record the consent as a signed "Terms of Engagement" form
    if (consent) {
      const { error: formError } = await supabase.from("forms").insert({
        client_id: client.id,
        name: "Terms of Engagement",
        status: "signed",
        signature_type: consent.signatureType,
        signature_value: consent.signatureValue,
        signed_at: new Date().toISOString(),
      });
      if (formError) throw formError;
    }

    const peopleLabel = (i) => (people.length > 1 ? `Person ${i + 1}` : "Applicant");
    const peopleSummary = people.map((p, i) => formatPerson(p, peopleLabel(i))).join("\n\n");

    const entityBlock = isEntity && entityName ? `Entity: ${entityName} (ABN ${entityAbn})\n\n` : "";

    await sendNotification(
      `New onboarding: ${primary.name}`,
      `Business nature: ${entityType}\n${entityBlock}${peopleSummary}\n\nFull record stored with client ID: ${client.id}`
    );

    res.json({ clientId: client.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save onboarding submission" });
  }
});

module.exports = router;
