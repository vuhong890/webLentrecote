import nodemailer from 'nodemailer';

// Create the transporter outside the function to reuse the connection pool.
// This prevents Gmail from dropping connections when multiple emails are sent quickly.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true, // Use pooled connections instead of creating a new connection for every email
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  // We expect EMAIL_USER and EMAIL_PASS to be set in .env.local
  // This should be a Gmail account and an App Password.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER or EMAIL_PASS is not set. Email not sent.');
    return { success: false, error: 'Email configuration is missing.' };
  }

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
