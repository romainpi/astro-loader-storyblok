import type { DataStore, Loader } from "astro/loaders";
import { storyblokInit, apiPlugin, type ISbConfig } from "@storyblok/js";

/** Simple utility to format time ago without external dependencies */
function timeAgo(date: Date): string {
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

/** Storyblok default sorting options */
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
  /**
   * Storyblok Content Delivery API access token.
   * @see {@link https://www.storyblok.com/docs/api/content-delivery/v2/getting-started/authentication | Storyblok Docs: Authentication}
   * @see {@link https://www.storyblok.com/docs/concepts/access-tokens | Storyblok Docs: Access Tokens}
   */
  accessToken: string;

  /** Access `draft` or `published` content. Default is `published`. */
  version?: "draft" | "published";

  /**
   * `config` options object to pass to the Storyblok JS SDK instance.
   * @see {@link https://github.com/storyblok/storyblok-js-client#class-storyblok | `storyblok-js-client` Docs}
   */
  apiOptions?: ISbConfig;

  /** Content types to filter by. When undefined, the loader will fetch all stories regardless of content type. */
  contentTypes?: string[];

  /** Exclude stories by specifying comma-separated values of `full_slug`. It is possible to specify wildcards by using `*`. */
  excludingSlugs?: string;

  /** Sort stories in ascending or descending order by a specific property. Possible properties are all default story
   * properties and any custom fields defined in the schema of the story type.
   *
   * You can use the `SortBy` enum for default Storyblok sorting options, or provide a custom string.
   * @see https://www.storyblok.com/docs/api/content-delivery/v2/stories/retrieve-multiple-stories
   * */
  sortBy?: SortBy | string;

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
        storedLastPublishedAt && config.version === "draft" ? {} : { published_at_gt: storedLastPublishedAt };

      // Clear the store before repopulating
      if (config.version === "draft") {
        logger.info(`Clearing store for "${collection}"`);
        store.clear();
      }

      let latestPublishedAt = storedLastPublishedAt ? new Date(storedLastPublishedAt) : null;

      // If no content types are specified, fetch all stories with content_type = undefined
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
        const lastUpdate = timeAgo(new Date(Number(data.cv) * 1000));
        logger.info(`Loaded ${data.stories.length} stories${contentTypeInfo} (updated ${lastUpdate})`);

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
