// Mock setup for Storyblok JS SDK
import { vi } from "vitest";

export const mockStoryblokClient = {
  get: vi.fn(),
  getAll: vi.fn(),
};

export const mockStoryblokInit = vi.fn(() => ({
  storyblokApi: mockStoryblokClient,
}));
