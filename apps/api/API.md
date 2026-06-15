# API Reference — Global to Social

**Base URL:** `http://localhost:8000`  
**Framework:** Express 5 (ES modules)  
**Auth:** JWT via HTTP-only cookie (`access_token`) or `Authorization: Bearer <token>` header  
**Docs UI:** `GET /api/docs`

---

## Table of Contents

- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Status](#status)
  - [Auth](#auth)
  - [Users](#users)
  - [Interests](#interests)
  - [User Interests](#user-interests)
  - [Venues](#venues)
  - [Photos](#photos)
  - [Collages](#collages)
  - [Collage Photos](#collage-photos)
  - [Partners](#partners)
  - [Venue Partnerships](#venue-partnerships)
  - [Thema Routes](#thema-routes)
  - [Routes](#routes)
  - [Route Stops](#route-stops)
  - [Conversation Starters](#conversation-starters)
  - [Matches](#matches)
  - [Sessions](#sessions)
- [Socket.IO Events](#socketio-events)
  - [Connection](#connection)
  - [Client → Server](#client--server-events)
  - [Server → Client](#server--client-events)
- [WebSocket Quickstart — Mobile Integration](#websocket-quickstart--mobile-integration)
- [Error Responses](#error-responses)
- [Environment Variables](#environment-variables)

---

## Authentication

Protected routes require a valid JWT access token. Supply it via one of:

- **HTTP-only cookie** `access_token` (set automatically on login/register)
- **Header** `Authorization: Bearer <token>`

Tokens are issued on `/api/auth/register` and `/api/auth/login`. Access tokens expire in **1 hour**; refresh tokens expire in **7 days**. Call `/api/auth/refresh` (using the refresh cookie) to obtain a new access token without re-authenticating.

The JWT payload contains `{ userId, email, role }`, available to protected handlers via `res.locals.payload`.

---

## Endpoints

### Status

#### `GET /api/status`

Health check. No auth required.

**Response `200`**
```json
{ "message": "API is running" }
```

---

### Auth

Base path: `/api/auth`

---

#### `POST /api/auth/register`

Create a new user account and return tokens.

**Request body**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123",
  "school": "EUR",
  "campus": "Woudestein"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | yes | trimmed, min 1 |
| `email` | string | yes | valid email, lowercased |
| `password` | string | yes | min 8, max 128 |
| `school` | string | no | trimmed |
| `campus` | string | no | trimmed |

**Response `201`**
```json
{
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "name": "Alice",
    "school": "EUR",
    "campus": "Woudestein"
  },
  "token": "<access_jwt>"
}
```

Sets `access_token` HTTP-only cookie.

**Errors:** `400` validation failure · `409` email already registered · `500` server error

---

#### `POST /api/auth/login`

Authenticate and return tokens.

**Request body**
```json
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

**Response `200`**
```json
{
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "name": "Alice",
    "school": "EUR",
    "campus": "Woudestein"
  },
  "token": "<access_jwt>"
}
```

Sets `access_token` HTTP-only cookie.

**Errors:** `400` validation failure · `401` invalid credentials · `500` server error

---

#### `POST /api/auth/refresh`

Exchange the stored refresh cookie for a new access token.

**Request body:** none  
**Cookies required:** `access_token` (containing a valid refresh token)

**Response `200`**
```json
{
  "token": "<new_access_jwt>",
  "message": "Token refreshed"
}
```

**Errors:** `401` missing or expired refresh token

---

#### `POST /api/auth/logout`

Clear auth cookies.

**Request body:** none

**Response `200`**
```json
{ "message": "Logged out" }
```

---

#### `GET /api/auth/me`

Return the authenticated user's profile.

**Auth required:** yes

**Response `200`**
```json
{
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "name": "Alice",
    "school": "EUR",
    "campus": "Woudestein"
  }
}
```

**Errors:** `401` unauthenticated · `404` user not found

---

#### `DELETE /api/auth/me`

Permanently delete the authenticated user's account and clear auth cookies.

**Auth required:** yes

**Request body:** none

**Response `200`**
```json
{ "message": "Account deleted successfully" }
```

**Errors:** `401` unauthenticated · `404` user not found

---

### Users

Base path: `/api/users`

---

#### `PATCH /api/users/me`

Update the authenticated user's profile fields.

**Auth required:** yes

**Request body** (all fields optional)
```json
{
  "name": "Alice",
  "school": "EUR",
  "campus": "Woudestein"
}
```

At least one field must be provided. Unknown fields are ignored.

**Response `200`**
```json
{
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "name": "Alice",
    "school": "EUR",
    "campus": "Woudestein"
  }
}
```

**Errors:** `400` no fields provided or validation failure · `401` unauthenticated · `404` user not found · `500` server error

---

### Interests

Base path: `/api/interests`

---

#### `GET /api/interests`

List all interests. No auth required.

**Response `200`**
```json
{
  "interests": [
    { "id": "uuid", "name": "photography" },
    { "id": "uuid", "name": "hiking" }
  ]
}
```

---

#### `GET /api/interests/:id`

Fetch a single interest by ID. No auth required.

**Response `200`**
```json
{ "interest": { "id": "uuid", "name": "photography" } }
```

**Errors:** `404` not found

---

#### `POST /api/interests`

Create a new interest.

**Auth required:** yes

**Request body**
```json
{ "name": "photography" }
```

Interest names are normalised to lowercase.

**Response `201`**
```json
{ "interest": { "id": "uuid", "name": "photography" } }
```

**Errors:** `400` validation failure · `409` name already exists · `500` server error

---

#### `PATCH /api/interests/:id`

Update an interest.

**Auth required:** yes

**Request body** (all fields optional)
```json
{ "name": "street photography" }
```

**Response `200`**
```json
{ "interest": { "id": "uuid", "name": "street photography" } }
```

**Errors:** `400` no fields provided or validation failure · `404` not found · `409` name already taken · `500` server error

---

#### `DELETE /api/interests/:id`

Delete an interest.

**Auth required:** yes

**Response `204`** — no body

**Errors:** `404` not found · `409` interest is referenced by a group (foreign-key constraint) · `500` server error

---

### User Interests

Base path: `/api/user-interests`

Manages the interests linked to the authenticated user. A user must always have between **3 and 5** interests.

---

#### `GET /api/user-interests`

List the authenticated user's interests.

**Auth required:** yes

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `interestId` | string (uuid) | Filter to a specific interest |

**Response `200`**
```json
{
  "userInterests": [
    { "userId": "uuid", "interestId": "uuid", "interestName": "photography" }
  ]
}
```

**Errors:** `400` invalid query params · `401` unauthenticated

---

#### `GET /api/user-interests/:id`

Fetch a single user interest by interest ID.

**Auth required:** yes

**Response `200`**
```json
{ "userInterest": { "userId": "uuid", "interestId": "uuid", "interestName": "photography" } }
```

**Errors:** `400` invalid id · `401` unauthenticated · `404` not found

---

#### `POST /api/user-interests`

Add one or more interests to the authenticated user. The total after adding must not exceed **5**.

**Auth required:** yes

**Request body**
```json
{ "interestIds": ["uuid", "uuid"] }
```

**Response `201`**
```json
{
  "userInterests": [
    { "userId": "uuid", "interestId": "uuid", "interestName": "photography" }
  ]
}
```

**Errors:** `400` would exceed 5 interests or `interestId` does not exist · `401` unauthenticated · `409` interest already added · `500` server error

---

#### `PATCH /api/user-interests/:id`

Replace one interest with another (`:id` is the current interest ID).

**Auth required:** yes

**Request body**
```json
{ "interestId": "uuid" }
```

If the new `interestId` equals the current one the request is a no-op and returns the existing record.

**Response `200`**
```json
{ "userInterest": { "userId": "uuid", "interestId": "uuid", "interestName": "hiking" } }
```

**Errors:** `400` `interestId` does not exist · `401` unauthenticated · `404` current interest not found · `409` new interest already added · `500` server error

---

#### `DELETE /api/user-interests/:id`

Remove an interest from the authenticated user. The user must retain at least **3** interests.

**Auth required:** yes

**Response `204`** — no body

**Errors:** `400` would drop below 3 interests · `401` unauthenticated · `404` not found · `500` server error

---

### Venues

Base path: `/api/venues`

---

#### `GET /api/venues`

List all venues. No auth required.

**Response `200`**
```json
{
  "venues": [
    {
      "id": "uuid",
      "name": "The Grand Café",
      "venueType": "bar",
      "address": "Coolsingel 1, Rotterdam",
      "description": "Classic brown café",
      "latitude": 51.922,
      "longitude": 4.479,
      "suggestedOrder": 1,
      "vibe": "cosy"
    }
  ]
}
```

---

#### `GET /api/venues/:id`

Fetch a single venue. No auth required.

**Response `200`**
```json
{ "venue": { "id": "uuid", "name": "The Grand Café", "..." : "..." } }
```

**Errors:** `400` invalid id · `404` not found

---

#### `POST /api/venues`

Create a venue.

**Auth required:** yes

**Request body**
```json
{
  "name": "The Grand Café",
  "venueType": "bar",
  "address": "Coolsingel 1, Rotterdam",
  "description": "Classic brown café",
  "latitude": 51.922,
  "longitude": 4.479,
  "suggestedOrder": 1,
  "vibe": "cosy"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | yes | trimmed, min 1 |
| `venueType` | string | yes | trimmed, min 1 |
| `address` | string | yes | trimmed, min 1 |
| `description` | string | no | trimmed |
| `latitude` | number | no | finite |
| `longitude` | number | no | finite |
| `suggestedOrder` | number | no | |
| `vibe` | string | no | trimmed |

**Response `201`**
```json
{ "venue": { "id": "uuid", "..." : "..." } }
```

**Errors:** `400` validation failure · `500` server error

---

#### `PATCH /api/venues/:id`

Update a venue. All fields optional.

**Auth required:** yes

**Response `200`**
```json
{ "venue": { "id": "uuid", "..." : "..." } }
```

**Errors:** `400` no fields provided or validation failure · `404` not found · `500` server error

---

#### `DELETE /api/venues/:id`

Delete a venue.

**Auth required:** yes

**Response `204`** — no body

**Errors:** `400` invalid id · `404` not found · `409` venue is used in a route (routeStops) · `500` server error

---

### Photos

Base path: `/api/photos`

Stores photo proof metadata for session stops. The route can also store an existing base64 image payload via `imageBase64`; no external upload provider is used.

At least one source must be present:

- `photoUrl`
- `localUri`
- `imageBase64`

When `imageBase64` is used, the file is stored locally by the API and the response contains a local `photoUrl` like `/api/photos/:id/file`.

---

#### `GET /api/photos`

List photos. No auth required.

**Query filters:** `sessionStopId`, `uploadedByGroupId`

**Response `200`**

```json
{
  "result": {
    "photos": [
      {
        "id": "uuid",
        "sessionStopId": "uuid",
        "uploadedByGroupId": "uuid",
        "photoUrl": "https://example.com/test-photo.jpg",
        "localUri": null,
        "proofType": "venue_proof",
        "createdAt": "2026-06-14 10:00:00"
      }
    ]
  }
}
```

**Errors:** `400` invalid query · `500` server error

---

#### `GET /api/photos/:id`

Fetch one photo metadata record. No auth required.

**Errors:** `400` invalid id · `404` not found · `500` server error

---

#### `GET /api/photos/:id/file`

Returns the locally stored image file when the photo was created with `imageBase64`.

**Errors:** `400` invalid id · `404` photo or stored file not found

---

#### `POST /api/photos`

Create a photo.

**Auth required:** yes

```json
{
  "sessionStopId": "uuid",
  "uploadedByGroupId": "uuid",
  "photoUrl": "https://example.com/test-photo.jpg",
  "proofType": "venue_proof"
}
```

Alternative with local metadata:

```json
{
  "sessionStopId": "uuid",
  "uploadedByGroupId": "uuid",
  "localUri": "file:///data/user/0/app/cache/test-photo.jpg",
  "proofType": "venue_proof"
}
```

Alternative with local file storage:

```json
{
  "sessionStopId": "uuid",
  "imageBase64": "data:image/jpeg;base64,...",
  "fileName": "proof-photo.jpg",
  "mimeType": "image/jpeg"
}
```

**Validation:**

- `sessionStopId` is required and must exist.
- `uploadedByGroupId` is optional, but must exist when provided.
- Empty source strings are rejected.
- `id` and `createdAt` are generated by the API/database.
- `proofType` defaults to `venue_proof`.

**Errors:** `400` validation failure, missing source, unknown `sessionStopId`, unknown `uploadedByGroupId`, unsupported image type, empty image, or image too large · `500` server error

---

#### `PATCH /api/photos/:id`

Update a photo. All fields are optional, but the body may not be empty. After merging with the existing record, at least one of `photoUrl`, `localUri`, or stored file data must remain.

**Auth required:** yes

```json
{
  "proofType": "group_photo"
}
```

To remove one source while another remains:

```json
{
  "photoUrl": null
}
```

**Errors:** `400` validation failure, no fields provided, missing final source, unknown `sessionStopId`, or unknown `uploadedByGroupId` · `404` not found · `500` server error

---

#### `DELETE /api/photos/:id`

Delete a photo.

**Auth required:** yes

**Response `204`** - no body

**Errors:** `400` invalid id · `404` not found · `500` server error

---

### Collages

Base path: `/api/collages`

Manages one collage per game session. `sessionId` is unique, so a game session can have at most one collage. `shareToken` is optional and unique when provided. Deleting a game session cascades to its collage; deleting a collage cascades to its collage-photo records.

---

#### `GET /api/collages`

List collages. No auth required.

**Query filters:** `sessionId`, `shareToken`

**Response `200`**

```json
{
  "result": {
    "collages": [
      {
        "id": "uuid",
        "sessionId": "game-session-id",
        "title": "Witte de With Memories",
        "collageUrl": null,
        "layoutType": "five_stop_grid",
        "shareToken": "share-token",
        "createdAt": "2026-06-14 10:00:00"
      }
    ]
  }
}
```

**Errors:** `400` invalid query · `500` server error

---

#### `GET /api/collages/:id`

Fetch one collage with linked photos ordered by `displayOrder`. No auth required.

**Errors:** `400` invalid id · `404` not found · `500` server error

---

#### `POST /api/collages`

Create a collage.

**Auth required:** yes

```json
{
  "sessionId": "game-session-id",
  "title": "Witte de With Memories",
  "collageUrl": "https://example.com/collages/witte-de-with.jpg",
  "layoutType": "five_stop_grid",
  "shareToken": "witte-de-with-share"
}
```

**Validation:**

- `sessionId` is required and must exist.
- `sessionId` can only have one collage.
- `title` is required.
- `layoutType` defaults to `five_stop_grid` when omitted.
- `shareToken` is optional but must be unique when provided.
- `id` and `createdAt` are generated by the API/database.

**Errors:** `400` validation failure · `404` unknown `sessionId` · `409` duplicate `sessionId` or `shareToken` · `500` server error

---

#### `PATCH /api/collages/:id`

Update a collage. `sessionId`, `id`, and `createdAt` are not mutable through this endpoint.

**Auth required:** yes

```json
{
  "title": "Updated collage title",
  "shareToken": "updated-share-token"
}
```

**Errors:** `400` validation failure or no fields provided · `404` not found · `409` duplicate `shareToken` · `500` server error

---

#### `DELETE /api/collages/:id`

Delete a collage. Linked `collage_photos` records are removed by database cascade.

**Auth required:** yes

**Response `204`** - no body

**Errors:** `400` invalid id · `404` not found · `500` server error

---

### Collage Photos

Base path: `/api/collage-photos`

Manages the relation between collages and photos. Deleting a collage or photo removes the linked collage-photo records by database cascade. Deleting a collage-photo record does not delete the underlying photo or collage.

---

#### `GET /api/collage-photos`

List collage-photo records. No auth required. When filtering by `collageId`, results are ordered by `displayOrder`.

**Query filters:** `collageId`, `photoId`

**Response `200`**

```json
{
  "result": {
    "collagePhotos": [
      {
        "id": "uuid",
        "collageId": "collage-id",
        "photoId": "photo-id",
        "displayOrder": 1,
        "caption": "First stop"
      }
    ]
  }
}
```

**Errors:** `400` invalid query · `500` server error

---

#### `GET /api/collage-photos/:id`

Fetch one collage-photo record with linked photo metadata. No auth required.

**Errors:** `400` invalid id · `404` not found · `500` server error

---

#### `POST /api/collage-photos`

Create a collage-photo relation.

**Auth required:** yes

```json
{
  "collageId": "collage-id",
  "photoId": "photo-id",
  "displayOrder": 1,
  "caption": "First venue proof"
}
```

**Validation:**

- `collageId` and `photoId` are required and must exist.
- `displayOrder` must be an integer greater than `0`.
- Within one collage, each `displayOrder` can be used once.
- Within one collage, each `photoId` can be used once.

**Errors:** `400` validation failure · `404` unknown `collageId` or `photoId` · `409` duplicate `displayOrder` or duplicate `photoId` within the collage · `500` server error

---

#### `PATCH /api/collage-photos/:id`

Update `displayOrder` or `caption`.

**Auth required:** yes

```json
{
  "displayOrder": 2,
  "caption": "Updated caption"
}
```

**Errors:** `400` validation failure or no fields provided · `404` not found · `409` duplicate `displayOrder` within the collage · `500` server error

---

#### `DELETE /api/collage-photos/:id`

Delete only the collage-photo relation.

**Auth required:** yes

**Response `204`** - no body

**Errors:** `400` invalid id · `404` not found · `500` server error

---

### Partners

Base path: `/api/partners`

Manages partner profiles for venues and organizations. Partner passwords are hashed before storage and are never returned in API responses. A `userId` can be linked to at most one partner profile.

---

#### `GET /api/partners`

List partners. No auth required.

**Query filters:** `status`, `partnershipType`, `userId`

**Response `200`**

```json
{
  "partners": [
    {
      "id": "uuid",
      "userId": "uuid",
      "organizationName": "Cafe Partner",
      "contactEmail": "partner@example.com",
      "partnershipType": "cafe",
      "status": "prospect",
      "createdAt": "2026-06-14T10:00:00.000Z"
    }
  ]
}
```

**Errors:** `400` invalid query · `500` server error

---

#### `GET /api/partners/:id`

Fetch one partner and its venue partnerships. No auth required.

**Response `200`** returns `partner` and `venuePartnerships`. The `password` field is never included.

**Errors:** `400` invalid id · `404` not found · `500` server error

---

#### `POST /api/partners`

Create a partner profile.

**Auth required:** yes

```json
{
  "userId": "uuid",
  "password": "StrongPassword123",
  "organizationName": "Cafe Partner",
  "contactEmail": "partner@example.com",
  "partnershipType": "cafe",
  "status": "prospect"
}
```

**Errors:** `400` validation failure or unknown `userId` · `409` user already has a partner profile · `500` server error

---

#### `PATCH /api/partners/:id`

Update a partner profile. All fields are optional, but the body may not be empty. Updating `password` stores a new hash.

**Auth required:** yes

```json
{
  "organizationName": "Updated Partner",
  "status": "active"
}
```

**Errors:** `400` validation failure or unknown `userId` · `404` not found · `409` user already has a partner profile · `500` server error

---

#### `DELETE /api/partners/:id`

Delete a partner profile.

**Auth required:** yes

**Response `204`** - no body

**Note:** linked venue partnerships are removed by database cascade.

**Errors:** `400` invalid id · `404` not found · `500` server error

---

### Venue Partnerships

Base path: `/api/venue-partnerships`

Manages deals between venues and partners. Deleting a venue or partner can remove linked venue partnerships through database cascades.

---

#### `GET /api/venue-partnerships`

List venue partnerships. No auth required.

**Query filters:** `venueId`, `partnerId`, `active=true|false`, `currentlyActive=true|false`

`currentlyActive=true` returns deals where `active` is true, `startsAt` is empty or not in the future, and `endsAt` is empty or not in the past.

**Response `200`**

```json
{
  "venuePartnerships": [
    {
      "id": "uuid",
      "venueId": "uuid",
      "partnerId": "uuid",
      "dealTitle": "Student coffee deal",
      "dealDescription": "10% off for student groups",
      "startsAt": "2026-06-14T10:00:00.000Z",
      "endsAt": "2026-07-14T10:00:00.000Z",
      "active": true
    }
  ]
}
```

**Errors:** `400` invalid query · `500` server error

---

#### `GET /api/venue-partnerships/:id`

Fetch one venue partnership with safe venue and partner details. Partner passwords are never included.

**Errors:** `400` invalid id · `404` not found · `500` server error

---

#### `POST /api/venue-partnerships`

Create a venue partnership.

**Auth required:** yes

```json
{
  "venueId": "uuid",
  "partnerId": "uuid",
  "dealTitle": "Student coffee deal",
  "dealDescription": "10% off for student groups",
  "startsAt": "2026-06-14T10:00:00.000Z",
  "endsAt": "2026-07-14T10:00:00.000Z",
  "active": true
}
```

**Errors:** `400` validation failure, unknown `venueId`/`partnerId`, or `endsAt` before `startsAt` · `409` duplicate deal · `500` server error

---

#### `PATCH /api/venue-partnerships/:id`

Update a venue partnership. All fields are optional, but the body may not be empty. Date order is checked against the new values and existing stored values.

**Auth required:** yes

```json
{
  "dealTitle": "Updated student deal",
  "active": false
}
```

**Errors:** `400` validation failure, unknown `venueId`/`partnerId`, or `endsAt` before `startsAt` · `404` not found · `409` duplicate deal · `500` server error

---

#### `DELETE /api/venue-partnerships/:id`

Delete a venue partnership.

**Auth required:** yes

**Response `204`** - no body

**Errors:** `400` invalid id · `404` not found · `500` server error

---

### Thema Routes

Base path: `/api/thema-route`

Manages route themes (`routeThemes`). A theme describes the mood and style of a pub-hop route (e.g. "Classic Pub Crawl").

---

#### `GET /api/thema-route`

List all thema routes. No auth required.

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `active` | boolean | Filter by active status (`true` or `false`) |

**Response `200`**
```json
{
  "themaRoutes": [
    {
      "id": "uuid",
      "name": "Classic Pub Crawl",
      "description": "A great starter route.",
      "mood": "casual",
      "active": true
    }
  ]
}
```

**Errors:** `400` invalid query params

---

#### `GET /api/thema-route/:id`

Fetch a single thema route by ID. No auth required.

**Response `200`**
```json
{ "themaRoute": { "id": "uuid", "name": "Classic Pub Crawl", "description": "...", "mood": "casual", "active": true } }
```

**Errors:** `400` invalid id · `404` not found

---

#### `POST /api/thema-route`

Create a new thema route.

**Auth required:** yes

**Request body**
```json
{
  "name": "Classic Pub Crawl",
  "description": "A great starter route.",
  "mood": "casual",
  "active": true
}
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | yes |
| `description` | string | no |
| `mood` | string | no |
| `active` | boolean | no (defaults to `true`) |

**Response `201`**
```json
{ "themaRoute": { "id": "uuid", "name": "Classic Pub Crawl", "..." : "..." } }
```

**Errors:** `400` validation failure · `401` unauthenticated · `409` name already exists · `500` server error

---

#### `PATCH /api/thema-route/:id`

Update a thema route. All fields optional.

**Auth required:** yes

**Request body** (all fields optional)
```json
{
  "name": "Updated Name",
  "active": false
}
```

At least one field must be provided.

**Response `200`**
```json
{ "themaRoute": { "id": "uuid", "name": "Updated Name", "..." : "..." } }
```

**Errors:** `400` no fields provided or validation failure · `401` unauthenticated · `404` not found · `409` name already taken · `500` server error

---

#### `DELETE /api/thema-route/:id`

Delete a thema route.

**Auth required:** yes

**Response `204`** — no body

**Errors:** `400` invalid id · `401` unauthenticated · `404` not found · `409` thema route is referenced by an active route (foreign-key constraint) · `500` server error

---

### Routes

Base path: `/api/routes`

A route is a concrete pub-hop path through a city. It optionally belongs to a thema route (`themeId`) and is composed of ordered [route stops](#route-stops).

> **Response envelope:** Route and route-stop endpoints wrap their payload in a `result` field: `{ "result": <data>, "message": <optional string> }`. List endpoints place the collection under a named key inside `result` (e.g. `result.routes`).

---

#### `GET /api/routes`

List all routes. No auth required.

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `themeId` | string | Filter by thema route id |
| `active` | boolean | Filter by active status (`true` or `false`) |

**Response `200`**
```json
{
  "result": {
    "routes": [
      {
        "id": "uuid",
        "themeId": "uuid",
        "name": "Rotterdam Nights",
        "area": "City Centre",
        "city": "Rotterdam",
        "routeType": "social",
        "active": true
      }
    ]
  }
}
```

**Errors:** `400` invalid query params

---

#### `GET /api/routes/:id`

Fetch a single route by ID. No auth required.

**Response `200`**
```json
{ "result": { "id": "uuid", "themeId": "uuid", "name": "Rotterdam Nights", "area": "City Centre", "city": "Rotterdam", "routeType": "social", "active": true } }
```

**Errors:** `404` not found

---

#### `POST /api/routes`

Create a route.

**Auth required:** yes

**Request body**
```json
{
  "themeId": "uuid-or-null",
  "name": "Rotterdam Nights",
  "area": "City Centre",
  "city": "Rotterdam",
  "routeType": "social",
  "active": true
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `themeId` | string (uuid) \| null | no | must reference an existing thema route if provided |
| `name` | string | yes | trimmed, 1–120 chars |
| `area` | string | yes | trimmed, 1–120 chars |
| `city` | string | no | trimmed, 1–120 chars (defaults to `Rotterdam`) |
| `routeType` | string | no | trimmed, 1–80 chars (defaults to `social`) |
| `active` | boolean | no | defaults to `true` |

**Response `201`**
```json
{ "result": { "id": "uuid", "..." : "..." } }
```

**Errors:** `400` validation failure or `themeId` does not exist · `401` unauthenticated · `500` server error

---

#### `PATCH /api/routes/:id`

Update a route. All fields optional, but at least one must be provided.

**Auth required:** yes

**Response `200`**
```json
{ "result": { "id": "uuid", "..." : "..." } }
```

**Errors:** `400` no fields provided, validation failure, or `themeId` does not exist · `401` unauthenticated · `404` not found · `500` server error

---

#### `DELETE /api/routes/:id`

Delete a route.

**Auth required:** yes

**Response `204`** — no body

**Errors:** `401` unauthenticated · `404` not found · `409` route is currently used by a game session (or otherwise referenced) · `500` server error

---

### Route Stops

Base path: `/api/route-stops`

A route stop links a [venue](#venues) to a [route](#routes) at a given position (`routeOrder`). Within one route, both the `routeOrder` and the `venueId` must be unique.

---

#### `GET /api/route-stops`

List all route stops. No auth required.

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `routeId` | string | Filter by route |
| `venueId` | string | Filter by venue |

**Response `200`**
```json
{
  "result": {
    "routeStops": [
      {
        "id": "uuid",
        "routeId": "uuid",
        "venueId": "uuid",
        "routeOrder": 1,
        "plannedDurationMinutes": 45,
        "walkLabel": "5 min walk"
      }
    ]
  }
}
```

**Errors:** `400` invalid query params

---

#### `GET /api/route-stops/:id`

Fetch a single route stop by ID. No auth required.

**Response `200`**
```json
{ "result": { "id": "uuid", "routeId": "uuid", "venueId": "uuid", "routeOrder": 1, "plannedDurationMinutes": 45, "walkLabel": "5 min walk" } }
```

**Errors:** `404` not found

---

#### `POST /api/route-stops`

Create a route stop.

**Auth required:** yes

**Request body**
```json
{
  "routeId": "uuid",
  "venueId": "uuid",
  "routeOrder": 1,
  "plannedDurationMinutes": 45,
  "walkLabel": "5 min walk"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `routeId` | string (uuid) | yes | must reference an existing route |
| `venueId` | string (uuid) | yes | must reference an existing venue |
| `routeOrder` | number | yes | positive integer; unique within the route |
| `plannedDurationMinutes` | number | no | positive integer, max `45` (defaults to `45`) |
| `walkLabel` | string | no | trimmed, 1–120 chars |

**Response `201`**
```json
{ "result": { "id": "uuid", "..." : "..." } }
```

**Errors:** `400` validation failure or `routeId`/`venueId` does not exist · `401` unauthenticated · `409` `routeOrder` or `venueId` already exists for this route · `500` server error

---

#### `PATCH /api/route-stops/:id`

Update a route stop. All fields optional, but at least one must be provided.

**Auth required:** yes

**Response `200`**
```json
{ "result": { "id": "uuid", "..." : "..." } }
```

**Errors:** `400` no fields provided, validation failure, or `routeId`/`venueId` does not exist · `401` unauthenticated · `404` not found · `409` `routeOrder` or `venueId` already exists for this route · `500` server error

---

#### `DELETE /api/route-stops/:id`

Delete a route stop.

**Auth required:** yes

**Response `204`** — no body

**Errors:** `401` unauthenticated · `404` not found · `409` route stop is currently used by a session · `500` server error

---

### Conversation Starters

Base path: `/api/conversation-starters`

---

#### `GET /api/conversation-starters`

List conversation starters, optionally filtered. No auth required.

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `interestsId` | string (uuid) | Filter by interest |
| `triggerMinute` | number | Filter by trigger minute (`0`, `5`, `10`, … `45`) |

**Response `200`**
```json
{
  "conversationStarters": [
    {
      "id": "uuid",
      "interestsId": "uuid",
      "interestName": "icebreaker",
      "prompt": "What would your perfect Saturday look like?",
      "triggerMinute": 10
    }
  ]
}
```

**Errors:** `400` invalid query params

---

#### `GET /api/conversation-starters/:id`

Fetch a single conversation starter. No auth required.

**Response `200`**
```json
{ "conversationStarter": { "id": "uuid", "..." : "..." } }
```

**Errors:** `404` not found

---

#### `POST /api/conversation-starters`

Create a conversation starter.

**Auth required:** yes

**Request body**
```json
{
  "interestsId": "uuid-or-null",
  "prompt": "What would your perfect Saturday look like?",
  "triggerMinute": 10
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `interestsId` | string (uuid) | no | must be a valid interest id if provided |
| `prompt` | string | yes | trimmed, min 1 |
| `triggerMinute` | number | yes | one of `0 5 10 15 20 25 30 35 40 45` |

`GET` responses also include `interestName` (the linked interest's `name`, or `null` if `interestsId` is `null`).

**Response `201`**
```json
{ "conversationStarter": { "id": "uuid", "..." : "..." } }
```

**Errors:** `400` validation failure or interestsId not found · `500` server error

---

#### `PATCH /api/conversation-starters/:id`

Update a conversation starter. All fields optional.

**Auth required:** yes

**Response `200`**
```json
{ "conversationStarter": { "id": "uuid", "..." : "..." } }
```

**Errors:** `400` no fields or validation failure · `404` not found · `500` server error

---

#### `DELETE /api/conversation-starters/:id`

Delete a conversation starter.

**Auth required:** yes

**Response `204`** — no body

**Errors:** `404` not found · `500` server error

---

### Matches

Base path: `/api/matches`

---

#### `GET /api/matches/me`

Return the authenticated user's match history, ordered by most recent.

**Auth required:** yes

**Response `200`**
```json
{
  "matches": [
    {
      "id": "uuid",
      "groupId": "uuid",
      "sessionId": "uuid",
      "matchScore": 87,
      "status": "accepted",
      "matchedAt": "2026-06-09T19:00:00.000Z",
      "groupName": "Night Owls",
      "groupSize": 4,
      "selectedTimeSlot": "2026-06-10T19:00",
      "matchStatus": "matched"
    }
  ]
}
```

**Errors:** `401` unauthenticated

---

### Sessions

Base path: `/api/sessions`

---

#### `GET /api/sessions/me`

Return the authenticated user's current active or setup session.

**Auth required:** yes

**Response `200`**
```json
{
  "session": {
    "id": "uuid",
    "groupId": "uuid",
    "routeId": "uuid",
    "themeId": "uuid",
    "selectedTimeSlot": "2026-06-10T19:00",
    "status": "active",
    "currentStopIndex": 0,
    "startedAt": "2026-06-10T19:05:00.000Z"
  }
}
```

**Errors:** `401` unauthenticated · `404` no active session found

---

#### `GET /api/sessions/:id`

Fetch full session details. Caller must be a group member.

**Auth required:** yes

**Response `200`**
```json
{
  "session": {
    "id": "uuid",
    "groupId": "uuid",
    "routeId": "uuid",
    "themeId": "uuid",
    "selectedTimeSlot": "2026-06-10T19:00",
    "status": "active",
    "currentStopIndex": 1,
    "startedAt": "2026-06-10T19:05:00.000Z",
    "completedAt": null
  },
  "group": {
    "id": "uuid",
    "groupName": "Night Owls",
    "groupSize": 4,
    "selectedTimeSlot": "2026-06-10T19:00",
    "matchStatus": "matched"
  },
  "members": [
    {
      "userId": "uuid",
      "role": "leader",
      "joinedAt": "2026-06-10T18:50:00.000Z",
      "name": "Alice",
      "school": "EUR",
      "campus": "Woudestein"
    }
  ],
  "route": {
    "id": "uuid",
    "name": "Rotterdam Nights",
    "area": "City Centre",
    "city": "Rotterdam",
    "routeType": "social"
  },
  "stops": [
    {
      "id": "uuid",
      "routeStopId": "uuid",
      "timerState": "idle",
      "arrivedAt": null,
      "timerStartedAt": null,
      "timerFinishedAt": null,
      "completedAt": null,
      "routeOrder": 1,
      "plannedDurationMinutes": 30,
      "walkLabel": "5 min walk",
      "venueId": "uuid",
      "venueName": "The Grand Café",
      "venueType": "bar",
      "venueAddress": "Coolsingel 1, Rotterdam",
      "latitude": 51.922,
      "longitude": 4.479,
      "vibe": "cosy"
    }
  ]
}
```

**Errors:** `401` unauthenticated · `403` not a member of this group · `404` session not found

---

#### `POST /api/sessions/:id/activate`

Immediately activate a session that is in `setup` status.

**Auth required:** yes

**Request body:** none

**Response `200`**
```json
{
  "message": "Session activated",
  "sessionId": "uuid"
}
```

**Errors:** `401` unauthenticated · `403` not a member · `404` session not found · `409` session is not in `setup` status

---

## Socket.IO Events

The Socket.IO server is mounted on the same port as the HTTP server.

### Connection

Authenticate by passing the JWT access token when connecting:

```js
import { io } from "socket.io-client"

const socket = io("http://localhost:8000", {
  auth: { token: "<access_jwt>" },
  transports: ["websocket"],
})
```

The server also accepts the token from:
- `socket.handshake.auth.token`
- `Authorization: Bearer <token>` header
- `access_token` cookie

On successful authentication `socket.data` contains `{ userId, email }`.

On reconnect, if the user is still in a party, the server automatically emits `party:updated` with the current party state so the client can restore its UI without any extra call.

**Rooms**

| Room name | Description |
|-----------|-------------|
| `user:<userId>` | Personal notifications |
| `party:<partyId>` | Broadcast to all party members |
| `session:<sessionId>` | Broadcast to all session players |

---

### Client → Server Events

All events use the acknowledgement pattern. The callback receives `{ ok: true, ... }` on success, or `{ ok: false, error: { code, message } }` on failure. On failure the server **also** emits an [`error:matchmaking`](#errormatchmaking) event to the calling socket with the same `{ code, message }`.

```js
socket.emit("party:create", {}, (ack) => {
  if (!ack.ok) console.error(ack.error.code, ack.error.message)
})
```

---

#### `party:create`

Create a new party. The caller becomes the leader.

**Payload:** none

**Ack**
```json
{
  "ok": true,
  "party": {
    "id": "uuid",
    "inviteCode": "ABCD12",
    "leaderId": "userId",
    "status": "idle",
    "selectedTimeSlot": null,
    "enqueuedAt": null,
    "members": [{ "userId": "uuid", "name": "Alice", "school": "EUR", "campus": "Woudestein" }]
  }
}
```

---

#### `party:join`

Join an existing party by invite code.

**Payload**
```json
{ "inviteCode": "ABCD12" }
```

**Ack** — same shape as `party:create`

---

#### `party:leave`

Leave the current party. If you are the last member, the party is dissolved.

**Payload:** none

**Ack**
```json
{ "ok": true, "left": true, "dissolved": false }
```

---

#### `party:kick`

Kick a member from the party. Leader only.

**Payload**
```json
{ "userId": "uuid" }
```

**Ack** — same shape as `party:create`

---

#### `party:status`

Get current party status and queue statistics.

**Payload:** none

**Ack** — when not in a party:
```json
{ "ok": true, "inParty": false }
```

When in a party:
```json
{
  "ok": true,
  "inParty": true,
  "party": { "..." : "..." },
  "bucket": { "parties": 2, "players": 4 }
}
```

`bucket` is `null` if the party has not yet queued for a time slot.

---

#### `party:queue`

Queue the party for matchmaking at a given time slot.

**Payload**
```json
{ "selectedTimeSlot": "2026-06-10T19:00" }
```

**Ack**
```json
{
  "ok": true,
  "party": { "..." : "..." },
  "bucket": { "parties": 1, "players": 2 }
}
```

---

#### `party:unqueue`

Remove the party from the matchmaking queue.

**Payload:** none

**Ack**
```json
{ "ok": true, "party": { "..." : "..." } }
```

---

#### `session:ready`

Signal that the player is ready to start a session.

**Payload**
```json
{ "sessionId": "uuid" }
```

**Ack**
```json
{ "ok": true, "ready": 3, "total": 4 }
```

Once `ready === total`, the server fires `session:started` to the session room.

---

#### `stop:start`

Start the timer for a stop in an active session. The caller must be a member of the session and the stop's timer must currently be `not_started`. Starting a stop launches the [conversation starter](#conversationstarter) stream for that stop (a starter at minute 0, then one every 5 minutes up to the stop's `plannedDurationMinutes`).

**Payload**
```json
{ "sessionId": "uuid", "stopId": "uuid" }
```

**Ack**
```json
{ "ok": true, "stopId": "uuid", "sessionId": "uuid" }
```

On success the server broadcasts [`stop:timer:started`](#stoptimerstarted) to the session room.

**Error codes:** `INVALID_STOP`, `INVALID_SESSION`, `STOP_NOT_FOUND`, `INVALID_STATE` (timer not `not_started`), `NOT_MEMBER`, `START_FAILED`

---

#### `stop:finish`

Finish the timer for a stop. The caller must be a session member and the stop's timer must currently be `running`. Finishing the stop stops its conversation starter stream.

**Payload**
```json
{ "sessionId": "uuid", "stopId": "uuid" }
```

**Ack**
```json
{ "ok": true, "stopId": "uuid", "sessionId": "uuid" }
```

On success the server broadcasts [`stop:timer:finished`](#stoptimerfinished) to the session room.

**Error codes:** `INVALID_STOP`, `INVALID_SESSION`, `STOP_NOT_FOUND`, `INVALID_STATE` (timer not `running`), `NOT_MEMBER`, `FINISH_FAILED`

---

### Server → Client Events

---

#### `party:updated`

Fired to the party room whenever party membership or status changes.

```json
{
  "id": "uuid",
  "inviteCode": "ABCD12",
  "leaderId": "userId",
  "status": "queued",
  "selectedTimeSlot": "2026-06-10T19:00",
  "enqueuedAt": 1749500000000,
  "members": [{ "userId": "uuid", "name": "Alice", "school": "EUR", "campus": "Woudestein" }]
}
```

---

#### `party:dissolved`

Two scenarios:

**Kicked** — sent only to the kicked user's personal `user:<id>` room:
```json
{ "partyId": "uuid", "reason": "kicked" }
```

**Dissolved** — sent to the entire party room when the last member leaves:
```json
{ "partyId": "uuid" }
```

---

#### `queue:update`

Two shapes depending on context.

**Party queued** — fired to the party room when the party joins the matchmaking queue:
```json
{ "selectedTimeSlot": "2026-06-10T19:00", "parties": 2, "players": 4 }
```

**Session readiness** — fired to the session room each time a player sends `session:ready`:
```json
{ "sessionId": "uuid", "ready": 3, "total": 4 }
```

---

#### `match:found`

Fired to each matched party when a match is successfully created.

```json
{
  "matchScore": 87,
  "group": { "id": "uuid", "groupName": "Night Owls", "groupSize": 4 },
  "session": { "id": "uuid", "status": "setup", "selectedTimeSlot": "..." },
  "route": { "id": "uuid", "name": "Rotterdam Nights", "..." : "..." },
  "stops": [...],
  "members": [...]
}
```

---

#### `session:started`

Fired to the session room once all players have sent `session:ready`.

```json
{
  "sessionId": "uuid",
  "startedAt": "2026-06-10T19:05:00.000Z"
}
```

---

#### `stop:timer:started`

Fired to the session room when a player starts a stop's timer via [`stop:start`](#stopstart).

```json
{ "stopId": "uuid", "sessionId": "uuid" }
```

---

#### `stop:timer:finished`

Fired to the session room when a player finishes a stop's timer via [`stop:finish`](#stopfinish).

```json
{ "stopId": "uuid", "sessionId": "uuid" }
```

---

#### `conversation:starter`

Pushed to the session room while a stop timer is running — once immediately when the stop starts (`triggerMinute: 0`), then every 5 minutes until the stop's `plannedDurationMinutes` is reached. Starters are chosen to favour interests shared by 2+ group members and are never repeated within the same session.

```json
{
  "starter": {
    "id": "uuid",
    "interestsId": "uuid-or-null",
    "prompt": "What would your perfect Saturday look like?",
    "triggerMinute": 0
  },
  "triggerMinute": 0,
  "stopId": "uuid"
}
```

---

#### `error:matchmaking`

Fired to the calling socket when a socket event handler encounters an error. Mirrors the `error` object returned in the failing event's ack.

```json
{ "code": "PARTY_NOT_FOUND", "message": "No active party found" }
```

---

## WebSocket Quickstart — Mobile Integration

This guide walks through wiring the realtime party + session system into a mobile app (React Native / Expo, but the steps apply to any Socket.IO client). The server speaks **Socket.IO** — use a Socket.IO client, *not* a bare `WebSocket`.

The lifecycle you are implementing looks like this:

```
login (REST)  ─►  connect socket  ─►  create / join party  ─►  queue for a time slot
      ▲                                                                │
      │                                                          match:found
   access_token                                                       │
                                              session:ready  ◄─────────┘
                                                    │
                                             session:started  ─►  stop:start / stop:finish
                                                                         │
                                                                conversation:starter (×N)
```

---

### Step 1 — Install the client

```bash
npm install socket.io-client
```

> Use a Socket.IO client version compatible with the server's Socket.IO v4 protocol. `socket.io-client@4.x` works for React Native, Expo, and plain JS.

---

### Step 2 — Authenticate over REST first

The socket connection needs a JWT access token. Obtain one by calling `POST /api/auth/login` (or `/register`). On mobile there is no cookie jar you can rely on, so **read the `token` field from the JSON response and keep it** (e.g. in `expo-secure-store`).

```js
const res = await fetch("https://your-api.example.com/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
})
const { token } = await res.json() // <-- access JWT
await SecureStore.setItemAsync("access_token", token)
```

---

### Step 3 — Connect the socket with the token

Pass the token via `auth.token` in the handshake. Force the WebSocket transport on mobile (long-polling fallback is flaky on React Native).

```js
import { io } from "socket.io-client"

const socket = io("https://your-api.example.com", {
  auth: { token },          // sent on every (re)connection
  transports: ["websocket"],
  autoConnect: true,
})

socket.on("connect", () => console.log("connected", socket.id))
socket.on("connect_error", (err) => console.warn("auth/connect failed:", err.message))
```

If the token is missing, invalid, or expired the server rejects the handshake and fires `connect_error` with a message such as `"Invalid or expired token"`. When that happens, refresh the token (`POST /api/auth/refresh`) or send the user back to login, update `socket.auth.token`, and call `socket.connect()` again.

---

### Step 4 — Register your event listeners *before* emitting

Attach all server → client listeners once, right after creating the socket, so no broadcast is missed:

```js
socket.on("party:updated", (party) => updatePartyUI(party))
socket.on("party:dissolved", ({ partyId, reason }) => leavePartyUI(reason))
socket.on("queue:update", (data) => updateQueueUI(data))
socket.on("match:found", (match) => showMatchScreen(match))
socket.on("session:started", ({ sessionId, startedAt }) => startSessionUI(sessionId))
socket.on("stop:timer:started", ({ stopId }) => markStopRunning(stopId))
socket.on("stop:timer:finished", ({ stopId }) => markStopDone(stopId))
socket.on("conversation:starter", ({ starter, triggerMinute }) => showStarter(starter, triggerMinute))
socket.on("error:matchmaking", ({ code, message }) => toast(`${code}: ${message}`))
```

---

### Step 5 — Create or join a party

Every client → server event takes an **acknowledgement callback**. Always check `ack.ok`:

```js
// Leader creates a party
socket.emit("party:create", {}, (ack) => {
  if (!ack.ok) return toast(ack.error.message)
  showInviteCode(ack.party.inviteCode) // share this code with friends
})

// Friends join with the code
socket.emit("party:join", { inviteCode: "ABCD12" }, (ack) => {
  if (!ack.ok) return toast(ack.error.message)
  updatePartyUI(ack.party)
})
```

All members in the party room also receive a `party:updated` broadcast, so you can drive your UI purely from that event and treat the ack as a success/failure check.

---

### Step 6 — Queue for matchmaking

The leader picks a time slot and queues. The server matches parties in the same time-slot bucket automatically.

```js
socket.emit("party:queue", { selectedTimeSlot: "2026-06-10T19:00" }, (ack) => {
  if (!ack.ok) return toast(ack.error.message)
  showQueueScreen(ack.bucket) // { parties, players } waiting in this slot
})
```

While queued you'll receive `queue:update` events as the bucket fills, and eventually `match:found` once a group is formed. Call `party:unqueue` to back out.

---

### Step 7 — Handle the match and signal readiness

When `match:found` arrives, the server has already joined your sockets to the `session:<id>` room. Show the match (`matchScore`, `route`, `stops`, `members`), then have **each** player confirm readiness:

```js
socket.on("match:found", (match) => {
  showLobby(match)
  // when the user taps "I'm ready":
  socket.emit("session:ready", { sessionId: match.session.id }, (ack) => {
    if (!ack.ok) return toast(ack.error.message)
    updateReadyCount(ack.ready, ack.total)
  })
})
```

`queue:update` (this time carrying `{ sessionId, ready, total }`) fires each time someone readies up. Once everyone is ready the server emits `session:started`.

---

### Step 8 — Run the session (stop timers + conversation starters)

During an active session, drive each stop with `stop:start` / `stop:finish`. While a stop's timer runs, the server pushes `conversation:starter` events to the whole group.

```js
// arrive at a stop and start its timer
socket.emit("stop:start", { sessionId, stopId }, (ack) => {
  if (!ack.ok) return toast(ack.error.message)
})

// the group receives icebreakers automatically while the timer runs
socket.on("conversation:starter", ({ starter, triggerMinute }) => {
  showStarterCard(starter.prompt, triggerMinute)
})

// leave the stop / move on
socket.emit("stop:finish", { sessionId, stopId }, (ack) => {
  if (!ack.ok) return toast(ack.error.message)
})
```

> You can also fetch the full session state over REST at any time with [`GET /api/sessions/:id`](#get-apisessionsid) — useful for cold-starting a screen or recovering after the app was backgrounded.

---

### Step 9 — Reconnection & lifecycle

- **Automatic state restore.** On reconnect, if the user is still in a party the server immediately re-emits `party:updated`, so your party UI heals itself. Keep your `party:updated` listener attached across reconnects.
- **Backgrounding.** Mobile OSes suspend sockets when the app is backgrounded. Listen for app-state changes and call `socket.connect()` on resume; Socket.IO replays the handshake (and your `auth.token`) automatically.
- **Token expiry mid-session.** Access tokens last 1 hour. If a reconnect fails with `connect_error`, refresh the token, set `socket.auth = { token: newToken }`, and reconnect.
- **Cleanup.** When the user logs out or the screen unmounts, remove listeners and disconnect to avoid leaks:

```js
socket.off()         // remove all listeners
socket.disconnect()
```

---

### Event cheat-sheet

| You emit (client → server) | You listen for (server → client) |
|----------------------------|----------------------------------|
| `party:create`, `party:join`, `party:leave`, `party:kick`, `party:status` | `party:updated`, `party:dissolved` |
| `party:queue`, `party:unqueue` | `queue:update`, `match:found` |
| `session:ready` | `session:started` |
| `stop:start`, `stop:finish` | `stop:timer:started`, `stop:timer:finished`, `conversation:starter` |
| _(any failing emit)_ | `error:matchmaking` |

---

## Error Responses

All error responses follow this shape:

```json
{
  "message": "Human-readable description",
  "errors": {
    "fieldName": ["Validation message"]
  }
}
```

The `errors` field is only present for `400` validation failures.

**Common status codes**

| Code | Meaning |
|------|---------|
| `400` | Bad request — invalid body or query params |
| `401` | Unauthenticated — missing or expired token |
| `403` | Forbidden — authenticated but not authorised |
| `404` | Resource not found |
| `409` | Conflict — duplicate resource or FK constraint violation |
| `500` | Internal server error |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | yes | — | Path to the SQLite file |
| `JWT_SECRET` | yes | — | HMAC secret for access tokens |
| `JWT_REFRESH_SECRET` | yes | — | HMAC secret for refresh tokens |
| `PORT` | no | `3000` | HTTP server port |
| `SALT_ROUNDS` | no | `12` | bcrypt salt rounds |
| `NODE_ENV` | no | — | Set to `production` to enable secure cookies |
| `CLIENT_ORIGIN` | no | `http://localhost:<PORT>` | Allowed origin for Socket.IO CORS |
