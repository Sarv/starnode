const CryptoJS = require('crypto-js');

// Encryption key (should be stored in environment variable)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

if (ENCRYPTION_KEY === 'default-encryption-key-change-in-production') {
    console.warn('⚠️ WARNING: Using default encryption key. Please set ENCRYPTION_KEY environment variable in production!');
}

/**
 * Encrypt data
 * @param {Object|String} data - Data to encrypt
 * @returns {String} Encrypted string
 */
function encrypt(data) {
    try {
        const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('❌ Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt data
 * @param {String} encryptedData - Encrypted string
 * @returns {Object|String} Decrypted data
 */
function decrypt(encryptedData) {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
            throw new Error('Decryption failed - invalid key or corrupted data');
        }

        // Try to parse as JSON, if fails return as string
        try {
            return JSON.parse(decryptedString);
        } catch {
            return decryptedString;
        }
    } catch (error) {
        console.error('❌ Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Encrypt user credentials object
 * @param {Object} credentials - User credentials object
 * @returns {String} Encrypted credentials
 */
function encryptCredentials(credentials) {
    if (!credentials || typeof credentials !== 'object') {
        throw new Error('Credentials must be an object');
    }
    return encrypt(credentials);
}

/**
 * Decrypt user credentials
 * @param {String} encryptedCredentials - Encrypted credentials string
 * @returns {Object} Decrypted credentials object
 */
function decryptCredentials(encryptedCredentials) {
    if (!encryptedCredentials || typeof encryptedCredentials !== 'string') {
        throw new Error('Encrypted credentials must be a string');
    }
    const decrypted = decrypt(encryptedCredentials);
    if (typeof decrypted !== 'object') {
        throw new Error('Decrypted data is not a valid credentials object');
    }
    return decrypted;
}

/**
 * Hash data (one-way, for passwords/tokens that don't need to be retrieved)
 * @param {String} data - Data to hash
 * @returns {String} Hashed string
 */
function hash(data) {
    try {
        return CryptoJS.SHA256(data).toString();
    } catch (error) {
        console.error('❌ Hashing error:', error);
        throw new Error('Failed to hash data');
    }
}

/**
 * Generate random encryption key
 * @returns {String} Random key
 */
function generateKey() {
    return CryptoJS.lib.WordArray.random(256/8).toString();
}

/**
 * Verify if data can be decrypted
 * @param {String} encryptedData - Encrypted string
 * @returns {Boolean} True if valid
 */
function verifyEncryption(encryptedData) {
    try {
        decrypt(encryptedData);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    encrypt,
    decrypt,
    encryptCredentials,
    decryptCredentials,
    hash,
    generateKey,
    verifyEncryption
};
