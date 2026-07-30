const nodemailer = require("nodemailer");

const normalizeSmtpValue = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/\s+/g, "");
};

const createTransporter = () => {
  const smtpUser = normalizeSmtpValue(process.env.SMTP_USER);
  const smtpPass = normalizeSmtpValue(process.env.SMTP_PASS);
  const smtpHost = normalizeSmtpValue(process.env.SMTP_HOST);
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

  if (smtpHost && smtpHost !== "smtp.gmail.com") {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
};

const verifySmtpConnection = () => {
  try {
    const transporter = createTransporter();
    transporter.verify((error) => {
      if (error) {
        console.warn("⚠️ SMTP configuration check warning:", error.message);
      } else {
        console.log("✅ SMTP connection verified and ready to send emails");
      }
    });
  } catch (err) {
    console.warn("⚠️ SMTP initialization check warning:", err.message);
  }
};

verifySmtpConnection();

const getOtpEmailTemplate = (otp, title = "MoveSmart Verification Code") => {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-weight: 800; font-size: 20px; letter-spacing: 1px;">🚌 MoveSmart</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; line-height: 1.3;">${title}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px; color: #334155; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1e293b;">Hello,</p>
              <p style="margin: 0 0 24px 0; color: #475569;">Use the verification code below to complete your MoveSmart request. This code is valid for <strong>10 minutes</strong>.</p>
              
              <!-- OTP Box -->
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your One-Time Password</span>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; margin: 8px 0; text-indent: 8px;">${otp}</div>
                <span style="display: block; font-size: 13px; color: #64748b; margin-top: 8px;">🔒 Do not share this verification code with anyone.</span>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                If you did not request this email, please ignore it or contact our support team if you have security concerns.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${currentYear} MoveSmart Transit System. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const sendOtpEmail = async (email, otp, subject = "MoveSmart Email Verification OTP") => {
  const smtpUser = normalizeSmtpValue(process.env.SMTP_USER);
  const smtpPass = normalizeSmtpValue(process.env.SMTP_PASS);

  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS in the backend environment.");
  }

  const transporter = createTransporter();
  const htmlContent = getOtpEmailTemplate(otp, subject);
  const textContent = `Your MoveSmart verification code is: ${otp}. It expires in 10 minutes. Do not share this code with anyone.`;

  const mailOptions = {
    from: process.env.SMTP_FROM ? `MoveSmart <${process.env.SMTP_FROM}>` : `MoveSmart <${smtpUser}>`,
    to: email,
    subject: subject,
    text: textContent,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Real OTP email sent successfully to ${email} (MessageID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    if (error.code === "EAUTH" || error.responseCode === 535) {
      throw new Error("Gmail rejected the SMTP credentials. Make sure 2-Step Verification is enabled and you are using a valid 16-character Google App Password.");
    }
    throw error;
  }
};

const sendApplicationStatusEmail = async (email, name, status, details = {}) => {
  const smtpUser = normalizeSmtpValue(process.env.SMTP_USER);
  const smtpPass = normalizeSmtpValue(process.env.SMTP_PASS);

  if (!smtpUser || !smtpPass) return;

  const transporter = createTransporter();
  const currentYear = new Date().getFullYear();

  let statusBadgeColor = "#2563eb";
  let statusTitle = `Card Application Update: ${status}`;

  if (status === "Approved") {
    statusBadgeColor = "#16a34a";
  } else if (status === "Rejected") {
    statusBadgeColor = "#dc2626";
  } else if (status === "Correction Needed") {
    statusBadgeColor = "#d97706";
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 40px 10px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">MoveSmart Smart Pass</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; color: #334155;">
              <p style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Hello ${name || "Applicant"},</p>
              <p>Your MoveSmart Smart Card Application status has been updated to:</p>
              
              <div style="display: inline-block; background-color: ${statusBadgeColor}; color: #ffffff; font-weight: 700; padding: 8px 16px; border-radius: 20px; font-size: 15px; margin: 12px 0 20px 0;">
                ${status}
              </div>

              ${details.assignedRfidTag ? `<p><strong>Assigned RFID Tag:</strong> ${details.assignedRfidTag}</p>` : ""}
              ${details.assignedCardNumber ? `<p><strong>Card Number:</strong> ${details.assignedCardNumber}</p>` : ""}
              ${details.rejectionReason ? `<p style="color: #dc2626;"><strong>Reason:</strong> ${details.rejectionReason}</p>` : ""}
              ${details.correctionNote ? `<p style="color: #d97706;"><strong>Note from Admin:</strong> ${details.correctionNote}</p>` : ""}

              <p style="margin-top: 24px; color: #64748b; font-size: 14px;">Log in to your MoveSmart account to view your pass or update details.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${currentYear} MoveSmart Transit System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `MoveSmart <${smtpUser}>`,
      to: email,
      subject: statusTitle,
      text: `Your MoveSmart Smart Card Application status is now: ${status}.`,
      html: htmlContent
    });
    console.log(`✅ Application status email (${status}) sent to ${email}`);
  } catch (err) {
    console.error(`❌ Failed to send status email to ${email}:`, err.message);
  }
};

module.exports = {
  sendOtpEmail,
  sendApplicationStatusEmail
};
