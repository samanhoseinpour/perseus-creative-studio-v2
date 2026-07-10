/**
 * Authoritative validation for ticket creation. Unlike contactSchema.ts this
 * is NOT shared with a client form — the admin client stays zod-free (chunk
 * hygiene), so only the createTicket server action may import this module
 * (the `server-only` guard turns that rule into a build error).
 * Client-facing constants/pre-checks live in the zod-free ticketFields.ts.
 */
import 'server-only';
import { z } from 'zod';

import {
  TICKET_AREA_SLUGS,
  TICKET_DESCRIPTION_MAX,
  TICKET_SEVERITY_SLUGS,
  TICKET_TITLE_MAX,
} from './ticketFields';

export const ticketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Give the ticket a short title.')
    .max(
      TICKET_TITLE_MAX,
      `Please keep the title under ${TICKET_TITLE_MAX} characters.`,
    ),
  description: z
    .string()
    .trim()
    .min(1, 'Describe what happened.')
    .max(
      TICKET_DESCRIPTION_MAX,
      `Please keep this under ${TICKET_DESCRIPTION_MAX.toLocaleString()} characters.`,
    ),
  severity: z.enum(TICKET_SEVERITY_SLUGS),
  // Area slugs are derived from the admin nav at runtime (not a static
  // tuple), so allow-list via refine instead of z.enum.
  area: z
    .string()
    .trim()
    .max(40)
    .refine((slug) => TICKET_AREA_SLUGS.includes(slug), 'Pick where you saw it.'),
});

export type TicketInput = z.infer<typeof ticketSchema>;

/** FormData → the object shape `ticketSchema` expects. */
export function ticketFromFormData(fd: FormData): Record<string, unknown> {
  const str = (key: string) => {
    const v = fd.get(key);
    return typeof v === 'string' ? v : undefined;
  };
  return {
    title: str('title'),
    description: str('description'),
    severity: str('severity'),
    area: str('area'),
  };
}
