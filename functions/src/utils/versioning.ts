import { calculateChecksum } from './storage';

/**
 * Compare two file buffers to detect changes
 */
export const compareFiles = (
  currentBuffer: Buffer,
  previousBuffer: Buffer
): { hasChanges: boolean; checksum: string } => {
  const currentChecksum = calculateChecksum(currentBuffer);
  const previousChecksum = calculateChecksum(previousBuffer);

  return {
    hasChanges: currentChecksum !== previousChecksum,
    checksum: currentChecksum,
  };
};

/**
 * Generate next version number
 * Follows semantic versioning: major.minor.patch
 */
export const getNextVersion = (currentVersion: string, changeType: 'major' | 'minor' | 'patch' = 'patch'): string => {
  const parts = currentVersion.split('.').map(Number);

  if (parts.length !== 3) {
    return '1.0.0';
  }

  let [major, minor, patch] = parts;

  switch (changeType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
};

/**
 * Parse version string
 */
export const parseVersion = (version: string): { major: number; minor: number; patch: number } => {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
  return { major, minor, patch };
};

/**
 * Compare two versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export const compareVersions = (v1: string, v2: string): number => {
  const version1 = parseVersion(v1);
  const version2 = parseVersion(v2);

  if (version1.major !== version2.major) {
    return version1.major > version2.major ? 1 : -1;
  }

  if (version1.minor !== version2.minor) {
    return version1.minor > version2.minor ? 1 : -1;
  }

  if (version1.patch !== version2.patch) {
    return version1.patch > version2.patch ? 1 : -1;
  }

  return 0;
};

/**
 * Validate version format
 */
export const isValidVersion = (version: string): boolean => {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
};
