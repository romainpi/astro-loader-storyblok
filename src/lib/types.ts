import type { ISbConfig, ISbStoriesParams, ISbStoryData } from "@storyblok/js";
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
export interface StoryblokLoaderStoriesParameters {
  /** Use the story's `uuid` instead of `full-slug` for collection entry IDs */
  useUuids?: boolean;

  /** Content types to filter by. When undefined, the loader will fetch all stories regardless of content type. */
  contentTypes?: string[];

  storyblokParams?: ISbStoriesParams;
}

export interface StoryblokLoaderStoriesConfig extends StoryblokLoaderCommonConfig, StoryblokLoaderStoriesParameters {}

/**
 * Query parameters for retrieving datasource entries from Storyblok.
 *
 * @interface StoryblokLoaderDatasourceQueryParams
 * @property {string} datasource - The name or slug of the datasource to query
 * @property {string} [dimension] - Optional dimension parameter to filter datasource entries by specific criteria
 */
interface StoryblokLoaderDatasourceQueryParams {
  // ^ This interface exists because it's not been defined by Storyblok's SDK yet like it is for ISbStoriesParams

  /** The name or slug of the datasource to query */
  datasource: string;

  /** Optional dimension parameter to filter datasource entries by specific criteria */
  dimension?: string;
}

export interface StoryblokLoaderDatasourceParameters extends StoryblokLoaderDatasourceQueryParams {
  switchNamesAndValues?: boolean;
}

/**
 * Configuration for the Storyblok Datasource loader
 */
export interface StoryblokLoaderDatasourceConfig
  extends StoryblokLoaderCommonConfig,
    StoryblokLoaderDatasourceParameters {}

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
export const DatasourceEntrySchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  value: z.string().optional(),
  dimension_value: z.string().nullable().optional(),
});
