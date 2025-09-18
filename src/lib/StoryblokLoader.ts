import type { DataStore, Loader } from "astro/loaders";
import { storyblokInit, apiPlugin, type ISbConfig } from "@storyblok/js";
import moment from "moment";

export enum SortBy {
  CREATED_AT_ASC = "created_at:asc",
  CREATED_AT_DESC = "created_at:desc",
  NAME_ASC = "name:asc",
  NAME_DESC = "name:desc",
  SLUG_ASC = "slug:asc",
  SLUG_DESC = "slug:desc",
  UPDATED_AT_ASC = "updated_at:asc",
  UPDATED_AT_DESC = "updated_at:desc",
}

export interface StoryblokLoaderConfig {
  accessToken: string;
  apiOptions?: ISbConfig;

  /** Content types to filter by */
  contentTypes?: string[];

  /** Exclude stories by specifying comma-separated values of `full_slug`. It is possible to specify wildcards by using `*`. */
  excludingSlugs?: string;

  sortBy?: SortBy;

  version: "draft" | "published";

  /** Use the story's `uuid` instead of `full-slug` for collection entry IDs */
  useUuids?: boolean;
}

export const StoryblokLoader = (config: StoryblokLoaderConfig): Loader => {
  const { storyblokApi } = storyblokInit({
    accessToken: config.accessToken,
    apiOptions: config.apiOptions,
    use: [apiPlugin],
  });
  return {
    name: "astro-loader-storyblok",
    load: async ({ store, meta, logger, refreshContextData, collection }) => {
      if (!storyblokApi) {
        throw new Error(`storyblokApi is not loaded`);
      }
      // Handle updated stories
      if (refreshContextData?.story) {
        logger.info("Syncing... story updated in Storyblok");
        const updatedStory = refreshContextData.story as any; // Improve type if possible
        setStoryInStore(store, updatedStory);
        return; // Early return to avoid unnecessary processing
      }

      logger.info(`Loading stories for "${collection}"`);

      const storedLastPublishedAt = meta.get("lastPublishedAt");
      const otherParams =
        storedLastPublishedAt && config.version === "published" ? { published_at_gt: storedLastPublishedAt } : {};

      // Clear the store before repopulating
      if (config.version === "draft") {
        logger.info(`Clearing store for "${collection}"`);
        store.clear();
      }

      let latestPublishedAt = storedLastPublishedAt ? new Date(storedLastPublishedAt) : null;

      for (const contentType of config.contentTypes || [undefined]) {
        const { data } = await storyblokApi.get("cdn/stories", {
          version: config.version,
          content_type: contentType,
          excluding_slugs: config.excludingSlugs,
          sort_by: config.sortBy,
          ...otherParams,
        });

        const contentTypeInfo = contentType ? ` for content type "${contentType}"` : "";

        // Log the time of the latest update from Storyblok API's response
        const timeAgo = moment(Number(data.cv) * 1000).fromNow();
        logger.info(`Loaded ${data.stories.length} stories${contentTypeInfo} (updated ${timeAgo})`);

        for (const story of data.stories) {
          const publishedAt = story.published_at ? new Date(story.published_at) : null;
          if (publishedAt && (!latestPublishedAt || publishedAt > latestPublishedAt)) {
            latestPublishedAt = publishedAt;
          }

          setStoryInStore(store, story);
        }

        // Update meta if new stories are found
        if (latestPublishedAt) {
          meta.set("lastPublishedAt", latestPublishedAt.toISOString());
        }
      }
    },
  };

  function setStoryInStore(store: DataStore, updatedStory: any) {
    store.set({
      data: updatedStory,
      id: config.useUuids ? updatedStory.uuid : updatedStory.full_slug,
    });
  }
};
