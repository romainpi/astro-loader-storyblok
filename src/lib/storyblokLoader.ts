import type { DataStore, Loader } from "astro/loaders";
import { storyblokInit, apiPlugin, type ISbConfig } from "@storyblok/js";

interface StoryblokLoaderConfig {
  accessToken: string;
  apiOptions?: ISbConfig;
  version: "draft" | "published";

  /** Use the story's `uuid` instead of `full-slug` for collection entry IDs */
  useUuids?: boolean;
}

export function storyblokLoader(config: StoryblokLoaderConfig): Loader {
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

      const { data } = await storyblokApi.get("cdn/stories", {
        version: config.version,
        ...otherParams,
      });

      const stories = data.stories;
      logger.info(`total = ${stories.length}`);

      // Clear the store before repopulating
      if (config.version === "draft") {
        logger.info(`Clearing store for "${collection}"`);
        store.clear();
      }

      let latestPublishedAt = storedLastPublishedAt ? new Date(storedLastPublishedAt) : null;

      for (const story of stories) {
        const publishedAt = story.published_at ? new Date(story.published_at) : null;
        if (publishedAt && (!latestPublishedAt || publishedAt > latestPublishedAt)) {
          latestPublishedAt = publishedAt;
        }

        setStoryInStore(store, story);

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
}
