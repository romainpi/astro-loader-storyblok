/**
 * Storyblok default sorting options.
 *
 * These values correspond to the standard sorting parameters supported by the Storyblok API
 * for ordering content entries in API responses.
 *
 * @enum {string}
 */
export enum SortByEnum {
  CREATED_AT_ASC = "created_at:asc",
  CREATED_AT_DESC = "created_at:desc",
  FIRST_PUBLISHED_AT_ASC = "first_published_at:asc",
  FIRST_PUBLISHED_AT_DESC = "first_published_at:desc",
  NAME_ASC = "name:asc",
  NAME_DESC = "name:desc",
  PUBLISHED_AT_ASC = "published_at:asc",
  PUBLISHED_AT_DESC = "published_at:desc",
  SLUG_ASC = "slug:asc",
  SLUG_DESC = "slug:desc",
  UPDATED_AT_ASC = "updated_at:asc",
  UPDATED_AT_DESC = "updated_at:desc",
}
