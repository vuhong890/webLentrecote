import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html }) => {
  // We expect EMAIL_USER and EMAIL_PASS to be set in .env.local
  // This should be a Gmail account and an App Password.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER or EMAIL_PASS is not set. Email not sent.');
    return { success: false, error: 'Email configuration is missing.' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"L'Entrecôte Notification" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};
