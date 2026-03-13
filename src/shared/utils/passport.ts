import passport from "passport";
import { Strategy as YandexStrategy, type Profile } from "passport-yandex";
import userService from "../../modules/user/user.service.js";
import { createError } from "./create-error.js";
import { getOrThrowEnv } from "./get-or-throw-env.js";

type OAuthUser = {
  id: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
};

passport.use(
  "yandex",
  new YandexStrategy<OAuthUser>(
    {
      clientID: getOrThrowEnv("YANDEX_CLIENT_ID"),
      clientSecret: getOrThrowEnv("YANDEX_CLIENT_SECRET"),
      callbackURL: getOrThrowEnv("YANDEX_REDIRECT_URL"),
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: any,
    ) => {
      try {
        const yandexId = profile.id;
        const email = profile.emails?.[0]?.value?.trim().toLowerCase();

        if (!yandexId || !email) {
          throw createError("yandex account email is not available", 400);
        }

        const createdUser = await userService.findOrCreateOAuthUser(
          email,
          yandexId,
        );

        return done(null, createdUser);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "yandex oauth failed";

        return done(message);
      }
    },
  ),
);

export default passport;
