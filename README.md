# astro-loader-storyblok

~~A robust~~ _An experimental_ Storyblok loader for the [Astro Content Layer API][astro-collections] that enables seamless integration between Storyblok CMS and Astro content collections.

## Features

- ✅ **Full Astro Content Layer API support** - Compatible with Astro 5.0+
- 📝 **Draft and published content** - Support for both draft and published versions
- 🎯 **Content type filtering** - Load specific content types or all stories
- 📊 **Flexible sorting** - Multiple sorting options for your content
- 🚀 **Optimized performance** - Incremental updates and efficient caching
- 📦 **TypeScript ready** - Full TypeScript support with type definitions
- 🔄 **Real-time sync** - Built-in support for real-time content updates

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
  }),
});
```

### Stories Loader - Advanced Configuration

```typescript
import { StoryblokLoaderStories, SortByEnum } from "astro-loader-storyblok";



const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: "your-access-token",

      // Filter by specific content types
      contentTypes: ["article", "page", "product"],

      // Use UUIDs instead of slugs as IDs
      useUuids: true,

      // Additional Storyblok API options
      apiOptions: {
        region: "us", // 'eu' (default), 'us', 'ap', 'ca', 'cn'
        https: true,
        cache: {
          type: "memory",
        },
      },
    },
    {
      version: "draft",

      // Exclude specific slugs
      excluding_slugs: "home,about,contact",

      // Sort stories
      sort_by: SortByEnum.CREATED_AT_DESC,
    }
  ),
});
```

## Configuration Options

The `StoryblokLoaderStories` function accepts two parameters:

1. **Config object** (`StoryblokLoaderStoriesConfig`) - Contains loader-specific configuration
2. **Storyblok API parameters** (`ISbStoriesParams`) - Contains standard Storyblok API query parameters

### Loader Configuration (`StoryblokLoaderStoriesConfig`)

```typescript
export interface StoryblokLoaderStoriesConfig {
  accessToken: string;
  apiOptions?: ISbConfig;
  contentTypes?: string[];
  useUuids?: boolean;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accessToken` | `string` | **Required** | Your Storyblok access token |
| `apiOptions` | `ISbConfig` | `{}` | Additional Storyblok API configuration |
| `contentTypes` | `string[]` | `undefined` | Array of content types to load. If not provided, loads all stories |
| `useUuids` | `boolean` | `false` | Use story UUIDs instead of slugs as collection entry IDs |

### Storyblok API Parameters (`ISbStoriesParams`)

The second parameter accepts all standard Storyblok Stories API parameters. Common options include:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `version` | `"draft" \| "published"` | `"published"` | Content version to load |
| `excluding_slugs` | `string` | `undefined` | Comma-separated list of slugs to exclude |
| `sort_by` | `string` | `undefined` | Sort order for stories |
| `starts_with` | `string` | `undefined` | Filter by slug prefix |
| `by_slugs` | `string` | `undefined` | Filter by specific slugs |

For a complete list of available parameters, see the [Storyblok Stories API documentation][stories-query-params].

## Sorting Options

The `SortByEnum` enum provides the following default sorting options for use in the `sort_by` parameter:

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

// Usage example
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    { accessToken: "your-token" },
    { 
      version: "published",
      sort_by: SortByEnum.CREATED_AT_DESC 
    }
  ),
});
```

You may also specify a custom string for custom sorting options. For more details please refer to the different custom
options [available for `sort_by` at the Storyblok Docs][stories-query-params].

## Performance Features

- **Incremental Updates**: Only fetches content that has changed since the last build
- **Efficient Caching**: Stores metadata about the last published date to minimize API calls
- **Selective Loading**: Load only specific content types to reduce payload size

## Real-time Content Updates

OLD: This loader supports Storyblok webhooks for real-time content updates. When a story is updated in Storyblok, the loader will automatically sync the changes.

NEW: The package includes a `syncContentUpdate` utility function that enables real-time content synchronization between Storyblok and your Astro site. This is particularly useful during development or when you want immediate updates from Storyblok.

### How it Works

When content is updated in Storyblok, you can trigger a sync by calling the `syncContentUpdate` function with the updated story data. This sends a refresh request to your Astro development server.

```typescript
import { syncContentUpdate } from "astro-loader-storyblok/lib/syncContentUpdate";

// Call this when you receive a webhook from Storyblok
// or when you want to manually sync updated content
await syncContentUpdate({ story: updatedStoryData });
```

### Integration with Storyblok Webhooks

You can set up a webhook endpoint in your Astro project to automatically sync content when it's updated in Storyblok:

```typescript
// src/pages/api/storyblok-webhook.ts
import type { APIRoute } from 'astro';
import { syncContentUpdate } from "astro-loader-storyblok/lib/syncContentUpdate";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    if (data.story) {
      await syncContentUpdate({ story: data.story });
      return new Response('OK', { status: 200 });
    }
    
    return new Response('No story data', { status: 400 });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
};
```

**Note**: This feature is primarily designed for development workflows. In production, content updates will be reflected during your next build process.

## TypeScript Support

This package is built with TypeScript and provides full type definitions. For even better type safety, consider using [`storyblok-to-zod`] to generate Zod schemas for your Storyblok components.

```typescript
import { z } from "astro:content";
import { StoryblokLoaderStories } from "astro-loader-storyblok";
import { pageSchema } from './types/storyblok.zod.ts';

// Example with Zod schema (when using storyblok-to-zod)
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
    },
    {
      version: "published",
    }
  ),
  schema: pageSchema,
});
```

## Examples

### Loading Blog Posts

```typescript
// src/content/config.ts
const blog = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
      contentTypes: ["blog-post"],
    },
    {
      version: "published",
      sort_by: SortByEnum.CREATED_AT_DESC,
    }
  ),
});
```

### Multi-region Setup

```typescript
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
      apiOptions: {
        region: "us", // for US region
      },
    },
    {
      version: "published",
    }
  ),
});
```

### Development vs Production

```typescript
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
    },
    {
      version: import.meta.env.DEV ? "draft" : "published",
    }
  ),
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
