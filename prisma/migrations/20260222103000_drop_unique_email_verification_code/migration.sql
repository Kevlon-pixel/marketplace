-- Drop unique index for email verification code to avoid random collisions between users
DROP INDEX IF EXISTS "User_emailVerificationCode_key";
