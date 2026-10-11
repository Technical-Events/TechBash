# API

TechBash has one HTTP endpoint and two Server Actions. Server Actions are called by our
own React components through Next.js and are **not** a public HTTP contract; they are
documented here because they are the backend surface of the scaffold.

There is no authentication anywhere yet.

## Implemented

### `GET /api/health`

- **Purpose**: liveness check. Says the application process is serving requests.
- **Source**: `app/api/health/route.ts`
- **Request**: no parameters, no body.
- **Response** `200 OK`, `Content-Type: application/json`, `Cache-Control: no-store`:

  ```json
  {
    "status": "ok",
    "service": "techbash",
    "timestamp": "2026-10-11T09:30:00.000Z"
  }
  ```

- **Validation**: none (no input).
- **Errors**: none defined. Other methods get Next.js's default `405`.
- **Authentication**: none.
- **Notes**: it deliberately does not report database state, versions or environment.

### Server Action `submitDemoQuiz`

- **Purpose**: score the demo quiz on the server.
- **Source**: `app/test/demo/actions.ts`
- **Input**: `Record<string, string>` mapping question id to the selected option id.
- **Validation** (`lib/validations/quiz.ts`): must be an object of short strings with at
  most 50 entries. Unknown question ids are ignored. Unanswered questions count as wrong.
- **Result**:

  ```ts
  type SubmitQuizResult =
    | { ok: true; result: QuizResult }
    | { ok: false; error: string };

  type QuizResult = {
    score: number;
    total: number;
    percent: number;
    review: {
      questionId: string;
      selectedOptionId: string | null;
      correctOptionId: string;
      isCorrect: boolean;
      explanation: string;
    }[];
  };
  ```

- **Errors**: malformed input returns `{ ok: false, error }`. Nothing is thrown to the client.
- **Authentication**: none.
- **Limits**: nothing is stored. Anyone can resubmit. Answer keys are returned in the
  review after submission. Not suitable for real assessments.

### Server Action `submitContact`

- **Purpose**: validate a contact message and store it when a database is configured.
- **Source**: `app/contact/actions.ts`
- **Input**: `FormData` with `name`, `email`, `subject`, `message`. Signature follows
  React's `useActionState`: `(previousState, formData) => ContactFormState`.
- **Validation** (`lib/validations/contact.ts`), after trimming:

  | Field | Rule |
  |---|---|
  | `name` | 2 to 80 characters |
  | `email` | valid email, at most 254 characters |
  | `subject` | 3 to 120 characters |
  | `message` | 10 to 2000 characters |

- **Result**:

  ```ts
  type ContactFormState =
    | { status: "idle" }
    | { status: "invalid"; fieldErrors: Partial<Record<ContactField, string>> }
    | { status: "stored" }  // row inserted into contact_submissions
    | { status: "demo" }    // DATABASE_URL not set: nothing stored, nothing sent
    | { status: "error" };  // insert failed; details logged on the server only
  ```

- **Authentication**: none.
- **Limits**: no email is ever sent. No rate limiting or spam protection.

## Planned (not implemented)

Nothing below exists in the code. Shapes may change when the phases start. They would be
added as Route Handlers only if a client other than our own UI needs them; otherwise the
same operations stay as Server Components and Server Actions.

Planned error envelope for all Route Handlers:

```json
{ "error": { "code": "not_found", "message": "Quiz not found" } }
```

| Method and path | Purpose | Phase |
|---|---|---|
| `GET /api/quizzes` | List published quizzes | 2 |
| `GET /api/quizzes/[slug]` | One published quiz with questions and options, without answer keys | 2 |
| `POST /api/quizzes/[slug]/attempts` | Submit answers, receive a scored result | 3 |
| `GET /api/attempts/[id]` | Read a stored result | 3 |
| `POST /api/contact` | Submit a contact message as JSON | when needed |

### `GET /api/quizzes` (planned)

- Query: `category` (optional), `difficulty` (optional).
- `200`: `{ "quizzes": [{ "slug", "title", "description", "category", "difficulty", "questionCount" }] }`

### `GET /api/quizzes/[slug]` (planned)

- `200`: `{ "quiz": { "slug", "title", "description", "category", "difficulty", "questions": [{ "id", "prompt", "type", "options": [{ "id", "text" }] }] } }`
- `404` when the quiz does not exist or is not published.
- `is_correct` is never included.

### `POST /api/quizzes/[slug]/attempts` (planned)

- Body: `{ "answers": { "<questionId>": "<optionId>" } }`
- `201`: `{ "attemptId", "score", "total", "percent" }`
- `400` on a malformed body, `404` on an unknown quiz.

### `GET /api/attempts/[id]` (planned)

- `200`: the attempt with its per-question review.
- Access rules depend on the accounts decision (ADR-008).

### `POST /api/contact` (planned)

- Body: `{ "name", "email", "subject", "message" }`, same rules as `submitContact`.
- `201` when stored, `400` with field errors, `503` when no database is configured.
