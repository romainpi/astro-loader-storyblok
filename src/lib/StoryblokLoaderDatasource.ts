import type { Loader } from "astro/loaders";
import { createStoryblokClient, fetchDatasourceEntries, timeAgo } from "./utils";
import type { StoryblokLoaderDatasourceConfig } from "./types";
import type { DataEntry } from "astro/content/config";

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
    load: async ({ store, logger, collection }) => {
      try {
        logger.info(`'${collection}': Loading datasource entries for "${config.datasource}"`);

        const response = await fetchDatasourceEntries(storyblokApi, config);

        const { datasource_entries: entries, cv } = response;
        const lastUpdate = timeAgo(new Date(Number(cv) * 1000));

        logger.info(`'${collection}': Loaded ${entries.length} entries (updated ${lastUpdate})`);

        if (config.switchNamesAndValues) {
          logger.info(`'${collection}': Switching names and values`);
        }

        for (const entry of entries) {
          if (!entry.name || !entry.value) {
            logger.warn(`Skipping entry with missing name or value: ${JSON.stringify(entry)}`);
            continue;
          }

          const entryData: DataEntry = config.switchNamesAndValues
            ? {
                id: entry.value,
                body: entry.name,
                data: entry,
              }
            : {
                id: entry.name,
                body: entry.value,
                data: entry,
              };

          store.set(entryData);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to load datasource entries for "${collection}": ${errorMessage}`);
        throw error;
      }
    },
  };
};
