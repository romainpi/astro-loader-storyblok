import type { Loader, LoaderContext } from "astro/loaders";
import { type ISbStoryData, type StoryblokClient } from "@storyblok/js";
import { checkStoredVersionUpToDate, createStoryblokClient, timeAgo } from "./utils";

import type { StoryblokLoaderStoriesConfig } from "./types";
import { fetchStories, processStoriesResponse, setStoryInStore, shouldUseDateFilter } from "./utils";

/**
 * Creates a Storyblok Stories loader with the provided configuration
 *
 * @param config - Configuration options for the Stories loader
 * @returns Astro Loader instance for Storyblok Stories
 */
export function StoryblokLoaderStories(config: StoryblokLoaderStoriesConfig): Loader {
  const storyblokApi = createStoryblokClient(config);

  return {
    name: "loader-storyblok-stories",
    load: async (context) => storyblokLoaderStoriesImplem(config, storyblokApi, context),
  };
}

export async function storyblokLoaderStoriesImplem(
  config: StoryblokLoaderStoriesConfig,
  storyblokApi: StoryblokClient,
  context: LoaderContext,
  cacheVersion?: number
): Promise<void> {
  const { store, logger, collection, refreshContextData, meta } = context;
  try {
    // Handle story updates from webhooks
    if (refreshContextData?.story) {
      logger.info(`'${collection}': Syncing... story updated in Storyblok`);
      const updatedStory = refreshContextData.story as ISbStoryData;
      setStoryInStore(store, updatedStory, config, logger, collection);
      return;
    }

    if (checkStoredVersionUpToDate(meta, logger, collection, cacheVersion)) {
      // Storyblok space says it hasn't been changed since last fetch, so we can skip fetching
      return;
    }

    // Only fetches stories since the last published timestamp if available
    // and not in draft mode (which should always fetch everything)
    const storedLastPublishedAt = meta.get("lastPublishedAt");
    const otherParams = shouldUseDateFilter(storedLastPublishedAt, config.storyblokParams?.version)
      ? { published_at_gt: storedLastPublishedAt }
      : {};

    // Clear store for draft mode to ensure fresh data
    if (config.storyblokParams?.version === "draft") {
      logger.info(`'${collection}': Clearing store (draft mode)`);
      store.clear();
    }

    let latestPublishedAt = storedLastPublishedAt ? new Date(storedLastPublishedAt) : null;

    // Process each content type (or all if none specified)
    const contentTypes = config.contentTypes || [undefined];

    for (const contentType of contentTypes) {
      const response = await fetchStories(storyblokApi, otherParams, contentType, config.storyblokParams);

      latestPublishedAt = processStoriesResponse(
        response,
        store,
        logger,
        collection,
        contentType,
        latestPublishedAt,
        config
      );
    }

    // Update metadata with latest published timestamp
    if (latestPublishedAt) {
      meta.set("lastPublishedAt", latestPublishedAt.toISOString());
    }

    // Store the cache version
    if (cacheVersion) {
      meta.set("cacheVersion", cacheVersion.toString());
      logger.debug(`[${collection}] Stored cacheVersion: ${cacheVersion} (${timeAgo(new Date(cacheVersion * 1000))})`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`'${collection}': Failed to load stories for "${collection}": ${errorMessage}`);
    throw error;
  }
}
