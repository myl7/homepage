# homepage

My homepage at [myl7.org](https://myl7.org/), built with Hugo and the Blowfish theme.

## Get Started

Prerequisites: [Hugo](https://gohugo.io/)

Clone the repository and initialize the theme submodule:

```sh
git clone --recurse-submodules https://github.com/myl7/homepage.git
cd homepage
```

Start the development server:

```sh
hugo server
```

The site will be available at `http://localhost:1313/`.

Build for production:

```sh
hugo
```

Output goes to the `public/` directory.

### Deploying on Vercel

Vercel's default Hugo version is too old to recognize the `hugo.toml` config file.
Instead of erroring, it silently builds an empty site.
Set the `HUGO_VERSION` environment variable in your Vercel project settings to a newer version (e.g., `0.157.0`).

## Adding Content

Create a new post:

```sh
hugo new content posts/my-post/index.md
```

Edit the generated file under `content/posts/my-post/index.md`.

## Config

See the [Blowfish documentation](https://blowfish.page/docs/configuration/) for all available theme parameters.

## Licenses

Copyright (C) 2026 Yulong Ming <i@myl7.org>.

Code licensed under Apache License, Version 2.0.

Text content in ./content licensed under CC BY 4.0 License.
