const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export type BuildMetadata = {
  commitSha: string | null;
  release: string;
};

/**
 * Returns the intentionally public, allowlisted metadata for the running build.
 * Never add arbitrary environment values to this object.
 */
export function getBuildMetadata(
  environment: { VERCEL_GIT_COMMIT_SHA?: string } = {
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  },
): BuildMetadata {
  const candidate = environment.VERCEL_GIT_COMMIT_SHA?.trim();
  const commitSha = candidate && GIT_SHA_PATTERN.test(candidate) ? candidate.toLowerCase() : null;

  return {
    commitSha,
    release: commitSha?.slice(0, 7) ?? "local",
  };
}
