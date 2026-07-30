require("dotenv").config();
const express = require("express");
const cors = require("cors");

const onboardingRoutes = require("./routes/onboarding");
const otpRoutes = require("./routes/otp");
const documentsRoutes = require("./routes/documents");
const formsRoutes = require("./routes/forms");
const paymentsRoutes = require("./routes/payments");
const clientsRoutes = require("./routes/clients");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/onboarding", onboardingRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/clients", clientsRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Pro Tax Hub backend running on port ${PORT}`));
