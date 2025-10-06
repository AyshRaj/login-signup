import nodemailer from "nodemailer";

const sendEmail = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "mohra302010@gmail.com",       
        pass: "ttuuwezgbalwtmfn",          
      },
    });

    await transporter.sendMail({
      from: "ayshraj175@gmail.com",
      to: email,
      subject,
      text,
    });

    console.log(" Email sent successfully");
  } catch (error) {
    console.log(" Email not sent");
    console.error(error);
  }
};

export default sendEmail;
