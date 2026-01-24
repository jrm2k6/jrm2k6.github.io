# Repository Guidelines

## Project Structure & Module Organization
- `_posts/` holds blog posts (Markdown with front matter). Use the naming pattern `YYYY-MM-DD-title.md`.
- `_includes/` contains shared layout snippets used by Jekyll templates.
- `assets/img/` stores image assets referenced by posts and pages.
- Top-level Markdown pages like `index.md`, `about.md`, and `projects.md` are site pages.
- `_site/` is the generated output; avoid hand-editing it unless you intentionally publish built files.

## Build, Test, and Development Commands
- `bundle install` installs Ruby dependencies defined in `Gemfile`.
- `bundle exec jekyll serve` runs the site locally with live reload; restart after editing `_config.yml`.
- `bundle exec jekyll build` generates the static site into `_site/`.

## Coding Style & Naming Conventions
- Use Markdown with YAML front matter for content files.
- Keep YAML indentation to 2 spaces (match `_config.yml`).
- Prefer concise, sentence-style headings in posts and pages.
- Use lower-case, hyphenated filenames for posts and pages.

## Testing Guidelines
- No automated test suite is currently configured. Validate changes by running the local Jekyll server and checking pages in the browser.

## Commit & Pull Request Guidelines
- Recent commits use short, imperative summaries and occasional prefixes like `build:` or `update`. Follow the same style (e.g., `add: new post`, `build: update deps`).
- PRs should explain the change, link any related issue, and include screenshots for visual/content updates when relevant.

## Configuration Notes
- Site settings live in `_config.yml` (title, URL, plugins). Changing this file requires restarting `jekyll serve`.
- Dependencies and Jekyll version are managed in `Gemfile` and `Gemfile.lock`.
