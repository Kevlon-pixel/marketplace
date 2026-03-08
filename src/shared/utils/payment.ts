import { YooCheckout } from "@a2seven/yoo-checkout";
import { getOrThrowEnv } from "./get-or-throw-env.js";

export const YooKassa = new YooCheckout({
  shopId: getOrThrowEnv("SHOP_ID"),
  secretKey: getOrThrowEnv("API_PAYMENT_KEY"),
});
