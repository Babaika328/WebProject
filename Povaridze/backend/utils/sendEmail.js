const nodemailer = require('nodemailer');

const { createTransport } = nodemailer;

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: 'ukrastuk@gmail.com',
    pass: 'fufq xbxk bhow cfwk'  
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"Povaridze" <ukrastuk@gmail.com>',
      to,
      subject,
      html
    });
    console.log('Email successfully sent to:', to);
  } catch (error) {
    console.error('Email failed:', error);
    throw error;
  }
};

module.exports = sendEmail;