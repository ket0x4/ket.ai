/**
 * Vector and Embedding Math Utilities
 * Optimized for fast in-memory similarity scans and low RAM footprint.
 */

/**
 * Computes Euclidean (L2) norm of a vector.
 */
function computeVectorNorm(vec: ArrayLike<number>): number {
	const len = vec.length;
	if (len === 0) return 0;

	let sumSquares = 0;
	let i = 0;
	const limit = len - 3;

	for (; i < limit; i += 4) {
		sumSquares +=
			vec[i] * vec[i] +
			vec[i + 1] * vec[i + 1] +
			vec[i + 2] * vec[i + 2] +
			vec[i + 3] * vec[i + 3];
	}

	for (; i < len; i++) {
		sumSquares += vec[i] * vec[i];
	}

	return Math.sqrt(sumSquares);
}

/**
 * Normalizes a Float32Array in-place to unit length (L2 norm = 1.0).
 */
function normalizeVectorInPlace(vec: Float32Array): Float32Array {
	const norm = computeVectorNorm(vec);
	if (norm === 0 || Math.abs(norm - 1.0) < 1e-6) {
		return vec;
	}

	const invNorm = 1 / norm;
	const len = vec.length;
	let i = 0;
	const limit = len - 3;

	for (; i < limit; i += 4) {
		vec[i] *= invNorm;
		vec[i + 1] *= invNorm;
		vec[i + 2] *= invNorm;
		vec[i + 3] *= invNorm;
	}

	for (; i < len; i++) {
		vec[i] *= invNorm;
	}

	return vec;
}

/**
 * Creates a new unit-normalized Float32Array (L2 norm = 1.0) from any ArrayLike<number>.
 */
export function normalizeVector(vec: ArrayLike<number>): Float32Array {
	const len = vec.length;
	const result = new Float32Array(len);
	if (len === 0) return result;

	for (let i = 0; i < len; i++) {
		result[i] = vec[i];
	}

	return normalizeVectorInPlace(result);
}

/**
 * Fast dot product calculation with 4x loop unrolling.
 */
export function dotProduct(
	vecA: ArrayLike<number>,
	vecB: ArrayLike<number>,
): number {
	const len = Math.min(vecA.length, vecB.length);
	if (len === 0) return 0;

	let sum = 0;
	let i = 0;
	const limit = len - 3;

	for (; i < limit; i += 4) {
		sum +=
			vecA[i] * vecB[i] +
			vecA[i + 1] * vecB[i + 1] +
			vecA[i + 2] * vecB[i + 2] +
			vecA[i + 3] * vecB[i + 3];
	}

	for (; i < len; i++) {
		sum += vecA[i] * vecB[i];
	}

	return sum;
}
