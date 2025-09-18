# storyblok-astro-contentloader

Storyblok stories and datasources loader for the [Astro Content Layer API][astro-collections].

## Storyblok were working on an official Astro Content Layer API implementation

September of 2024 there was a post [about an alpha version of a "Storyblok
Loader for the Astro Content Layer API"][astro-alpha].

The implementation [can be found here][abandoned-implementation] in the archived
repo (the code has since been moved to a monorepo and this development branch
has not been carried over). It appears this implementation did not take care of
defining a Zod schema for Storyblok's modules.

Works great with [`storyblok-to-zod`] !

[astro-collections]: https://docs.astro.build/en/guides/content-collections/
[astro-alpha]: https://www.storyblok.com/mp/announcing-storyblok-loader-astro-content-layer-api
[abandoned-implementation]: https://github.com/storyblok/storyblok-astro/commit/1a9bfb16e5886b3419607eb77802088f5eb9dfc4
[`storyblok-to-zod`]:https://www.npmjs.com/package/storyblok-to-zod