import type { Loader } from "astro/loaders";
import { createStoryblokClient } from "./utils";

import type { StoryblokLoaderDatasourceConfig } from "./types";
import { fetchDatasourceEntries, processDatasourceResponse } from "./utils";

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
        logger.info(`'${collection}': Loading datasource entries for "${collection}"`);

        const response = await fetchDatasourceEntries(storyblokApi, config);

        processDatasourceResponse(response, store, logger, collection, config);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to load datasource entries for "${collection}": ${errorMessage}`);
        throw error;
      }
    },
  };
};
