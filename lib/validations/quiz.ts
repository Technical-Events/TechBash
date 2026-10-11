import { z } from "zod";

/** Question id mapped to selected option id. Bounded so input stays small. */
export const answersSchema = z
  .record(z.string().max(64), z.string().max(64))
  .refine((answers) => Object.keys(answers).length <= 50);
