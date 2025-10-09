import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { StoryblokClient } from "@storyblok/js";
import type { LoaderContext } from "astro/dist/content/loaders/index.js";
import { CacheVersionUpdatePromise } from "../src/lib/CacheVersionUpdatePromise";
import { resetAllMocks, mockLogger } from "./mocks";

// Mock the utils module
vi.mock("../src/lib/utils", () => ({
  fetchSpaceCacheVersionValue: vi.fn(),
}));

import { fetchSpaceCacheVersionValue } from "../src/lib/utils";

const mockFetchSpaceCacheVersionValue = vi.mocked(fetchSpaceCacheVersionValue);

describe("CacheVersionUpdatePromise", () => {
  let mockStoryblokApi: StoryblokClient;
  let mockContext: LoaderContext;

  beforeEach(() => {
    resetAllMocks();
    mockFetchSpaceCacheVersionValue.mockClear();

    mockStoryblokApi = {
      get: vi.fn(),
      getAll: vi.fn(),
    } as any;

    mockContext = {
      collection: "test-collection",
      logger: mockLogger,
      store: {} as any,
      meta: {} as any,
      parseData: {} as any,
      generateDigest: vi.fn(),
      config: {} as any,
      renderMarkdown: vi.fn() as any,
    } as LoaderContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with correct collection name", () => {
      mockFetchSpaceCacheVersionValue.mockResolvedValue(12345);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);

      expect(mockFetchSpaceCacheVersionValue).toHaveBeenCalledWith(mockStoryblokApi, mockContext);
      expect(promise.getCollection()).toBe("test-collection");
    });

    it("should start the cache version fetch immediately", () => {
      mockFetchSpaceCacheVersionValue.mockResolvedValue(12345);

      new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);

      expect(mockFetchSpaceCacheVersionValue).toHaveBeenCalledTimes(1);
      expect(mockFetchSpaceCacheVersionValue).toHaveBeenCalledWith(mockStoryblokApi, mockContext);
    });
  });

  describe("getCollection", () => {
    it("should return the correct collection name", () => {
      mockFetchSpaceCacheVersionValue.mockResolvedValue(12345);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);

      expect(promise.getCollection()).toBe("test-collection");
    });

    it("should return different collection names for different contexts", () => {
      mockFetchSpaceCacheVersionValue.mockResolvedValue(12345);

      const context1 = { ...mockContext, collection: "collection-1" };
      const context2 = { ...mockContext, collection: "collection-2" };

      const promise1 = new CacheVersionUpdatePromise(mockStoryblokApi, context1);
      const promise2 = new CacheVersionUpdatePromise(mockStoryblokApi, context2);

      expect(promise1.getCollection()).toBe("collection-1");
      expect(promise2.getCollection()).toBe("collection-2");
    });
  });

  describe("then method", () => {
    it("should resolve with cache version when fetch succeeds", async () => {
      const expectedCv = 12345;
      mockFetchSpaceCacheVersionValue.mockResolvedValue(expectedCv);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);
      const result = await promise;

      expect(result).toBe(expectedCv);
    });

    it("should allow chaining with onFulfilled callback", async () => {
      const expectedCv = 12345;
      mockFetchSpaceCacheVersionValue.mockResolvedValue(expectedCv);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);
      const doubled = await promise.then((cv) => cv * 2);

      expect(doubled).toBe(24690);
    });

    it("should allow transformation in then callback", async () => {
      const expectedCv = 12345;
      mockFetchSpaceCacheVersionValue.mockResolvedValue(expectedCv);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);
      const stringified = await promise.then((cv) => `CV: ${cv}`);

      expect(stringified).toBe("CV: 12345");
    });

    it("should handle multiple then calls on same promise", async () => {
      const expectedCv = 12345;
      mockFetchSpaceCacheVersionValue.mockResolvedValue(expectedCv);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);

      const result1 = promise.then((cv) => cv);
      const result2 = promise.then((cv) => cv * 2);
      const result3 = promise.then((cv) => `CV: ${cv}`);

      const [cv1, cv2, cv3] = await Promise.all([result1, result2, result3]);

      expect(cv1).toBe(12345);
      expect(cv2).toBe(24690);
      expect(cv3).toBe("CV: 12345");
      // Should only call the underlying fetch once
      expect(mockFetchSpaceCacheVersionValue).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should reject when fetchSpaceCacheVersionValue fails", async () => {
      const expectedError = new Error("API fetch failed");
      mockFetchSpaceCacheVersionValue.mockRejectedValue(expectedError);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);

      await expect(promise).rejects.toThrow("API fetch failed");
    });

    it("should handle errors in onRejected callback", async () => {
      const expectedError = new Error("API fetch failed");
      mockFetchSpaceCacheVersionValue.mockRejectedValue(expectedError);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);
      const fallbackValue = await promise.then(
        (cv) => cv,
        (_error) => 0 // Return fallback value
      );

      expect(fallbackValue).toBe(0);
    });

    it("should propagate errors when no onRejected handler provided", async () => {
      const expectedError = new Error("Network error");
      mockFetchSpaceCacheVersionValue.mockRejectedValue(expectedError);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);

      await expect(promise.then((cv) => cv * 2)).rejects.toThrow("Network error");
    });

    it("should handle multiple error handlers on same promise", async () => {
      const expectedError = new Error("Connection timeout");
      mockFetchSpaceCacheVersionValue.mockRejectedValue(expectedError);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);

      const handler1 = promise.then(
        (cv) => cv,
        () => "fallback1"
      );
      const handler2 = promise.then(
        (cv) => cv,
        () => "fallback2"
      );
      const handler3 = Promise.resolve(promise)
        .then((cv) => cv)
        .catch(() => "fallback3");

      const [result1, result2, result3] = await Promise.all([handler1, handler2, handler3]);

      expect(result1).toBe("fallback1");
      expect(result2).toBe("fallback2");
      expect(result3).toBe("fallback3");
      // Should only call the underlying fetch once
      expect(mockFetchSpaceCacheVersionValue).toHaveBeenCalledTimes(1);
    });
  });

  describe("PromiseLike implementation", () => {
    it("should work with async/await", async () => {
      const expectedCv = 98765;
      mockFetchSpaceCacheVersionValue.mockResolvedValue(expectedCv);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);
      const result = await promise;

      expect(result).toBe(expectedCv);
    });

    it("should work with Promise.all", async () => {
      mockFetchSpaceCacheVersionValue.mockResolvedValue(11111);

      const promise1 = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);
      const promise2 = new CacheVersionUpdatePromise(mockStoryblokApi, {
        ...mockContext,
        collection: "other-collection",
      });

      const [cv1, cv2] = await Promise.all([promise1, promise2]);

      expect(cv1).toBe(11111);
      expect(cv2).toBe(11111);
      expect(mockFetchSpaceCacheVersionValue).toHaveBeenCalledTimes(2);
    });

    it("should work with Promise.race", async () => {
      const fastPromise = new Promise<number>((resolve) => setTimeout(() => resolve(99999), 10));
      mockFetchSpaceCacheVersionValue.mockImplementation(() => fastPromise);

      const promise = new CacheVersionUpdatePromise(mockStoryblokApi, mockContext);
      const slowPromise = new Promise<number>((resolve) => setTimeout(() => resolve(88888), 100));

      const result = await Promise.race([promise, slowPromise]);

      expect(result).toBe(99999);
    });
  });
});
