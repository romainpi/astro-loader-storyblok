import { describe, it, expect } from "vitest";

describe("Main Exports", () => {
  it("should export StoryblokLoaderStories and StoryblokLoaderDatasource", async () => {
    const exports = await import("../src/index");

    expect(exports.StoryblokLoaderStories).toBeDefined();
    expect(exports.StoryblokLoaderDatasource).toBeDefined();
    expect(typeof exports.StoryblokLoaderStories).toBe("function");
    expect(typeof exports.StoryblokLoaderDatasource).toBe("function");
  });

  it("should export SortByEnum", async () => {
    const exports = await import("../src/index");

    expect(exports.SortByEnum).toBeDefined();
    expect(typeof exports.SortByEnum).toBe("object");

    // Check some enum values
    expect(exports.SortByEnum.CREATED_AT_ASC).toBe("created_at:asc");
    expect(exports.SortByEnum.UPDATED_AT_DESC).toBe("updated_at:desc");
  });

  it("should re-export types from @storyblok/js", async () => {
    // This test just ensures the re-exports don't break
    const exports = await import("../src/index");

    // These are type exports, so we can't test them directly at runtime
    // But we can at least verify the module loads without error
    expect(exports).toBeDefined();
  });

  it("should have expected structure for loader functions", async () => {
    const { StoryblokLoaderStories, StoryblokLoaderDatasource } = await import("../src/index");

    // Create loaders with minimal config
    const storiesLoader = StoryblokLoaderStories({ accessToken: "test" });
    const datasourceLoader = StoryblokLoaderDatasource({
      accessToken: "test",
      datasource: "test-datasource",
    });

    // Check loader structure
    expect(storiesLoader).toHaveProperty("name", "astro-loader-storyblok-stories");
    expect(storiesLoader).toHaveProperty("load");
    expect(typeof storiesLoader.load).toBe("function");

    expect(datasourceLoader).toHaveProperty("name", "astro-loader-storyblok-datasource");
    expect(datasourceLoader).toHaveProperty("load");
    expect(typeof datasourceLoader.load).toBe("function");
  });
});
