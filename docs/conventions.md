# Conventions

[Back](./../README.md)

**Index:**

- [Naming Conventions](#naming-conventions)
- [Coding Style](#coding-style)
- [Folder Structure](#folder-structure)

## Naming Conventions

- Use camelCase for variables and functions.
- Use PascalCase for React components and TypeScript types/interfaces.
  - For schemas always at `Schema` suffix (e.g., `UserSchema`), type should be `User`.
- Use UPPER_SNAKE_CASE for constants and environment variables.

- Use descriptive names that clearly indicate the purpose of the variable, function, or component.
- Avoid abbreviations unless they are widely recognized (e.g., `id`, `url`, `api`).

- For boolean variables, use names that imply true/false (e.g., `isLoggedIn`, `hasError`).
- For event handlers, use the `handle` prefix (e.g., `handleSubmit`, `handleClick`).

- For files and folders, use kebab-case (e.g., `post-card.tsx`, `auth-routes.ts`).
  - For React components, use names that reflect their purpose and structure (e.g., `UserCard`, `LoginForm`).
  - For forms, queries put it in the feature folder and name it `form.ts` and `queries.ts` respectively (e.g., `features/posts/form.ts`, `features/posts/queries.ts`).

- For API functions, use the HTTP function as a prefix (e.g., `getPosts.ts`, `createPost.ts`).
  - For collection vs detail naming in API routes, use plural for collections (e.g., `getUsers.ts`) and singular with variable for detail routes (e.g., `getUserById.ts`).
  - For options objects, use the `options` suffix (e.g., `getPostsQueryOptions.ts`).
  - For hooks, use the `use` prefix (e.g., `useGetPosts.ts`, `useCreatePost.ts`).

## Coding Style

Use Prettier for code formatting  
**Download for VSCode**: [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)  
**Download for PHPStorm**: [Prettier](https://plugins.jetbrains.com/plugin/10456-prettier)

- Use consistent indentation (2 spaces).
- Use semicolons at the end of statements.
- Use double quotes for strings.
- Use arrow functions **only** for small and inline functions, and regular functions for larger functions.

## Folder Structure

The folder structure is organized by feature and type. The main folders are `components`, `hooks`, `lib`, `routes` and `types`. Each feature has its own folder inside the `features` folder, which contains all the related components, hooks (queries/mutations and form) for that feature. The `lib` folder contains shared utilities and helpers, such as API functions, form context, route guards and token management. The `routes` folder contains the different pages of the application, organized by feature. The `types` folder contains the Zod schemas and TypeScript types for the application.

For more info check: [Project Structure](./project-structure.md)

## Git Conventions

### Commit Messages

Use the following prefixes to categorize commits:

- `feat:` — a new feature (e.g. `feat: add post edit form`)
- `fix:` — a bug fix (e.g. `fix: form not resetting after submit`)
- `chore:` — maintenance that isn't a feature or fix (e.g. `chore: update dependencies`)
- `refactor:` — code change that neither fixes a bug nor adds a feature (e.g. `refactor: extract post card into component`)
- `docs:` — documentation changes (e.g. `docs: add query conventions`)

Rules:

- Use lowercase
- Use the imperative mood, "add feature" not "added feature"
- Keep the message short and descriptive, one line is preferred

### Pull Requests

- One PR per feature or fix, avoid bundling unrelated changes
- The PR title should follow the same format as a commit message (e.g. `feat: add post edit form`)
- Before opening a PR, make sure there are no TypeScript errors and the app runs locally
