# astro-loader-storyblok

~~A robust~~ _An experimental_ Storyblok loader for the [Astro Content Layer API][astro-collections] that enables seamless integration between Storyblok CMS and Astro content collections.

## Features

- ✅ **Full Astro Content Layer API support** - Compatible with Astro 5.0+
- 📝 **Draft and published content** - Support for both draft and published versions
- 🎯 **Content type filtering** - Load specific content types or all stories
- 📊 **Flexible sorting** - Multiple sorting options for your content
- 🚀 **Optimized performance** - Incremental updates and efficient caching
- 📦 **TypeScript ready** - Full TypeScript support with type definitions

## Installation

```bash
npm install astro-loader-storyblok
# or
pnpm add astro-loader-storyblok
# or
yarn add astro-loader-storyblok
```

## Quick Start

### 1. Configure your Astro content collection

Create or update your `src/content/config.ts`:

```typescript
import { defineCollection } from "astro:content";
import { StoryblokLoaderStories } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: "your-storyblok-access-token",
    version: "published", // or "draft"
  }),
});

export const collections = { stories };
```

### 2. Use in your Astro pages

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection, getEntry } from "astro:content";

export async function getStaticPaths() {
  const stories = await getCollection("stories");
  return stories.map((story) => ({
    params: { slug: story.data.full_slug },
    props: { story },
  }));
}

const { story } = Astro.props;
---

<html>
  <head>
    <title>{story.data.name}</title>
  </head>
  <body>
    <h1>{story.data.content.title}</h1>
    <div set:html={story.data.content.body} />
  </body>
</html>
```

## Configuration

### Stories Loader - Basic Configuration

```typescript
import { StoryblokLoaderStories, SortByEnum } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: "your-access-token",
    version: "published", // "published" | "draft"
  }),
});
```

### Stories Loader - Advanced Configuration

```typescript
import { StoryblokLoaderStories, SortByEnum } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: "your-access-token",
    version: "published",
    
    // Filter by specific content types
    contentTypes: ["article", "page", "product"],
    
    // Exclude specific slugs
    excludingSlugs: "home,about,contact",
    
    // Sort stories
    sortBy: SortByEnum.CREATED_AT_DESC,
    
    // Use UUIDs instead of slugs as IDs
    useUuids: true,
    
    // Additional Storyblok API options
    apiOptions: {
      region: "us", // 'eu' (default), 'us', 'ap', 'ca', 'cn'
      https: true,
      cache: {
        type: 'memory'
      }
    },
  }),
});
```

## Configuration Options

This is the `StoryblokLoaderConfig` object:

```typescript
export interface StoryblokLoaderConfig {
  accessToken: string;
  apiOptions?: ISbConfig;
  contentTypes?: string[];
  excludingSlugs?: string;
  sortBy?: SortBy | string;
  version: "draft" | "published";
  useUuids?: boolean;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accessToken` | `string` | **Required** | Your Storyblok access token |
| `apiOptions` | `ISbConfig` | `{}` | Additional Storyblok API configuration |
| `contentTypes` | `string[]` | `undefined` | Array of content types to load. If not provided, loads all stories |
| `excludingSlugs` | `string` | `undefined` | Comma-separated list of slugs to exclude |
| `sortBy` | `SortBy \| string` | `undefined` | Sort order for stories |
| `version` | `"draft" \| "published"` | `published` | Content version to load |

## Sorting Options

The `SortByEnum` enum provides the following default sorting options:

```typescript
import { SortByEnum } from "astro-loader-storyblok";

// Available sorting options
SortByEnum.CREATED_AT_ASC    // "created_at:asc"
SortByEnum.CREATED_AT_DESC   // "created_at:desc"
SortByEnum.NAME_ASC          // "name:asc"
SortByEnum.NAME_DESC         // "name:desc"
SortByEnum.SLUG_ASC          // "slug:asc"
SortByEnum.SLUG_DESC         // "slug:desc"
SortByEnum.UPDATED_AT_ASC    // "updated_at:asc"
SortByEnum.UPDATED_AT_DESC   // "updated_at:desc"
```

You may also specify a custom string for custom sorting options. For more details please refer to the different custom
options [available for `sort_by` at the Storyblok Docs][stories-query-params].

## Performance Features

- **Incremental Updates**: Only fetches content that has changed since the last build
- **Efficient Caching**: Stores metadata about the last published date to minimize API calls
- **Selective Loading**: Load only specific content types to reduce payload size

## TypeScript Support

This package is built with TypeScript and provides full type definitions. For even better type safety, consider using [`storyblok-to-zod`] to generate Zod schemas for your Storyblok components.

```typescript
import { z } from "astro:content";
import { StoryblokLoaderStories } from "astro-loader-storyblok";
import { pageSchema } from './types/storyblok.zod.ts';

// Example with Zod schema (when using storyblok-to-zod)
const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    version: "published",
  }),
  schema: pageSchema,
});
```

## Examples

### Loading Blog Posts

```typescript
// src/content/config.ts
const blog = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    version: "published",
    contentTypes: ["blog-post"],
    sortBy: SortByEnum.CREATED_AT_DESC,
  }),
});
```

### Multi-region Setup

```typescript
const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    version: "published",
    apiOptions: {
      region: "us", // for US region
    },
  }),
});
```

### Development vs Production

```typescript
const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    version: import.meta.env.DEV ? "draft" : "published",
  }),
});
```

## Background

This loader was created as an alternative to Storyblok's official Astro Content Layer implementation. In September 2024, Storyblok announced an [alpha version of a loader][astro-alpha], but the [implementation][abandoned-implementation] was later archived and didn't include proper Zod schema definitions.

This package provides a complete, production-ready solution with full TypeScript support and works seamlessly with [`storyblok-to-zod`] for type-safe content schemas.

## Feedback

Feedback and contributions are welcome! If you run into a problem, don't hesitate to [open a GitHub issue][new-issue].

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT - see [LICENSE.txt](LICENSE.txt) for details.

[astro-collections]: https://docs.astro.build/en/guides/content-collections/
[astro-alpha]: https://www.storyblok.com/mp/announcing-storyblok-loader-astro-content-layer-api
[abandoned-implementation]: https://github.com/storyblok/storyblok-astro/commit/1a9bfb16e5886b3419607eb77802088f5eb9dfc4
[`storyblok-to-zod`]: https://www.npmjs.com/package/storyblok-to-zod
[new-issue]: https://github.com/romainpi/astro-loader-storyblok/issues/new
[stories-query-params]: https://www.storyblok.com/docs/api/content-delivery/v2/stories/retrieve-multiple-stories#query-parameters
