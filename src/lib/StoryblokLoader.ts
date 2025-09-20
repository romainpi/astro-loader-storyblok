import type { DataStore, Loader } from "astro/loaders";
import { storyblokInit, apiPlugin, type ISbStoryData, type ISbStoriesParams } from "@storyblok/js";
import type { StoryblokLoaderStoriesConfig } from "./types";


export const StoryblokLoaderStories = (
  config: StoryblokLoaderStoriesConfig,
  storyblokParams?: ISbStoriesParams
): Loader => {
  const { storyblokApi } = storyblokInit({
    accessToken: config.accessToken,
    apiOptions: config.apiOptions,
    use: [apiPlugin],
  });
  return {
    name: "astro-loader-storyblok-stories",
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
        storedLastPublishedAt && storyblokParams?.version === "draft" ? {} : { published_at_gt: storedLastPublishedAt };

      // Clear the store before repopulating
      if (storyblokParams?.version === "draft") {
        logger.info(`Clearing store for "${collection}"`);
        store.clear();
      }

      let latestPublishedAt = storedLastPublishedAt ? new Date(storedLastPublishedAt) : null;

      // Convert `config` into an object containing only the properies of ISbStoriesParams
      // to avoid passing unsupported params to the Storyblok API

      // If no content types are specified, fetch all stories with content_type = undefined
      for (const contentType of config.contentTypes || [undefined]) {
        const apiResponse = (await storyblokApi.getAll("cdn/stories", {
          content_type: contentType,
          ...storyblokParams,
          ...otherParams,
        })) as Array<ISbStoryData>;

        // Log the time of the latest update from Storyblok API's response
        // Note: storyblokApi.getAll does not return 'cv' (storyblokApi.get does)
        /*
        const contentTypeInfo = contentType ? ` for content type "${contentType}"` : "";
        const lastUpdate = timeAgo(new Date(Number(apiResponse.data.cv) * 1000));
        logger.info(`Loaded ${apiResponse.data.stories.length} stories${contentTypeInfo} (updated ${lastUpdate})`);
        */

        for (const story of apiResponse) {
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
