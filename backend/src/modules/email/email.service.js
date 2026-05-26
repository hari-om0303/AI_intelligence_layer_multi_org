const nodemailer = require('nodemailer');

let transporter;

// Initialize Ethereal Transporter
const initTransporter = async () => {
  if (transporter) return transporter;

  try {
    // Automatically generate ethereal credentials for testing
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    console.log('[Email Service] Ethereal SMTP Initialized');
    return transporter;
  } catch (err) {
    console.error('[Email Service Error]', err);
    return null;
  }
};

/**
 * Sends an invitation email to a new member
 */
exports.sendInviteEmail = async (toEmail, tempPassword, inviterName, orgName) => {
  try {
    const tp = await initTransporter();
    if (!tp) throw new Error('Transporter not initialized');

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #4f46e5; text-align: center;">You've been invited!</h2>
        <p style="color: #374151; font-size: 16px;">
          Hi there,
        </p>
        <p style="color: #374151; font-size: 16px;">
          <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on SaaSify!
        </p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #4b5563; font-size: 14px;">Your temporary login credentials:</p>
          <p style="margin: 10px 0 5px 0; color: #111827;"><strong>Email:</strong> ${toEmail}</p>
          <p style="margin: 0; color: #111827;"><strong>Password:</strong> ${tempPassword}</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="http://localhost:5173/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Login to your account</a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
          Please log in and change your password as soon as possible.
        </p>
      </div>
    `;

    const info = await tp.sendMail({
      from: '"SaaSify Team" <noreply@saasify.test>', // sender address
      to: toEmail, // list of receivers
      subject: `You're invited to join ${orgName}`, // Subject line
      html: htmlContent, // html body
    });

    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL SENT SUCCESSFULLY] to ${toEmail}`);
    console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`======================================================\n`);

    return {
      info,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (err) {
    console.error('[Email Sending Error]', err);
    return null;
  }
};
