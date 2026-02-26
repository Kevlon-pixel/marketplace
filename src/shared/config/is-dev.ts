import { getOrThrowEnv } from "../utils/get-or-throw-env.js";

const isDev = getOrThrowEnv("NODE_ENV") === "development";

export default isDev;
