import type { ISbConfig, ISbStoryData } from "@storyblok/js";
import type { DatasourceEntry } from "@storyblok/management-api-client/resources/datasource_entries";
import { z } from "astro/zod";

/**
 * Common configuration shared between all Storyblok loaders
 */
export interface StoryblokLoaderCommonConfig {
  /**
   * Storyblok Content Delivery API access token.
   * @see {@link https://www.storyblok.com/docs/api/content-delivery/v2/getting-started/authentication | Storyblok Docs: Authentication}
   * @see {@link https://www.storyblok.com/docs/concepts/access-tokens | Storyblok Docs: Access Tokens}
   */
  accessToken: string;

  /**
   * `config` options object to pass to the Storyblok JS SDK instance.
   * @see {@link https://github.com/storyblok/storyblok-js-client#class-storyblok | `storyblok-js-client` Docs}
   */
  apiOptions?: ISbConfig;
}

/**
 * Configuration for the Storyblok Stories loader
 */
export interface StoryblokLoaderStoriesConfig extends StoryblokLoaderCommonConfig {
  /** Use the story's `uuid` instead of `full-slug` for collection entry IDs */
  useUuids?: boolean;

  /** Content types to filter by. When undefined, the loader will fetch all stories regardless of content type. */
  contentTypes?: string[];
}

/**
 * Query parameters for Storyblok Datasource API
 */
interface StoryblokLoaderDatasourceQueryParams {
  datasource: string;
  dimension?: string;
}

/**
 * Configuration for the Storyblok Datasource loader
 */
export interface StoryblokLoaderDatasourceConfig
  extends StoryblokLoaderCommonConfig,
    StoryblokLoaderDatasourceQueryParams {
  switchNamesAndValues?: boolean;
}

/**
 * Extended story type with proper typing for refreshContextData
 */
export interface StoryblokStory extends ISbStoryData {
  [key: string]: any; // Add index signature for DataStore compatibility
}

/**
 * Storyblok API response structure for datasource entries
 */
export interface StoryblokDatasourceResponse {
  datasource_entries: Array<DatasourceEntry>;
  cv: number;
}

// TODO: Add a test that checks that DatasourceEntry from "@storyblok/management-api-client/resources/datasource_entries"
// and DatasourceEntrySchema defined here are in sync
// to avoid future discrepancies when the external type changes.
// This could be done with a unit test that imports both and compares their keys and types.
const DatasourceEntrySchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  value: z.string().optional(),
  dimension_value: z.string().nullable().optional(),
  datasource_id: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const DatasourceSchema = z.object({
  id: z.string().min(0).max(1000),
  body: z.string().optional(),
  data: DatasourceEntrySchema,
});
