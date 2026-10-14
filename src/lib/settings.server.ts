import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { SETTINGS_COOKIE, type Settings, parseSettings } from "./settings";

/**
 * The visitor's saved interface settings for this request. Reading cookies
 * makes the caller dynamic, so call it only inside a Suspense boundary.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const store = await cookies();
  return parseSettings(store.get(SETTINGS_COOKIE)?.value);
});
