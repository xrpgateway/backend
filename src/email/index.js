const nodemailer = require("nodemailer");

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: "smtppro.zoho.in",
  port: 465, // Use 465 for SSL, or 587 for TLS
  secure: true, // Use SSL
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD,
  },
});

const sendEmail = ({ to, subject, text, html }) => {
const mailOptions =  { to, subject, text, html }
  mailOptions["from"] = process.env.ZOHO_EMAIL;
  // Define email options
  /*const mailOptions = {
    from: "your_zoho_email@example.com",
    to: "recipient@example.com",
    subject: "Test Email from Node.js",
    text: "Hello, this is a test email sent from Node.js using Zoho Mail!",
  };*/
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        reject(error);
      } else {
        console.log("Email sent:", info.response);
        resolve(info);
      }
    });
  });
  // Send the email
};

export default { sendEmail };
