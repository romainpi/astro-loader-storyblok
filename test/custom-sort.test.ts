import { describe, it, expect } from "vitest";
import { getEffectiveSortConfig, sortStoriesWithConfig } from "../src/lib/utils";
import { createMockStory, MockDataStore, mockLogger } from "./mocks";
import { processStoriesResponse } from "../src/lib/utils";
import type { StoryblokLoaderStoriesConfig, StorySortFunction } from "../src/lib/types";
import { SortByEnum } from "../src/lib/enums";

describe("Custom Sort Function Tests", () => {
  describe("getEffectiveSortConfig", () => {
    it("should prioritize customSort over sortBy", () => {
      const customSort: StorySortFunction = (a, b) => a.name.localeCompare(b.name);
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        customSort,
        sortBy: SortByEnum.CREATED_AT_DESC,
      };

      const result = getEffectiveSortConfig(config);
      
      expect(result.type).toBe("custom");
      expect(result.sortFunction).toBe(customSort);
      expect(result.sortBy).toBeUndefined();
    });

    it("should prioritize customSort over storyblokParams.sort_by", () => {
      const customSort: StorySortFunction = (a, b) => a.name.localeCompare(b.name);
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        customSort,
        storyblokParams: {
          sort_by: SortByEnum.CREATED_AT_DESC,
        },
      };

      const result = getEffectiveSortConfig(config);
      
      expect(result.type).toBe("custom");
      expect(result.sortFunction).toBe(customSort);
    });

    it("should fallback to sortBy when no customSort", () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        sortBy: SortByEnum.CREATED_AT_DESC,
      };

      const result = getEffectiveSortConfig(config);
      
      expect(result.type).toBe("standard");
      expect(result.sortBy).toBe(SortByEnum.CREATED_AT_DESC);
      expect(result.sortFunction).toBeUndefined();
    });

    it("should fallback to storyblokParams.sort_by when no customSort or sortBy", () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        storyblokParams: {
          sort_by: SortByEnum.NAME_ASC,
        },
      };

      const result = getEffectiveSortConfig(config);
      
      expect(result.type).toBe("standard");
      expect(result.sortBy).toBe(SortByEnum.NAME_ASC);
    });

    it("should return none when no sorting configuration", () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
      };

      const result = getEffectiveSortConfig(config);
      
      expect(result.type).toBe("none");
      expect(result.sortFunction).toBeUndefined();
      expect(result.sortBy).toBeUndefined();
    });
  });

  describe("sortStoriesWithConfig", () => {
    const stories = [
      createMockStory({
        id: 1,
        name: "Charlie Story",
        created_at: "2024-01-15T10:00:00.000Z",
        content: { component: "page", priority: 3 },
      }),
      createMockStory({
        id: 2,
        name: "Alpha Story",
        created_at: "2024-01-10T10:00:00.000Z",
        content: { component: "page", priority: 1 },
      }),
      createMockStory({
        id: 3,
        name: "Beta Story",
        created_at: "2024-01-20T10:00:00.000Z",
        content: { component: "page", priority: 2 },
      }),
    ];

    it("should use custom sort function when type is custom", () => {
      const customSort: StorySortFunction = (a, b) => {
        const priorityA = a.content?.priority || 0;
        const priorityB = b.content?.priority || 0;
        return priorityB - priorityA; // Higher priority first
      };

      const result = sortStoriesWithConfig(stories, {
        type: "custom",
        sortFunction: customSort,
      });

      expect(result.map(s => s.id)).toEqual([1, 3, 2]); // Priority: 3, 2, 1
    });

    it("should use standard sorting when type is standard", () => {
      const result = sortStoriesWithConfig(stories, {
        type: "standard",
        sortBy: "name:asc",
      });

      expect(result.map(s => s.name)).toEqual(["Alpha Story", "Beta Story", "Charlie Story"]);
    });

    it("should return original array when type is none", () => {
      const result = sortStoriesWithConfig(stories, {
        type: "none",
      });

      expect(result).toEqual(stories);
    });

    it("should return original array when custom sort function is missing", () => {
      const result = sortStoriesWithConfig(stories, {
        type: "custom",
        // No sortFunction provided
      });

      expect(result).toEqual(stories);
    });

    it("should return original array when standard sort parameter is missing", () => {
      const result = sortStoriesWithConfig(stories, {
        type: "standard",
        // No sortBy provided
      });

      expect(result).toEqual(stories);
    });

    it("should not mutate the original array", () => {
      const originalOrder = stories.map(s => s.id);
      
      sortStoriesWithConfig(stories, {
        type: "custom",
        sortFunction: (a, b) => b.id - a.id,
      });

      expect(stories.map(s => s.id)).toEqual(originalOrder);
    });
  });

  describe("processStoriesResponse with custom sort", () => {
    it("should use custom sort function for incremental updates", () => {
      const store = new MockDataStore();
      
      // Custom sort: Sort by a custom priority field (higher priority first)
      const customSort: StorySortFunction = (a, b) => {
        const priorityA = a.content?.priority || 0;
        const priorityB = b.content?.priority || 0;
        return priorityB - priorityA;
      };

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        customSort,
      };

      // Add existing stories to store
      const existingStories = [
        createMockStory({
          id: 1,
          full_slug: "blog/existing-high",
          content: { component: "blog-post", priority: 5 },
        }),
        createMockStory({
          id: 2,
          full_slug: "blog/existing-low",
          content: { component: "blog-post", priority: 1 },
        }),
      ];

      existingStories.forEach((story) => {
        store.set({
          id: story.full_slug,
          data: story,
        });
      });

      // New stories with medium priority
      const newStories = [
        createMockStory({
          id: 3,
          full_slug: "blog/new-medium",
          content: { component: "blog-post", priority: 3 },
        }),
      ];

      processStoriesResponse(
        newStories,
        store,
        mockLogger,
        "test-collection",
        "blog-post",
        null,
        config
      );

      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);
      
      // Should be sorted by priority: 5, 3, 1
      expect(finalEntries).toHaveLength(3);
      expect(finalEntries[0].id).toBe(1); // Priority 5
      expect(finalEntries[1].id).toBe(3); // Priority 3 (new entry in correct position)
      expect(finalEntries[2].id).toBe(2); // Priority 1
    });

    it("should handle custom sort with complex logic", () => {
      const store = new MockDataStore();
      
      // Custom sort: First by category, then by date within category
      const customSort: StorySortFunction = (a, b) => {
        const categoryA = a.content?.category || "zzz";
        const categoryB = b.content?.category || "zzz";
        
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB);
        }
        
        // Same category: sort by date descending
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      };

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        customSort,
      };

      const existingStories = [
        createMockStory({
          id: 1,
          full_slug: "blog/news-old",
          created_at: "2024-01-01T10:00:00.000Z",
          content: { component: "post", category: "news" },
        }),
        createMockStory({
          id: 2,
          full_slug: "blog/tech-old",
          created_at: "2024-01-01T10:00:00.000Z", 
          content: { component: "post", category: "tech" },
        }),
      ];

      existingStories.forEach((story) => {
        store.set({
          id: story.full_slug,
          data: story,
        });
      });

      const newStories = [
        createMockStory({
          id: 3,
          full_slug: "blog/news-new",
          created_at: "2024-01-15T10:00:00.000Z",
          content: { component: "post", category: "news" },
        }),
      ];

      processStoriesResponse(
        newStories,
        store,
        mockLogger,
        "test-collection",
        "post",
        null,
        config
      );

      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);
      
      // Should be: news (newest first), then tech
      expect(finalEntries).toHaveLength(3);
      expect(finalEntries[0].id).toBe(3); // News category, newest date
      expect(finalEntries[1].id).toBe(1); // News category, older date
      expect(finalEntries[2].id).toBe(2); // Tech category
    });

    it("should handle custom sort that returns 0 for equal items", () => {
      const store = new MockDataStore();
      
      const customSort: StorySortFunction = (a, b) => {
        const priorityA = a.content?.priority || 0;
        const priorityB = b.content?.priority || 0;
        return priorityB - priorityA;
      };

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        customSort,
      };

      const existingStories = [
        createMockStory({
          id: 1,
          full_slug: "blog/first",
          content: { component: "post", priority: 1 },
        }),
      ];

      existingStories.forEach((story) => {
        store.set({
          id: story.full_slug,
          data: story,
        });
      });

      const newStories = [
        createMockStory({
          id: 2,
          full_slug: "blog/second",
          content: { component: "post", priority: 1 }, // Same priority
        }),
      ];

      expect(() => {
        processStoriesResponse(
          newStories,
          store,
          mockLogger,
          "test-collection",
          "post",
          null,
          config
        );
      }).not.toThrow();

      expect(store.size()).toBe(2);
    });

    it("should prioritize custom sort over sortBy parameter", () => {
      const store = new MockDataStore();
      
      const customSort: StorySortFunction = (a, b) => {
        return a.name.localeCompare(b.name); // Sort by name ascending
      };

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        customSort,
        sortBy: SortByEnum.CREATED_AT_DESC, // This should be ignored
      };

      const existingStories = [
        createMockStory({
          id: 1,
          name: "Zebra Story",
          full_slug: "blog/zebra",
          created_at: "2024-02-01T10:00:00.000Z", // Older
        }),
      ];

      existingStories.forEach((story) => {
        store.set({
          id: story.full_slug,
          data: story,
        });
      });

      const newStories = [
        createMockStory({
          id: 2,
          name: "Alpha Story",
          full_slug: "blog/alpha", 
          created_at: "2024-01-01T10:00:00.000Z", // Even older, but should come first by name
        }),
      ];

      processStoriesResponse(
        newStories,
        store,
        mockLogger,
        "test-collection",
        undefined,
        null,
        config
      );

      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);
      
      // Should be sorted by name (Alpha, Zebra), not by creation date
      expect(finalEntries[0].name).toBe("Alpha Story");
      expect(finalEntries[1].name).toBe("Zebra Story");
    });

    it("should handle custom sort function with edge cases", () => {
      const store = new MockDataStore();
      
      // Custom sort function that handles missing properties gracefully
      const customSort: StorySortFunction = (a, b) => {
        const scoreA = a.content?.score ?? -1;
        const scoreB = b.content?.score ?? -1;
        return scoreB - scoreA; // Higher scores first, missing scores last
      };

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        customSort,
      };

      const existingStories = [
        createMockStory({
          id: 1,
          full_slug: "blog/no-score",
          content: { component: "post" }, // No score property
        }),
        createMockStory({
          id: 2,
          full_slug: "blog/high-score",
          content: { component: "post", score: 100 },
        }),
      ];

      existingStories.forEach((story) => {
        store.set({
          id: story.full_slug,
          data: story,
        });
      });

      const newStories = [
        createMockStory({
          id: 3,
          full_slug: "blog/medium-score",
          content: { component: "post", score: 50 },
        }),
      ];

      processStoriesResponse(
        newStories,
        store,
        mockLogger,
        "test-collection",
        "post", 
        null,
        config
      );

      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);
      
      // Should be: high score (100), medium score (50), no score (-1)
      expect(finalEntries[0].id).toBe(2); // Score 100
      expect(finalEntries[1].id).toBe(3); // Score 50
      expect(finalEntries[2].id).toBe(1); // No score (treated as -1)
    });

    it("should log custom sort usage correctly", () => {
      const store = new MockDataStore();
      
      const customSort: StorySortFunction = (a, b) => a.id - b.id;
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        customSort,
      };

      const newStories = [createMockStory({ id: 1, full_slug: "blog/test" })];

      processStoriesResponse(
        newStories,
        store,
        mockLogger,
        "test-collection",
        undefined,
        null,
        config
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        "[test-collection] Processed and sorted 1 new stories with 0 existing stories (custom sort)"
      );
    });
  });
});