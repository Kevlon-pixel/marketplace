import { createError } from "./create-error";

export const getOrThrowEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw createError(`${name} is not configured`, 500);
  }
  return value;
};
