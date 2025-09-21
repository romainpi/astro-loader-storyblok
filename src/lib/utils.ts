import { storyblokInit, apiPlugin, type StoryblokClient } from "@storyblok/js";
import type { StoryblokLoaderCommonConfig } from "./types";
import { SLUGS } from "./constants";
import type { DataStore, MetaStore } from "astro/loaders";
import type {
  StoryblokDatasourceResponse,
  StoryblokLoaderDatasourceConfig,
  StoryblokLoaderStoriesConfig,
  StoryblokStory,
} from "./types";
import type { ISbStoriesParams, ISbStoryData } from "@storyblok/js";
import type { AstroIntegrationLogger } from "astro";

/**
 * Initializes the Storyblok API client with comprehensive error handling
 *
 * @param config - The common configuration for Storyblok API
 * @returns Initialized Storyblok API client
 * @throws Error when client initialization fails
 */
export function createStoryblokClient(config: StoryblokLoaderCommonConfig): StoryblokClient {
  if (!config.accessToken) {
    throw new Error("Storyblok access token is required. Please provide a valid access token in the configuration.");
  }

  const { storyblokApi } = storyblokInit({
    accessToken: config.accessToken,
    apiOptions: config.apiOptions,
    use: [apiPlugin],
  });

  if (!storyblokApi) {
    throw new Error("Failed to initialize Storyblok API client. Please check your access token and configuration.");
  }

  return storyblokApi;
}

/**
 * Fetches datasource entries from the Storyblok API with error handling
 *
 * @param storyblokApi - Initialized Storyblok API client
 * @param config - Datasource loader configuration
 * @returns Promise resolving to datasource response
 * @throws Error when API request fails
 */
export async function fetchDatasourceEntries(
  storyblokApi: StoryblokClient,
  config: StoryblokLoaderDatasourceConfig,
  cv?: number
): Promise<StoryblokDatasourceResponse> {
  try {
    const { data } = await storyblokApi.get(SLUGS.DatasourceEntries, {
      datasource: config.datasource,
      dimension: config.dimension,
      cv,
    });

    return data as StoryblokDatasourceResponse;
  } catch (error) {
    throw new Error(
      `Failed to fetch datasource entries for "${config.datasource}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Fetches stories from the Storyblok API with error handling
 *
 * @param storyblokApi - Initialized Storyblok API client
 * @param config - Stories loader configuration
 * @param otherParams - Additional query parameters
 * @param contentType - Optional content type filter
 * @returns Promise resolving to stories response
 * @throws Error when API request fails
 */
export async function fetchStories(
  storyblokApi: StoryblokClient,
  otherParams: Record<string, any>,
  contentType?: string,
  storyblokParams?: ISbStoriesParams
): Promise<Array<ISbStoryData>> {
  try {
    const apiResponse = (await storyblokApi.getAll(SLUGS.Stories, {
      content_type: contentType,
      ...storyblokParams,
      ...otherParams,
    })) as Array<ISbStoryData>;

    return apiResponse;
  } catch (error) {
    const contentTypeInfo = contentType ? ` for content type "${contentType}"` : "";
    throw new Error(
      `Failed to fetch stories${contentTypeInfo}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function fetchSpaceCacheVersionValue(
  storyblokApi: StoryblokClient,
  logger: AstroIntegrationLogger
): Promise<number> {
  try {
    const resultSpaceResponse = await storyblokApi.get(SLUGS.CurrentSpace);

    const retValue = resultSpaceResponse.data.space?.version;
    if (!retValue || isNaN(retValue)) {
      throw new Error("Invalid cache version received from Storyblok API.");
    }

    logger.debug(`Fetched space cache version: ${retValue}`);

    return Number(retValue);
  } catch (error) {
    throw new Error(`Failed to fetch space cache version: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Processes the stories response and updates the store
 */
export function processStoriesResponse(
  response: Array<ISbStoryData>,
  store: DataStore,
  logger: AstroIntegrationLogger,
  collection: string,
  contentType: string | undefined,
  latestPublishedAt: Date | null,
  config: StoryblokLoaderStoriesConfig
): Date | null {
  // Log the time of the latest update from Storyblok API's response
  // Note: storyblokApi.getAll does not return 'cv' (storyblokApi.get does)
  /*
  const contentTypeInfo = contentType ? ` for content type "${contentType}"` : "";
  const lastUpdate = timeAgo(new Date(Number(cv) * 1000));
  logger.info(`'${collection}': Loaded ${stories.length} stories${contentTypeInfo} (updated ${lastUpdate})`);
  */

  let updatedLatestPublishedAt = latestPublishedAt;

  for (const story of response) {
    const publishedAt = story.published_at ? new Date(story.published_at) : null;

    // Track the latest published timestamp
    if (publishedAt && (!updatedLatestPublishedAt || publishedAt > updatedLatestPublishedAt)) {
      updatedLatestPublishedAt = publishedAt;
    }

    setStoryInStore(store, story, config, logger, collection);
  }

  return updatedLatestPublishedAt;
}

/**
 * Sets a story in the data store with the appropriate ID format
 */
export function setStoryInStore(
  store: DataStore,
  story: StoryblokStory,
  config: StoryblokLoaderStoriesConfig,
  logger: AstroIntegrationLogger,
  collection: string
): void {
  logger.debug(
    `'${collection}': Storing story - ID: ${config.useUuids ? story.uuid : story.full_slug}, Title: ${story.name}`
  );

  store.set({
    data: story,
    id: config.useUuids ? story.uuid : story.full_slug,
  });
}

/**
 * Determines if date filtering should be used based on stored date and version
 */
export function shouldUseDateFilter(storedLastPublishedAt: string | undefined, version?: string): boolean {
  return !!(storedLastPublishedAt && version !== "draft");
}

/**
 * Simple utility to format time ago without external dependencies
 */
export function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? "" : "s"} ago`;
}

export function checkStoredVersionUpToDate(meta: MetaStore, logger: AstroIntegrationLogger, collection: string, cacheVersion?: number): boolean {
  // Try and read the last cache version from meta
  const metaCvEntry = meta.get("cacheVersion");
  const metaCv = metaCvEntry ? parseInt(metaCvEntry, 10) : undefined;
  if (metaCv && !isNaN(metaCv)) {
    logger.debug(`'${collection}': Found stored cache version: ${metaCv}`);

    if (metaCv === cacheVersion) {
      logger.info(`'${collection}': No changes detected (cv: ${cacheVersion}), skipping fetch`);
      return true;
    }
  }

  return false;
}
