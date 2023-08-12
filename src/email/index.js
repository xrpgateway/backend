const sgMail = require('@sendgrid/mail');
const apiKey = process.env.SENDGRID_API_KEY
sgMail.setApiKey(apiKey);

/*const msgObj = {
    to: 'recipient@example.com',
    from: 'sender@example.com',
    subject: 'Test Email',
    text: 'This is a test email sent using SendGrid.',
    html: '<p>This is a test email sent using <strong>SendGrid</strong>.</p>',
};*/

async function sendEmail(msgObj){
    sgMail.send(msgObj)
}

export default {
    sendEmail
}