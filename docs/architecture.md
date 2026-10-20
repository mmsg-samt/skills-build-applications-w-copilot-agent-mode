# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the React UI focused on rendering route-based views and surfacing loading, empty, and error states for each capability. The browser should consume the API contract without embedding business logic; fetch calls remain thin and use relative `/api` paths with a shared client pattern if needed.
- Logic tier decision: Build a small service layer in `octofit-tracker/backend/src/services` that validates inputs, translates Mongo/Mongoose issues into deliberate 4xx responses, and returns domain objects shaped to the contract. Keep Express route handlers as thin adapters that pass through request data and next(error) behavior.
- Data tier decision: Use Mongoose schemas for `User`, `Team`, `Activity`, and `Workout` with explicit required fields, ObjectId references, and seeded fixture data that can run repeatedly without duplicating records. Member arrays stay on `Team`, while `User.team` and `Activity.user`/`team` provide the linkage needed for leaderboard and workout suggestions.
- Activity tracking approach: Validate `userId`, `teamId`, `type`, and `minutes` before creating an activity. Reject bad IDs or missing references as 4xx errors instead of letting Mongoose cast errors bubble up as 500s. Persist `user`, `team`, `type`, `minutes`, and computed `points` plus a timestamp in `occurredAt`.
- Team management approach: Require a team `name` and `mascot`, default `members` to an empty array, and store member references as an array of ObjectIds. Team creation should be safe for both creating a new team and attaching existing users without mutating unrelated records.
- Leaderboard approach: Aggregate total activity points per team, order by descending sum, and assign a 1-based rank. The leaderboard should read from the activity collection rather than client-side calculations so the API stays authoritative.
- Workout suggestions approach: Match each user’s email to a seeded user, inspect their recent activity pattern and fitness goal, and recommend a workout whose `focus` aligns with that pattern. Return the first result with a descriptive `reason` and a 4xx response if the email does not map to a user.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — currently fails because the schema constraints and idempotent seed behavior are not yet implemented, and the service layer still throws placeholder 501 responses.
- API command: `npm run test:api --prefix octofit-tracker/backend` — currently fails because `createActivity`, `createTeam`, `getLeaderboard`, and `suggestWorkouts` are not yet validating and aggregating according to the contract.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — currently fails because the UI still renders placeholder content instead of loading, empty, and error states, and the data fetch paths are not wired to the API contract.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — should validate TypeScript compilation once the data and logic layers pass their contract tests.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — should validate the React app compiles once the presentation states are implemented and API fetch logic matches the contract.
