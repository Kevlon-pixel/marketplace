import z from "zod";
import { ProductType } from "../../../generated/prisma/index.js";

const ListingBodySchema = z.object({
  type: z.nativeEnum(ProductType),
  title: z
    .string()
    .trim()
    .min(1, "title required")
    .max(150, "title is too long"),
  description: z.string().trim().min(1, "description required"),
  price: z.coerce.number().positive("price must be greater than 0"),
});

const UpdateListingBodySchema = ListingBodySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const ListingSchema = z.object({
  body: ListingBodySchema,
});

export const UpdateListingSchema = z.object({
  params: z.object({
    id: z.string().uuid("invalid listing id"),
  }),
  body: UpdateListingBodySchema.refine(
    (data) => Object.keys(data).length > 0,
    "at least one field is required",
  ),
});

export const DeleteListingSchema = z.object({
  params: z.object({
    id: z.string().uuid("invalid listing id"),
  }),
});
