import type { StoryblokClient } from "@storyblok/js";
import type { DataEntry } from "astro/content/config";
import type { Loader, LoaderContext } from "astro/loaders";
import { DatasourceEntrySchema, type StoryblokLoaderDatasourceConfig } from "./types";
import { checkStoredVersionUpToDate, createStoryblokClient, fetchDatasourceEntries, timeAgo } from "./utils";

/**
 * Creates a Storyblok Datasource loader with the provided configuration
 *
 * @param config - Configuration options for the Datasource loader
 * @returns Astro Loader instance for Storyblok Datasources
 */
export const StoryblokLoaderDatasource = (config: StoryblokLoaderDatasourceConfig): Loader => {
  const storyblokApi = createStoryblokClient(config);

  return {
    name: "loader-storyblok-datasource",
    load: async (context) => storyblokLoaderDatasourceImplem(config, storyblokApi, context),
    schema: DatasourceEntrySchema,
  };
};

export async function storyblokLoaderDatasourceImplem(
  config: StoryblokLoaderDatasourceConfig,
  storyblokApi: StoryblokClient,
  context: LoaderContext,
  cacheVersion?: number
): Promise<void> {
  const { store, logger, collection, meta } = context;

  try {
    if (checkStoredVersionUpToDate(meta, logger, collection, cacheVersion)) {
      // Storyblok space says it hasn't been changed since last fetch, so we can skip fetching
      return;
    }

    const response = await fetchDatasourceEntries(storyblokApi, config, cacheVersion);

    const { datasource_entries: entries, cv: responseCv } = response;
    const lastUpdate = timeAgo(new Date(Number(responseCv) * 1000));

    logger.info(`[${collection}] Loaded ${entries.length} entries (updated ${lastUpdate})`);

    if (config.switchNamesAndValues) {
      logger.info(`[${collection}] Switching names and values`);
    }

    for (const entry of entries) {
      if (!entry) {
        logger.warn(`[${collection}] Skipping null or undefined entry: ${JSON.stringify(entry)}`);
        continue;
      }

      const idValue = config.switchNamesAndValues ? entry.value : entry.name;
      const bodyValue = config.switchNamesAndValues ? entry.name : entry.value;

      // We tolerate empty body but not empty id
      if (!idValue || idValue === "") {
        logger.warn(`[${collection}] Skipping entry with empty id: ${JSON.stringify(entry)}`);
        continue;
      }

      logger.debug(`${collection}:: Processing entry - ID: ${idValue}, Body: ${bodyValue}`);

      const entryData: DataEntry = {
        id: idValue,
        body: bodyValue,
        data: entry,
      };

      store.set(entryData);
    }

    // Store the cache version
    meta.set("cacheVersion", responseCv.toString());
    logger.debug(`${collection}:: Stored cacheVersion: ${responseCv}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load datasource entries for "${collection}": ${errorMessage}`);
    throw error;
  }
}
