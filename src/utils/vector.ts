/**
 * Vector and Embedding Math Utilities
 * Optimized for fast in-memory similarity scans and low RAM footprint.
 */

/**
 * Computes Euclidean (L2) norm of a vector.
 */
function computeVectorNorm(vec: ArrayLike<number>): number {
	let sumSquares = 0;
	for (let i = 0; i < vec.length; i++) {
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
	for (let i = 0; i < vec.length; i++) {
		vec[i] *= invNorm;
	}
	return vec;
}

/**
 * Creates a new unit-normalized Float32Array (L2 norm = 1.0) from any ArrayLike<number>.
 */
export function normalizeVector(vec: ArrayLike<number>): Float32Array {
	const result = new Float32Array(vec);
	return normalizeVectorInPlace(result);
}

/**
 * Dot product calculation between two vectors.
 */
export function dotProduct(
	vecA: ArrayLike<number>,
	vecB: ArrayLike<number>,
): number {
	const len = Math.min(vecA.length, vecB.length);
	let sum = 0;
	for (let i = 0; i < len; i++) {
		sum += vecA[i] * vecB[i];
	}
	return sum;
}
