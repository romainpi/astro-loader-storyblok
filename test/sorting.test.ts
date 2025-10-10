import { describe, it, expect } from "vitest";
import {
  parseSortBy,
  getSortableValue,
  compareStories,
  sortStories,
  getEffectiveSortBy,
  createStoriesConfig,
} from "../src/lib/utils";
import { createMockStory } from "./mocks";
import type { StoryblokLoaderStoriesConfig } from "../src/lib/types";
import { SortByEnum } from "../src/lib/enums";

describe("Sorting Utilities", () => {
  describe("parseSortBy", () => {
    it("should parse valid sort_by parameters", () => {
      expect(parseSortBy("created_at:asc")).toEqual({ field: "created_at", direction: "asc" });
      expect(parseSortBy("published_at:desc")).toEqual({ field: "published_at", direction: "desc" });
      expect(parseSortBy("name:asc")).toEqual({ field: "name", direction: "asc" });
    });

    it("should return null for invalid sort_by parameters", () => {
      expect(parseSortBy("invalid")).toBeNull();
      expect(parseSortBy("created_at:invalid")).toBeNull();
      expect(parseSortBy("")).toBeNull();
      expect(parseSortBy("field:asc:extra")).toBeNull();
    });
  });

  describe("getSortableValue", () => {
    const testStory = createMockStory({
      created_at: "2024-01-15T10:00:00.000Z",
      published_at: "2024-01-20T10:00:00.000Z",
      first_published_at: "2024-01-18T10:00:00.000Z",
      updated_at: "2024-01-22T10:00:00.000Z",
      name: "Test Story Name",
      slug: "test-story-slug",
      content: {
        component: "page",
        custom_field: "custom_value",
      },
    });

    it("should extract date values correctly", () => {
      expect(getSortableValue(testStory, "created_at")).toEqual(new Date("2024-01-15T10:00:00.000Z"));
      expect(getSortableValue(testStory, "published_at")).toEqual(new Date("2024-01-20T10:00:00.000Z"));
      expect(getSortableValue(testStory, "first_published_at")).toEqual(new Date("2024-01-18T10:00:00.000Z"));
      expect(getSortableValue(testStory, "updated_at")).toEqual(new Date("2024-01-22T10:00:00.000Z"));
    });

    it("should extract string values correctly", () => {
      expect(getSortableValue(testStory, "name")).toBe("test story name"); // lowercase
      expect(getSortableValue(testStory, "slug")).toBe("test-story-slug");
    });

    it("should return null for missing dates", () => {
      const storyWithoutDates = createMockStory({
        created_at: undefined,
        published_at: undefined,
        first_published_at: undefined,
        updated_at: undefined,
      });

      expect(getSortableValue(storyWithoutDates, "created_at")).toBeNull();
      expect(getSortableValue(storyWithoutDates, "published_at")).toBeNull();
    });

    it("should extract custom field values", () => {
      expect(getSortableValue(testStory, "custom_field")).toBe("custom_value");
    });

    it("should return null for unknown fields", () => {
      expect(getSortableValue(testStory, "unknown_field")).toBeNull();
    });
  });

  describe("compareStories", () => {
    const story1 = createMockStory({
      id: 1,
      name: "Alpha Story",
      created_at: "2024-01-10T10:00:00.000Z",
      published_at: "2024-01-15T10:00:00.000Z",
    });

    const story2 = createMockStory({
      id: 2,
      name: "Beta Story",
      created_at: "2024-01-20T10:00:00.000Z",
      published_at: "2024-01-25T10:00:00.000Z",
    });

    it("should sort by created_at ascending", () => {
      expect(compareStories(story1, story2, "created_at:asc")).toBeLessThan(0);
      expect(compareStories(story2, story1, "created_at:asc")).toBeGreaterThan(0);
    });

    it("should sort by created_at descending", () => {
      expect(compareStories(story1, story2, "created_at:desc")).toBeGreaterThan(0);
      expect(compareStories(story2, story1, "created_at:desc")).toBeLessThan(0);
    });

    it("should sort by name ascending", () => {
      expect(compareStories(story1, story2, "name:asc")).toBeLessThan(0);
      expect(compareStories(story2, story1, "name:asc")).toBeGreaterThan(0);
    });

    it("should sort by name descending", () => {
      expect(compareStories(story1, story2, "name:desc")).toBeGreaterThan(0);
      expect(compareStories(story2, story1, "name:desc")).toBeLessThan(0);
    });

    it("should handle equal values", () => {
      expect(compareStories(story1, story1, "name:asc")).toBe(0);
    });

    it("should handle null values", () => {
      const storyWithNullDate = createMockStory({
        created_at: undefined,
      });

      // Null values should come at the end
      expect(compareStories(story1, storyWithNullDate, "created_at:asc")).toBeLessThan(0);
      expect(compareStories(storyWithNullDate, story1, "created_at:asc")).toBeGreaterThan(0);
    });

    it("should return 0 for invalid sort parameters", () => {
      expect(compareStories(story1, story2, "invalid")).toBe(0);
    });
  });

  describe("sortStories", () => {
    const stories = [
      createMockStory({
        id: 3,
        name: "Zebra Story",
        created_at: "2024-01-30T10:00:00.000Z",
      }),
      createMockStory({
        id: 1,
        name: "Alpha Story",
        created_at: "2024-01-10T10:00:00.000Z",
      }),
      createMockStory({
        id: 2,
        name: "Beta Story",
        created_at: "2024-01-20T10:00:00.000Z",
      }),
    ];

    it("should sort stories by created_at ascending", () => {
      const sorted = sortStories(stories, "created_at:asc");
      expect(sorted.map((s) => s.id)).toEqual([1, 2, 3]);
    });

    it("should sort stories by created_at descending", () => {
      const sorted = sortStories(stories, "created_at:desc");
      expect(sorted.map((s) => s.id)).toEqual([3, 2, 1]);
    });

    it("should sort stories by name ascending", () => {
      const sorted = sortStories(stories, "name:asc");
      expect(sorted.map((s) => s.name)).toEqual(["Alpha Story", "Beta Story", "Zebra Story"]);
    });

    it("should return original array when no sort parameter", () => {
      const sorted = sortStories(stories);
      expect(sorted).toEqual(stories);
    });

    it("should return original array for empty array", () => {
      const sorted = sortStories([], "created_at:asc");
      expect(sorted).toEqual([]);
    });

    it("should not mutate original array", () => {
      const originalOrder = stories.map((s) => s.id);
      sortStories(stories, "created_at:asc");
      expect(stories.map((s) => s.id)).toEqual(originalOrder);
    });
  });

  describe("getEffectiveSortBy", () => {
    it("should prioritize config.sortBy over storyblokParams.sort_by", () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        sortBy: "name:asc",
        storyblokParams: {
          sort_by: "created_at:desc",
        },
      };

      expect(getEffectiveSortBy(config)).toBe("name:asc");
    });

    it("should use storyblokParams.sort_by when config.sortBy is not set", () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        storyblokParams: {
          sort_by: "created_at:desc",
        },
      };

      expect(getEffectiveSortBy(config)).toBe("created_at:desc");
    });

    it("should return undefined when neither is set", () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
      };

      expect(getEffectiveSortBy(config)).toBeUndefined();
    });
  });

  describe("createStoriesConfig", () => {
    it("should merge config with storyblok parameters", () => {
      const baseConfig = {
        accessToken: "test-token",
        contentTypes: ["blog-post"],
        useUuids: true,
      };

      const storyblokParams = {
        version: "draft" as const,
        sort_by: SortByEnum.CREATED_AT_DESC,
      };

      const result = createStoriesConfig(baseConfig, storyblokParams);

      expect(result).toEqual({
        accessToken: "test-token",
        contentTypes: ["blog-post"],
        useUuids: true,
        storyblokParams: {
          version: "draft",
          sort_by: SortByEnum.CREATED_AT_DESC,
        },
      });
    });

    it("should work without storyblokParams", () => {
      const baseConfig = {
        accessToken: "test-token",
        contentTypes: ["blog-post"],
      };

      const result = createStoriesConfig(baseConfig);

      expect(result).toEqual({
        accessToken: "test-token",
        contentTypes: ["blog-post"],
        storyblokParams: undefined,
      });
    });
  });
});
