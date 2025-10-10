import { storyblokInit, apiPlugin, type StoryblokClient } from "@storyblok/js";
import type { StoryblokLoaderCommonConfig } from "./types";
import { SLUGS } from "./constants";
import type { DataStore, LoaderContext, MetaStore } from "astro/loaders";
import type {
  StoryblokDatasourceResponse,
  StoryblokLoaderDatasourceConfig,
  StoryblokLoaderStoriesConfig,
  StoryblokStory,
  StorySortFunction,
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
  _context: LoaderContext
): Promise<number> {
  try {
    const resultSpaceResponse = await storyblokApi.get(SLUGS.CurrentSpace);

    const retValue = resultSpaceResponse.data.space?.version;
    if (!retValue || isNaN(retValue)) {
      throw new Error("Invalid cache version received from Storyblok API.");
    }

    return Number(retValue);
  } catch (error) {
    throw new Error(`Failed to fetch space cache version: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Processes the stories response and inserts them into the data store
 * @returns The latest `published_at` date found in the stories
 */
export function processStoriesResponse(
  response: Array<ISbStoryData>,
  store: DataStore,
  context: LoaderContext,
  contentType: string | undefined,
  latestPublishedAt: Date | null,
  config: StoryblokLoaderStoriesConfig
): Date | null {
  const { logger, collection } = context;
  let updatedLatestPublishedAt = latestPublishedAt;

  // Get the effective sort configuration
  const sortConfig = getEffectiveSortConfig(config);

  // If we have sorting configured and this is an incremental update,
  // we need to maintain proper sort order
  if (sortConfig.type !== "none" && response.length > 0) {
    // Get existing stories from store for this content type
    const existingStories: ISbStoryData[] = [];
    for (const [, entry] of store.entries()) {
      const storyData = entry.data as unknown as ISbStoryData;
      // Filter by content type if specified, otherwise include all
      if (!contentType || storyData.content?.component === contentType) {
        existingStories.push(storyData);
      }
    }

    // Create a Set of identifiers for stories in the response to avoid duplicates
    const responseStoryIds = new Set(response.map((story) => (config.useUuids ? story.uuid : story.full_slug)));

    // Filter out existing stories that are also in the response (updated stories)
    const filteredExistingStories = existingStories.filter((story) => {
      const storyId = config.useUuids ? story.uuid : story.full_slug;
      return !responseStoryIds.has(storyId);
    });

    // Combine filtered existing and new stories, then sort
    const allStories = [...filteredExistingStories, ...response];
    const sortedStories = sortStoriesWithConfig(allStories, sortConfig);

    // Clear the store for this content type and repopulate in sorted order
    if (contentType) {
      // Remove only stories of this content type
      for (const [key, entry] of store.entries()) {
        const storyData = entry.data as unknown as ISbStoryData;
        if (storyData.content?.component === contentType) {
          store.delete(key);
        }
      }
    } else {
      // Clear all stories if no content type filter
      store.clear();
    }

    // Add all stories back in sorted order
    for (const story of sortedStories) {
      const publishedAt = story.published_at ? new Date(story.published_at) : null;

      // Track the latest published timestamp
      if (publishedAt && (!updatedLatestPublishedAt || publishedAt > updatedLatestPublishedAt)) {
        updatedLatestPublishedAt = publishedAt;
      }

      setStoryInStore(store, story as StoryblokStory, config, context);
    }

    const sortTypeLabel = sortConfig.type === "custom" ? "custom sort" : `sort by ${sortConfig.sortBy}`;
    logger.info(
      `[${collection}] Processed and sorted ${response.length} new stories with ${
        filteredExistingStories.length
      } existing stories (${sortTypeLabel})${contentType ? ` for content type "${contentType}"` : ""}`
    );
  } else {
    // No sorting required, use original logic
    for (const story of response) {
      const publishedAt = story.published_at ? new Date(story.published_at) : null;

      // Track the latest published timestamp
      if (publishedAt && (!updatedLatestPublishedAt || publishedAt > updatedLatestPublishedAt)) {
        updatedLatestPublishedAt = publishedAt;
      }

      setStoryInStore(store, story as StoryblokStory, config, context);
    }

    logger.info(
      `[${collection}] Processed ${response.length} stories${contentType ? ` for content type "${contentType}"` : ""}`
    );
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
  context: LoaderContext
): void {
  const { logger, collection } = context;

  logger.debug(
    `[${collection}] Storing story - ID: ${config.useUuids ? story.uuid : story.full_slug}, Title: ${story.name}`
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

/**
 * Parses a Storyblok sort_by parameter into field and direction
 * @param sortBy - The sort parameter (e.g., "created_at:desc", "name:asc")
 * @returns Object with field and direction, or null if invalid
 */
export function parseSortBy(sortBy: string): { field: string; direction: "asc" | "desc" } | null {
  const parts = sortBy.split(":");
  if (parts.length !== 2) return null;

  const [field, direction] = parts;
  if (direction !== "asc" && direction !== "desc") return null;

  return { field, direction };
}

/**
 * Gets the sortable value from a story based on the field
 * @param story - The Storyblok story
 * @param field - The field to get the value for (e.g., "created_at", "name", "slug")
 * @returns The sortable value or null if not found
 */
export function getSortableValue(story: ISbStoryData, field: string): Date | string | number | null {
  switch (field) {
    case "created_at":
      return story.created_at ? new Date(story.created_at) : null;
    case "published_at":
      return story.published_at ? new Date(story.published_at) : null;
    case "first_published_at":
      return story.first_published_at ? new Date(story.first_published_at) : null;
    case "updated_at":
      return story.updated_at ? new Date(story.updated_at) : null;
    case "name":
      return story.name?.toLowerCase() || "";
    case "slug":
      return story.slug?.toLowerCase() || "";
    default:
      // Handle custom fields from story content
      return story.content && typeof story.content === "object" && field in story.content ? story.content[field] : null;
  }
}

/**
 * Compares two stories based on the sort parameters
 * @param storyA - First story to compare
 * @param storyB - Second story to compare
 * @param sortBy - The sort parameter (e.g., "created_at:desc")
 * @returns Comparison result for Array.sort()
 */
export function compareStories(storyA: ISbStoryData, storyB: ISbStoryData, sortBy: string): number {
  const parsed = parseSortBy(sortBy);
  if (!parsed) return 0;

  const { field, direction } = parsed;
  const valueA = getSortableValue(storyA, field);
  const valueB = getSortableValue(storyB, field);

  // Handle null values (put them at the end)
  if (valueA === null && valueB === null) return 0;
  if (valueA === null) return 1;
  if (valueB === null) return -1;

  let comparison = 0;

  if (valueA instanceof Date && valueB instanceof Date) {
    comparison = valueA.getTime() - valueB.getTime();
  } else if (typeof valueA === "string" && typeof valueB === "string") {
    comparison = valueA.localeCompare(valueB);
  } else {
    // Fallback for other types
    comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
  }

  return direction === "desc" ? -comparison : comparison;
}

/**
 * Sorts an array of stories based on the sort_by parameter
 * @param stories - Array of stories to sort
 * @param sortBy - The sort parameter (e.g., "created_at:desc")
 * @returns Sorted array of stories
 */
export function sortStories(stories: ISbStoryData[], sortBy?: string): ISbStoryData[] {
  if (!sortBy || !stories.length) return stories;

  return [...stories].sort((a, b) => compareStories(a, b, sortBy));
}

/**
 * Sorts an array of stories using either a custom sort function or standard sorting
 * @param stories - Array of stories to sort
 * @param sortConfig - Sort configuration object with type and function/parameter
 * @returns Sorted array of stories
 */
export function sortStoriesWithConfig(
  stories: ISbStoryData[],
  sortConfig: { type: "custom" | "standard" | "none"; sortFunction?: StorySortFunction; sortBy?: string }
): ISbStoryData[] {
  if (!stories.length || sortConfig.type === "none") return stories;

  if (sortConfig.type === "custom" && sortConfig.sortFunction) {
    return [...stories].sort(sortConfig.sortFunction);
  }

  if (sortConfig.type === "standard" && sortConfig.sortBy) {
    return sortStories(stories, sortConfig.sortBy);
  }

  return stories;
}

/**
 * Gets the effective sorting configuration from config, with priority:
 * 1. config.customSort (if provided)
 * 2. config.sortBy
 * 3. config.storyblokParams?.sort_by
 */
export function getEffectiveSortConfig(config: StoryblokLoaderStoriesConfig): {
  type: "custom" | "standard" | "none";
  sortFunction?: StorySortFunction;
  sortBy?: string;
} {
  if (config.customSort) {
    return { type: "custom", sortFunction: config.customSort };
  }

  const sortBy = config.sortBy || config.storyblokParams?.sort_by;
  if (sortBy) {
    return { type: "standard", sortBy };
  }

  return { type: "none" };
}

/**
 * Gets the effective sort_by parameter from configuration, giving priority to
 * the new sortBy property in the common config over the storyblokParams.sort_by
 */
export function getEffectiveSortBy(config: StoryblokLoaderStoriesConfig): string | undefined {
  // Priority: config.sortBy > config.storyblokParams?.sort_by
  return config.sortBy || config.storyblokParams?.sort_by;
}

/**
 * Creates a helper configuration function for easier migration from deprecated API
 */
export function createStoriesConfig(
  config: Omit<StoryblokLoaderStoriesConfig, "storyblokParams">,
  storyblokParams?: ISbStoriesParams
): StoryblokLoaderStoriesConfig {
  return {
    ...config,
    storyblokParams,
  };
}

export function checkStoredVersionUpToDate(
  meta: MetaStore,
  logger: AstroIntegrationLogger,
  collection: string,
  cacheVersion?: number
): boolean {
  // Try and read the last cache version from meta
  const metaCvEntry = meta.get("cacheVersion");
  const metaCv = metaCvEntry ? parseInt(metaCvEntry, 10) : undefined;
  if (metaCv && !isNaN(metaCv)) {
    logger.debug(`[${collection}] Cached collection's CV value: '${metaCv}' (${timeAgo(new Date(metaCv * 1000))}).`);

    if (metaCv === cacheVersion) {
      logger.info(
        `[${collection}] No changes detected compared to cached version from ${timeAgo(new Date(metaCv * 1000))}.`
      );
      return true;
    }
  }

  return false;
}
