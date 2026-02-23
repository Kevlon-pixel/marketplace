import { getOrThrowEnv } from "../utils/getOrThrowEnv";

const isDev = getOrThrowEnv("NODE_ENV") === "development";

export default isDev;
