import { ListingError, parseListing } from "@/lib/miniapp/listing";
import { getStore } from "@/lib/server/context";
import { ApiError } from "@/lib/server/errors";
import { clientIp, readBody, respond, stringField } from "@/lib/server/http";

// A developer submits a Mini App listing for review. Nothing is listed by this
// call: a person reviews the row and adds the app to the registry by hand.
export function POST(request: Request): Promise<Response> {
  return respond(async () => {
    const body = await readBody(request);
    const contact = stringField(body, "contact").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      throw new ApiError(400, "invalid_contact", "Enter an email address we can reach you on.");
    }

    let listing;
    try {
      listing = parseListing(body.listing);
    } catch (error) {
      if (error instanceof ListingError) throw new ApiError(400, "invalid_listing", error.message);
      throw error;
    }

    const store = getStore();
    if (!(await store.hit(`submission:ip:${clientIp(request)}`, 24 * 60 * 60, 10))) {
      throw new ApiError(429, "rate_limited", "Too many submissions today. Try again tomorrow.");
    }
    return { reference: await store.saveSubmission({ contact, listing }) };
  });
}
