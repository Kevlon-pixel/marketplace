import nodemailer from "nodemailer";
import { ProductType } from "../../generated/prisma/index.js";
import isDev from "../config/is-dev.js";
import { getOrThrowEnv } from "./get-or-throw-env.js";

type ProductAccount = {
  login: string;
  password: string;
  email?: string;
  additionalData?: Record<string, string>;
};

type ProductKey = {
  key: string;
};

const createTransporter = () =>
  nodemailer.createTransport({
    host: getOrThrowEnv("EMAIL_HOST"),
    port: Number(getOrThrowEnv("EMAIL_PORT")),
    secure: !isDev,
    auth: {
      user: getOrThrowEnv("EMAIL_LOGIN"),
      pass: getOrThrowEnv("EMAIL_PASSWORD"),
    },
  });

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isProductKey(product: unknown): product is ProductKey {
  return (
    typeof product === "object" &&
    product !== null &&
    "key" in product &&
    typeof product.key === "string"
  );
}

function isProductAccount(product: unknown): product is ProductAccount {
  return (
    typeof product === "object" &&
    product !== null &&
    "login" in product &&
    typeof product.login === "string" &&
    "password" in product &&
    typeof product.password === "string"
  );
}

function renderAdditionalData(additionalData?: Record<string, string>) {
  if (!additionalData || Object.keys(additionalData).length === 0) {
    return "";
  }

  const rows = Object.entries(additionalData)
    .map(
      ([key, value]) =>
        `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`,
    )
    .join("");

  return `<p><strong>Дополнительные данные:</strong></p><ul>${rows}</ul>`;
}

function buildPurchaseHtml(
  title: string,
  type: ProductType,
  product: unknown,
): string {
  const safeTitle = escapeHtml(title);

  let message;

  if (type === ProductType.KEY && isProductKey(product)) {
    message = `
      <h1 align="center">Ваш товар готов к получению</h1>
      <p><strong>Товар:</strong> ${safeTitle}</p>
      <p><strong>Тип:</strong> Ключ</p>
      <p><strong>Ключ:</strong> ${escapeHtml(product.key)}</p>
    `;
  }

  if (type === ProductType.ACCOUNT && isProductAccount(product)) {
    message = `
      <h1 align="center">Ваш товар готов к получению</h1>
      <p><strong>Товар:</strong> ${safeTitle}</p>
      <p><strong>Тип:</strong> Аккаунт</p>
      <p><strong>Логин:</strong> ${escapeHtml(product.login)}</p>
      <p><strong>Пароль:</strong> ${escapeHtml(product.password)}</p>
      ${
        product.email
          ? `<p><strong>Email:</strong> ${escapeHtml(product.email)}</p>`
          : ""
      }
      ${renderAdditionalData(product.additionalData)}
    `;
  }

  if (!message) {
    message = `
    <h1 align="center">Ваш товар готов к получению</h1>
    <p><strong>Товар:</strong> ${safeTitle}</p>
    <p>Мы подтвердили оплату, но не смогли автоматически подготовить данные для выдачи.</p>
    <p>Пожалуйста, свяжитесь с поддержкой и укажите данные вашего заказа.</p>
  `;
  }

  return message;
}

export const sendBoughtProductEmail = async (
  email: string,
  title: string,
  type: ProductType,
  product: unknown,
): Promise<void> => {
  const transporter = createTransporter();

  await transporter.sendMail({
    to: email,
    from: getOrThrowEnv("EMAIL_LOGIN"),
    sender: "Marketplace",
    subject: "Ваш заказ готов к получению",
    html: buildPurchaseHtml(title, type, product),
  });
};

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

export const sendVerificationEmail = async (
  email: string,
  code: number,
  expires: Date,
): Promise<void> => {
  const transporter = createTransporter();

  await transporter.sendMail({
    to: email,
    from: getOrThrowEnv("EMAIL_LOGIN"),
    sender: "Marketplace",
    subject: "Код подтверждения email",
    html: `<h1 align="center">Ваш код: ${code}</h1><p align="center">Код действует до: ${normalizeExpires(expires)}</p>`,
  });
};
