"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidVersion = exports.compareVersions = exports.parseVersion = exports.getNextVersion = exports.compareFiles = void 0;
const storage_1 = require("./storage");
/**
 * Compare two file buffers to detect changes
 */
const compareFiles = (currentBuffer, previousBuffer) => {
    const currentChecksum = (0, storage_1.calculateChecksum)(currentBuffer);
    const previousChecksum = (0, storage_1.calculateChecksum)(previousBuffer);
    return {
        hasChanges: currentChecksum !== previousChecksum,
        checksum: currentChecksum,
    };
};
exports.compareFiles = compareFiles;
/**
 * Generate next version number
 * Follows semantic versioning: major.minor.patch
 */
const getNextVersion = (currentVersion, changeType = 'patch') => {
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
exports.getNextVersion = getNextVersion;
/**
 * Parse version string
 */
const parseVersion = (version) => {
    const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
    return { major, minor, patch };
};
exports.parseVersion = parseVersion;
/**
 * Compare two versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
const compareVersions = (v1, v2) => {
    const version1 = (0, exports.parseVersion)(v1);
    const version2 = (0, exports.parseVersion)(v2);
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
exports.compareVersions = compareVersions;
/**
 * Validate version format
 */
const isValidVersion = (version) => {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
};
exports.isValidVersion = isValidVersion;
//# sourceMappingURL=versioning.js.map