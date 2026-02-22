const nodemailer = require("nodemailer");
const isDev = require("../config/isDev");

const sendVerificationEmail = async (email, code, expires) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: !isDev,
    auth: {
      user: process.env.EMAIL_LOGIN,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    to: email,
    from: process.env.EMAIL_LOGIN,
    sender: "Marketplace",
    subject: "Код для верификации Email",
    html: `<h1 align="center">Ваш код: ${code}</h1><p align="center"  >Код истекает в: ${normalizeExpires(expires)}</p>`,
  });
};

function normalizeExpires(expires) {
  const date = new Date(expires);

  const timeZone = process.env.EMAIL_TIMEZONE || "Europe/Moscow";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

module.exports = sendVerificationEmail;
