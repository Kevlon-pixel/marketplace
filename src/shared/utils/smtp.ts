import nodemailer from "nodemailer";
import isDev from "../config/is-dev";
import { getOrThrowEnv } from "./get-or-throw-env";

function normalizeExpires(expires: Date | string): string {
  const date = new Date(expires);
  const timeZone = getOrThrowEnv("EMAIL_TIMEZONE") || "Europe/Moscow";

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

const sendVerificationEmail = async (
  email: string,
  code: number,
  expires: Date,
): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: getOrThrowEnv("EMAIL_HOST"),
    port: Number(getOrThrowEnv("EMAIL_PORT")),
    secure: !isDev,
    auth: {
      user: getOrThrowEnv("EMAIL_LOGIN"),
      pass: getOrThrowEnv("EMAIL_PASSWORD"),
    },
  });

  await transporter.sendMail({
    to: email,
    from: getOrThrowEnv("EMAIL_LOGIN"),
    sender: "Marketplace",
    subject: "Код для верификации Email",
    html: `<h1 align="center">Ваш код: ${code}</h1><p align="center">Код истекает в: ${normalizeExpires(expires)}</p>`,
  });
};

export default sendVerificationEmail;
