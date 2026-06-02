# How to write queries
*This file was made with the help of Claude sonnet 4.6 based on my own written code*

[Back](./../README.md)

**Index:**

- [Query](#query)
- [Mutation](#mutation)
- [Prefetching and caching](#prefetching-and-caching)
- [Invalidation and refetching](#invalidation-and-refetching)

---

## Query

A **query** is how you fetch and subscribe to server data. TanStack Query handles caching, background refetching, and loading/error states for you.

Each query is built in three parts: the **fetch function**, the **query options object**, and the **hook**.

```ts
// 1. The raw fetch function — plain async function, no TanStack involved
async function getPosts(): Promise<ApiSuccessResponse<PostsResponse>> {
  const res = await fetch("/api/post")
  if (!res.ok) await formatErrorResponse(res)
  return res.json()
}

// 2. The query options object — reusable config, used in hooks AND prefetching
export const getPostsQueryOptions = {
  queryKey: ["posts"],        // Cache key — must be unique per resource
  queryFn: getPosts,          // The fetch function above
  staleTime: 1000 * 60 * 5,  // How long data is considered fresh (5 minutes here)
}

// 3. The hook — what you call in components
export function useGetPosts() {
  return useSuspenseQuery(getPostsQueryOptions)
}
```

**Why export the options object separately?** Because it's also used in route loaders for prefetching (see [Prefetching and caching](#prefetching-and-caching)). Keeping it separate avoids duplication.

### Queries with parameters

When a query depends on a parameter (like an ID), make the options a function:

```ts
export const getPostByIdQueryOptions = (id: string) => ({
  queryKey: ["posts", id],           // Include the param in the key so each ID gets its own cache entry
  queryFn: () => getPostById(id),
  staleTime: 1000 * 60 * 5,
  enabled: !!id,                     // Don't run the query if id is empty/undefined
})

export function useGetPostById(id: string) {
  return useSuspenseQuery(getPostByIdQueryOptions(id))
}
```

> **`queryKey` naming convention:** Use `["resource"]` for collections and `["resource", id]` for individual items. This matters for invalidation — invalidating `["posts"]` will also invalidate `["posts", id]` entries because TanStack uses prefix matching.

### Using a query in a component

```tsx
function PostList() {
  const posts = useGetPosts()
  const postsData = posts.data.result  // .data is typed to your return value
  // ...
}
```

We use `useSuspenseQuery` (not `useQuery`), which means the hook suspends the component while loading — there's no need to handle `isLoading` manually. The route's `pendingComponent` handles the loading state, and `errorComponent` handles errors.

---

## Mutation

A **mutation** is how you create, update, or delete data. Unlike queries, mutations don't run automatically — you call them explicitly.

Each mutation follows the same pattern as queries: fetch function, options object, and hook.

```ts
// 1. The fetch function — uses fetchWithAuth for protected endpoints
async function createPost(data: Post): Promise<ApiSuccessResponse<PostResponse>> {
  const res = await fetchWithAuth("/api/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) await formatErrorResponse(res)
  return res.json()
}

// 2. The mutation hook — queryClient is passed in so we can invalidate after success
export function useCreatePost(queryClient: QueryClient) {
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
  })
}
```

### Getting the queryClient in a route component

```tsx
const createPost = useCreatePost(Route.useRouteContext().queryClient)
```

### Calling a mutation

```tsx
createPost.mutate(value, {
  onSuccess: (data) => {
    toast.success("Post created successfully")
    navigate({ to: "/post/$id", params: { id: data.result.id } })
  },
  onError: (error) => {
    toast.error(error instanceof Error ? error.message : "Failed to create post")
  },
})
```

You can put `onSuccess`/`onError` either in the hook definition or at the call site. Use the hook for things that always happen (cache invalidation), and the call site for things specific to one usage (navigation, toasts).

### Update and delete

Updates and deletes follow the same shape. When a mutation affects a specific item, pass the ID and `queryClient` into the hook:

```ts
export function useUpdatePost(id: string, queryClient: QueryClient) {
  return useMutation({
    mutationFn: (data: UpdateData<Post>) => updatePost({ id, data }),
    onSuccess: () => {
      // Invalidate both the list and the specific item
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      queryClient.invalidateQueries({ queryKey: ["posts", id] })
    },
  })
}

export function useDeletePost(id: string, queryClient: QueryClient) {
  return useMutation({
    mutationFn: () => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
  })
}
```

---

## Prefetching and caching

**Prefetching** means loading data before a component renders, so the user doesn't see a loading spinner when navigating to a route. TanStack Router's route `loader` is the right place to do this.

```ts
export const Route = createFileRoute("/post/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(getPostsQueryOptions)  // Start the fetch early
  },
  pendingMs: 300,       // Only show the pending component if loading takes longer than 300ms
  pendingMinMs: 200,    // If the pending component shows, keep it for at least 200ms (avoids flicker)
  pendingComponent: () => <RoutePending />,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: RouteComponent,
})
```

When the component calls `useGetPosts()`, the data is already in the cache (or nearly there), so it renders immediately instead of suspending.

> **Why export `queryOptions` separately?** The loader uses `getPostsQueryOptions` directly — no hook needed there. If the options were defined only inside the hook, you'd have to duplicate the `queryKey` and `queryFn`. Exporting the options object makes the hook a thin wrapper around the same config.

### staleTime

`staleTime` controls how long cached data is considered fresh. During that window, TanStack Query serves from cache without hitting the network.

```ts
staleTime: 1000 * 60 * 5  // 5 minutes — data won't be refetched for 5 minutes
```

If you navigate away and back within the stale window, the data loads instantly from cache. After that, it refetches in the background while still showing the cached data.

---

## Invalidation and refetching

After a mutation, the cached data is stale. **Invalidation** tells TanStack Query to refetch the affected queries.

```ts
// Invalidate all queries that start with ["posts"]
queryClient.invalidateQueries({ queryKey: ["posts"] })

// This also invalidates ["posts", "123"], ["posts", "456"], etc.
// because TanStack uses prefix matching
```

For mutations that affect a specific item, invalidate both the list and the item:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["posts"] })      // Refreshes the list
  queryClient.invalidateQueries({ queryKey: ["posts", id] })  // Refreshes the detail view
}
```

> **Prefix matching:** `["posts"]` invalidates everything whose key starts with `"posts"`. This means invalidating the root key covers both the list and all detail entries — but being explicit about both is clearer and doesn't hurt.