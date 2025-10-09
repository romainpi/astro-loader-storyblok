import type { StoryblokClient } from "@storyblok/js";
import type { LoaderContext } from "astro/loaders";
import { fetchSpaceCacheVersionValue } from "./utils";

export class CacheVersionUpdatePromise implements PromiseLike<number> {
  private promise: Promise<number>;
  private collection: string;

  constructor(storyblokApi: StoryblokClient, context: LoaderContext) {
    this.promise = fetchSpaceCacheVersionValue(storyblokApi, context);
    this.collection = context.collection;
  }

  public then<TResult1 = number, TResult2 = never>(
    onFulfilled?: ((value: number) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onFulfilled, onRejected);
  }

  public getCollection(): string {
    return this.collection;
  }
}
