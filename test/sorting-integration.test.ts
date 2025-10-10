import { describe, it, expect } from "vitest";
import { processStoriesResponse } from "../src/lib/utils";
import { MockDataStore, createMockStory, createLoaderContext } from "./mocks";
import type { StoryblokLoaderStoriesConfig } from "../src/lib/types";
import { SortByEnum } from "../src/lib/enums";

describe("Sorting Bug Fix Integration Tests", () => {
  describe("processStoriesResponse with client-side sorting", () => {
    it("should maintain sort order when adding new entries to cached collection", () => {
      const store = new MockDataStore();

      // Configuration with sorting by created_at descending (newest first)
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        storyblokParams: {
          sort_by: SortByEnum.CREATED_AT_DESC,
        },
      };

      // Simulate initial load: 3 existing stories in correct sorted order (newest to oldest)
      const existingStories = [
        createMockStory({
          id: 1,
          name: "Newest Existing Story",
          full_slug: "blog/newest-existing",
          created_at: "2024-03-01T10:00:00.000Z", // Newest
          content: { component: "blog-post" },
        }),
        createMockStory({
          id: 2,
          name: "Middle Existing Story",
          full_slug: "blog/middle-existing",
          created_at: "2024-02-15T10:00:00.000Z", // Middle
          content: { component: "blog-post" },
        }),
        createMockStory({
          id: 3,
          name: "Oldest Existing Story",
          full_slug: "blog/oldest-existing",
          created_at: "2024-02-01T10:00:00.000Z", // Oldest
          content: { component: "blog-post" },
        }),
      ];

      // Add existing stories to store (simulating initial fetch)
      existingStories.forEach((story) => {
        store.set({
          id: story.full_slug,
          data: story,
        });
      });

      // Simulate incremental update: New story with creation date that should place it in the middle
      const newStories = [
        createMockStory({
          id: 4,
          name: "New Middle Story",
          full_slug: "blog/new-middle",
          created_at: "2024-02-20T10:00:00.000Z", // Should be 2nd in descending order
          content: { component: "blog-post" },
        }),
      ];

      // Process the new stories - this is where the bug was occurring
      const context = createLoaderContext();
      context.collection = "test-collection";
      processStoriesResponse(
        newStories,
        store,
        context,
        "blog-post", // content type filter
        null,
        config
      );

      // Verify the final order is correct
      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);
      const sortedByCreatedAt = finalEntries.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime(); // DESC order
      });

      // The final order should be: Newest (Mar 1) > New Middle (Feb 20) > Middle (Feb 15) > Oldest (Feb 1)
      expect(finalEntries).toHaveLength(4);
      expect(finalEntries.map((s) => s.id)).toEqual(sortedByCreatedAt.map((s) => s.id));

      // Specifically check that the new story is in the correct position (2nd)
      expect(finalEntries[0].id).toBe(1); // Newest existing (Mar 1)
      expect(finalEntries[1].id).toBe(4); // New middle story (Feb 20)
      expect(finalEntries[2].id).toBe(2); // Middle existing (Feb 15)
      expect(finalEntries[3].id).toBe(3); // Oldest existing (Feb 1)
    });

    it("should work correctly with ascending sort order", () => {
      const store = new MockDataStore();

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        sortBy: SortByEnum.CREATED_AT_ASC, // Using new config property
      };

      const existingStories = [
        createMockStory({
          id: 1,
          full_slug: "blog/oldest",
          created_at: "2024-02-01T10:00:00.000Z",
          content: { component: "blog-post" },
        }),
        createMockStory({
          id: 2,
          full_slug: "blog/newest",
          created_at: "2024-03-01T10:00:00.000Z",
          content: { component: "blog-post" },
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
          full_slug: "blog/middle",
          created_at: "2024-02-15T10:00:00.000Z",
          content: { component: "blog-post" },
        }),
      ];

      const context = createLoaderContext();
      context.collection = "test-collection";
      processStoriesResponse(newStories, store, context, "blog-post", null, config);

      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);

      // ASC order should be: Oldest (Feb 1) > Middle (Feb 15) > Newest (Mar 1)
      expect(finalEntries[0].id).toBe(1); // Feb 1
      expect(finalEntries[1].id).toBe(3); // Feb 15 (new entry)
      expect(finalEntries[2].id).toBe(2); // Mar 1
    });

    it("should handle mixed content types correctly", () => {
      const store = new MockDataStore();

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        storyblokParams: {
          sort_by: SortByEnum.CREATED_AT_DESC,
        },
      };

      // Add existing stories of different content types
      const existingBlogPosts = [
        createMockStory({
          id: 1,
          full_slug: "blog/existing-post",
          created_at: "2024-02-15T10:00:00.000Z",
          content: { component: "blog-post" },
        }),
      ];

      const existingNewsArticles = [
        createMockStory({
          id: 2,
          full_slug: "news/existing-article",
          created_at: "2024-02-20T10:00:00.000Z",
          content: { component: "news-article" },
        }),
      ];

      [...existingBlogPosts, ...existingNewsArticles].forEach((story) => {
        store.set({
          id: story.full_slug,
          data: story,
        });
      });

      // Add new blog-post (should only affect blog-post sorting, not news)
      const newBlogPosts = [
        createMockStory({
          id: 3,
          full_slug: "blog/new-post",
          created_at: "2024-02-25T10:00:00.000Z", // Should be newest blog-post
          content: { component: "blog-post" },
        }),
      ];

      const context2 = createLoaderContext();
      context2.collection = "test-collection";
      processStoriesResponse(
        newBlogPosts,
        store,
        context2,
        "blog-post", // Only processing blog-posts
        null,
        config
      );

      const allEntries = Array.from(store.entries()).map(([, entry]) => entry.data);

      // Should have 3 total entries
      expect(allEntries).toHaveLength(3);

      // News article should remain unchanged
      const newsArticle = allEntries.find((entry) => entry.content.component === "news-article");
      expect(newsArticle).toBeDefined();
      expect(newsArticle.id).toBe(2);

      // Blog posts should be sorted correctly
      const blogPosts = allEntries
        .filter((entry) => entry.content.component === "blog-post")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      expect(blogPosts[0].id).toBe(3); // New post (Feb 25)
      expect(blogPosts[1].id).toBe(1); // Existing post (Feb 15)
    });

    it("should handle no sorting configuration gracefully", () => {
      const store = new MockDataStore();

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        // No sorting configuration
      };

      const existingStories = [
        createMockStory({
          id: 1,
          full_slug: "blog/first",
          created_at: "2024-02-15T10:00:00.000Z",
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
          created_at: "2024-02-10T10:00:00.000Z",
        }),
      ];

      // Should not throw error and should use original logic (append new entries)
      expect(() => {
        const context = createLoaderContext();
        context.collection = "test-collection";
        processStoriesResponse(newStories, store, context, undefined, null, config);
      }).not.toThrow();

      expect(store.size()).toBe(2);
    });

    it("should prioritize config.sortBy over storyblokParams.sort_by", () => {
      const store = new MockDataStore();

      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        sortBy: SortByEnum.NAME_ASC, // This should take precedence
        storyblokParams: {
          sort_by: SortByEnum.CREATED_AT_DESC, // This should be ignored
        },
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
          created_at: "2024-02-15T10:00:00.000Z", // Newer
        }),
      ];

      const context = createLoaderContext();
      context.collection = "test-collection";
      processStoriesResponse(newStories, store, context, undefined, null, config);

      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);

      // Should be sorted by name (ASC), not by created_at
      expect(finalEntries[0].name).toBe("Alpha Story"); // Should be first alphabetically
      expect(finalEntries[1].name).toBe("Zebra Story"); // Should be last alphabetically
    });

    it("should not duplicate updated stories when sorting is enabled", () => {
      const store = new MockDataStore();

      // Configuration with sorting enabled
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        storyblokParams: {
          sort_by: SortByEnum.CREATED_AT_DESC,
        },
      };

      // Add initial stories to store
      const initialStories = [
        createMockStory({
          id: 1,
          name: "First Story",
          full_slug: "blog/first",
          created_at: "2024-03-01T10:00:00.000Z",
          content: { component: "blog-post" },
        }),
        createMockStory({
          id: 2,
          name: "Second Story",
          full_slug: "blog/second",
          created_at: "2024-02-15T10:00:00.000Z",
          content: { component: "blog-post" },
        }),
      ];

      initialStories.forEach((story) => {
        store.set({
          id: story.full_slug,
          data: story,
        });
      });

      // Process an updated version of an existing story
      const updatedStories = [
        createMockStory({
          id: 1, // Same ID as the first story
          name: "First Story - Updated", // Updated name
          full_slug: "blog/first", // Same slug
          created_at: "2024-03-01T10:00:00.000Z", // Same date
          content: { component: "blog-post", updated: true }, // Updated content
        }),
      ];

      const context = createLoaderContext();
      context.collection = "test-collection";
      processStoriesResponse(updatedStories, store, context, "blog-post", null, config);

      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);

      // Should have exactly 2 stories, not 3 (no duplicates)
      expect(finalEntries).toHaveLength(2);

      // The updated story should be present with its updated content
      const updatedStory = finalEntries.find((story) => story.full_slug === "blog/first");
      expect(updatedStory).toBeDefined();
      expect(updatedStory.name).toBe("First Story - Updated");
      expect(updatedStory.content.updated).toBe(true);

      // The second story should still be present
      const secondStory = finalEntries.find((story) => story.full_slug === "blog/second");
      expect(secondStory).toBeDefined();
      expect(secondStory.name).toBe("Second Story");
    });

    it("should not duplicate updated stories when using UUIDs", () => {
      const store = new MockDataStore();

      // Configuration with UUIDs and sorting enabled
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        useUuids: true,
        storyblokParams: {
          sort_by: SortByEnum.NAME_ASC,
        },
      };

      // Add initial stories to store using UUIDs
      const initialStories = [
        createMockStory({
          id: 1,
          name: "Alpha Story",
          uuid: "uuid-alpha-123",
          full_slug: "blog/alpha",
          content: { component: "blog-post" },
        }),
        createMockStory({
          id: 2,
          name: "Beta Story",
          uuid: "uuid-beta-456",
          full_slug: "blog/beta",
          content: { component: "blog-post" },
        }),
      ];

      initialStories.forEach((story) => {
        store.set({
          id: story.uuid,
          data: story,
        });
      });

      // Process an updated version of an existing story (identified by UUID)
      const updatedStories = [
        createMockStory({
          id: 1, // Same ID
          name: "Alpha Story - Updated", // Updated name
          uuid: "uuid-alpha-123", // Same UUID
          full_slug: "blog/alpha", // Same slug
          content: { component: "blog-post", updated: true }, // Updated content
        }),
      ];

      const context = createLoaderContext();
      context.collection = "test-collection";
      processStoriesResponse(updatedStories, store, context, "blog-post", null, config);

      const finalEntries = Array.from(store.entries()).map(([, entry]) => entry.data);

      // Should have exactly 2 stories, not 3 (no duplicates)
      expect(finalEntries).toHaveLength(2);

      // The updated story should be present with its updated content
      const updatedStory = finalEntries.find((story) => story.uuid === "uuid-alpha-123");
      expect(updatedStory).toBeDefined();
      expect(updatedStory.name).toBe("Alpha Story - Updated");
      expect(updatedStory.content.updated).toBe(true);

      // The stories should be sorted by name (Alpha first, Beta second)
      expect(finalEntries[0].name).toBe("Alpha Story - Updated");
      expect(finalEntries[1].name).toBe("Beta Story");
    });
  });
});
