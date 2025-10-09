import type { Loader, LoaderContext } from "astro/loaders";
import {
  DatasourceEntrySchema,
  type StoryblokLoaderCommonConfig,
  type StoryblokLoaderDatasourceParameters,
  type StoryblokLoaderStoriesParameters,
} from "./types";
import { createStoryblokClient, timeAgo } from "./utils";
import { storyblokLoaderDatasourceImplem } from "./StoryblokLoaderDatasource";
import type { StoryblokClient } from "@storyblok/js";
import { storyblokLoaderStoriesImplem } from "./StoryblokLoaderStories";
import { CacheVersionUpdatePromise } from "./CacheVersionUpdatePromise";

export class StoryblokLoader {
  private commonConfig: StoryblokLoaderCommonConfig;
  private storyblokApi: StoryblokClient;

  /** Cache version announced by API */
  private cv?: number;

  /** Promise for checking cache version */
  private checkingCvPromise: CacheVersionUpdatePromise | null = null;

  constructor(config: StoryblokLoaderCommonConfig) {
    this.commonConfig = config;
    this.storyblokApi = createStoryblokClient(config);

    this.cv = undefined;
  }

  public getDatasourceLoader(config: StoryblokLoaderDatasourceParameters): Loader {
    // Return an instance of the Datasource loader
    return {
      name: "loader-storyblok-datasource",
      load: async (context) => {
        await this.updateCacheVersionValue(context);

        return storyblokLoaderDatasourceImplem(
          { ...this.commonConfig, ...config },
          this.storyblokApi,
          context,
          this.cv
        );
      },
      schema: DatasourceEntrySchema,
    };
  }

  public getStoriesLoader(config: StoryblokLoaderStoriesParameters): Loader {
    // Return an instance of the Stories loader
    return {
      name: "loader-storyblok-stories",
      load: async (context) => {
        await this.updateCacheVersionValue(context);

        return storyblokLoaderStoriesImplem({ ...this.commonConfig, ...config }, this.storyblokApi, context, this.cv);
      },
    };
  }

  private async updateCacheVersionValue(context: LoaderContext): Promise<void> {
    const { logger, collection } = context;

    if (this.checkingCvPromise === null) {
      logger.debug(`[${collection}] Fetching space's latest CV value from Storyblok...`);
      this.checkingCvPromise = new CacheVersionUpdatePromise(this.storyblokApi, context);

      try {
        this.cv = await this.checkingCvPromise;

        logger.debug(
          `[${collection}] Fetched space's latest CV value: '${this.cv}' (${timeAgo(
            new Date(this.cv * 1000)
          )}) from Storyblok.`
        );
      } catch (error) {
        logger.error(`[${collection}] Failed updating CV value. Fetching error: ${error}`);
      } finally {
        this.checkingCvPromise = null;
      }
    } else {
      const collectionName = this.checkingCvPromise.getCollection();

      logger.debug(`[${collection}] Waiting for '${collectionName}' to complete updating the CV value ...`);

      await this.checkingCvPromise;

      logger.debug(`[${collection}] Finished waiting for '${collectionName}'.`);

      return;
    }
  }
}
