import type { Loader, LoaderContext } from "astro/loaders";
import { createStoryblokClient, fetchDatasourceEntries, timeAgo } from "./utils";
import { DatasourceSchema, type StoryblokLoaderDatasourceConfig } from "./types";
import type { DataEntry } from "astro/content/config";
import type { StoryblokClient } from "@storyblok/js";

/**
 * Creates a Storyblok Datasource loader with the provided configuration
 *
 * @param config - Configuration options for the Datasource loader
 * @returns Astro Loader instance for Storyblok Datasources
 */
export const StoryblokLoaderDatasource = (config: StoryblokLoaderDatasourceConfig): Loader => {
  const storyblokApi = createStoryblokClient(config);

  return {
    name: "astro-loader-storyblok-datasource",
    load: async (context) => storyblokLoaderDatasourceImplem(config, storyblokApi, context),
    schema: DatasourceSchema,
  };
};

export async function storyblokLoaderDatasourceImplem(
  config: StoryblokLoaderDatasourceConfig,
  storyblokApi: StoryblokClient,
  context: LoaderContext
): Promise<void> {
  const { store, logger, collection } = context;

  try {
    const response = await fetchDatasourceEntries(storyblokApi, config);

    const { datasource_entries: entries, cv } = response;
    const lastUpdate = timeAgo(new Date(Number(cv) * 1000));

    logger.info(`'${collection}': Loaded ${entries.length} entries (updated ${lastUpdate})`);

    if (config.switchNamesAndValues) {
      logger.info(`'${collection}': Switching names and values`);
    }

    for (const entry of entries) {
      if (!entry) {
        logger.warn(`'${collection}': Skipping null or undefined entry: ${JSON.stringify(entry)}`);
        continue;
      }

      const idValue = config.switchNamesAndValues ? entry.value : entry.name;
      const bodyValue = config.switchNamesAndValues ? entry.name : entry.value;

      // We tolerate empty body but not empty id
      if (!idValue || idValue === "") {
        logger.warn(`'${collection}': Skipping entry with empty id: ${JSON.stringify(entry)}`);
        continue;
      }

      logger.debug(`'${collection}': Processing entry - ID: ${idValue}, Body: ${bodyValue}`);

      const entryData: DataEntry = {
        id: idValue,
        body: bodyValue,
        data: entry,
      };

      store.set(entryData);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load datasource entries for "${collection}": ${errorMessage}`);
    throw error;
  }
}
