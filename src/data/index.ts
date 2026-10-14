import "server-only";

import type { Dataset } from "@/types/domain";
import { generateDataset } from "./generate";

let dataset: Dataset | undefined;

/**
 * The demo dataset, generated once per server process. It is deterministic, so
 * every render and every instance sees identical data. Marked server-only: the
 * full dataset never ships to the browser; views pass down only what they show.
 */
export function getDataset(): Dataset {
  dataset ??= generateDataset();
  return dataset;
}
