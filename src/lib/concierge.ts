/**
 * Contract between the Backer Concierge page and the assistant endpoint.
 *
 * The page POSTs `{ question }` as JSON and expects a `ConciergeAnswer` back.
 * Responses are validated here so malformed output never reaches the DOM.
 */

export const MAX_QUESTION_LENGTH = 500;

export interface ConciergeRecommendation {
    title: string;
    category: string;
    publisher: string;
    starRating?: number;
    reason: string;
}

export interface ConciergeAnswer {
    /** Plain-text answer grounded in the Tailspin catalog. */
    answer: string;
    recommendations: ConciergeRecommendation[];
    /** Optional short clarifying question when the request is vague or needs untracked data. */
    clarifyingQuestion?: string;
    /** Optional general board-game background, always shown as non-Tailspin context. */
    generalContext?: string;
}

/** Trim and validate a question; returns null when it is empty or too long. */
export function normalizeQuestion(input: string): string | null {
    const question = input.trim().replace(/\s+/g, ' ');
    if (question.length === 0 || question.length > MAX_QUESTION_LENGTH) return null;
    return question;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function parseRecommendation(value: unknown): ConciergeRecommendation | null {
    if (!isRecord(value)) return null;
    const title = optionalString(value.title);
    const category = optionalString(value.category);
    const publisher = optionalString(value.publisher);
    if (!title || !category || !publisher) return null;
    const rating = value.starRating;
    return {
        title,
        category,
        publisher,
        ...(typeof rating === 'number' && rating >= 0 && rating <= 5 ? { starRating: rating } : {}),
        reason: optionalString(value.reason) ?? '',
    };
}

/** Validate an untrusted JSON payload; returns null when it is not a usable answer. */
export function parseConciergeAnswer(payload: unknown): ConciergeAnswer | null {
    if (!isRecord(payload)) return null;
    const answer = optionalString(payload.answer);
    if (!answer) return null;
    const recommendations = Array.isArray(payload.recommendations)
        ? payload.recommendations.map(parseRecommendation).filter((r): r is ConciergeRecommendation => r !== null)
        : [];
    const clarifyingQuestion = optionalString(payload.clarifyingQuestion);
    const generalContext = optionalString(payload.generalContext);
    return {
        answer,
        recommendations,
        ...(clarifyingQuestion ? { clarifyingQuestion } : {}),
        ...(generalContext ? { generalContext } : {}),
    };
}
