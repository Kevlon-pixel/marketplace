ALTER TABLE "User"
ADD COLUMN "passwordResetCode" INTEGER,
ADD COLUMN "passwordResetCodeExpire" TIMESTAMP(3);
