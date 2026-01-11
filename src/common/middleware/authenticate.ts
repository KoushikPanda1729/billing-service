import { type Request } from "express";
import { expressjwt, type GetVerificationKey } from "express-jwt";
import jwksRsa from "jwks-rsa";
import { Config } from "../../config";
import logger from "../../config/logger";

/**
 * Authentication Middleware
 *
 * Validates JWT tokens using JWKS (JSON Web Key Set) for public key retrieval.
 * This middleware supports token extraction from both Authorization header and cookies.
 *
 * Environment Behavior:
 * - Development: Fetches public keys from local JWKS endpoint (http://localhost:5501/.well-known/jwks.json)
 * - Production: Fetches public keys from production JWKS endpoint (https://your-domain/.well-known/jwks.json)
 *
 * Security Features:
 * - JWKS caching to reduce external requests
 * - Rate limiting on JWKS requests (5 requests/minute)
 * - Support for RS256 algorithm only (asymmetric signing)
 * - Token extraction from Authorization header or cookie
 *
 * Token Extraction Priority:
 * 1. Authorization header (Bearer token)
 * 2. accessToken cookie
 *
 * @example
 * // Protect a route
 * router.get('/protected', authenticate, (req, res) => {
 *   console.log(req.user); // Contains decoded JWT payload
 * });
 */
export const authenticate = expressjwt({
    // Secret function that fetches public keys from JWKS endpoint
    secret: jwksRsa.expressJwtSecret({
        cache: true, // Cache keys to reduce JWKS endpoint requests
        cacheMaxEntries: 5, // Maximum number of keys to cache
        cacheMaxAge: 600000, // Cache duration: 10 minutes

        rateLimit: true, // Enable rate limiting for JWKS requests
        jwksRequestsPerMinute: 5, // Maximum 5 JWKS requests per minute

        // JWKS endpoint URL - environment-specific
        jwksUri: Config.JWKS_URI,

        // Error handling for JWKS retrieval
        handleSigningKeyError: (err, cb) => {
            logger.error("JWKS signing key error", {
                error: err!.message,
                jwksUri: Config.JWKS_URI,
            });
            cb(err);
        },
    }) as GetVerificationKey,

    // Only allow RS256 algorithm (asymmetric signing)
    algorithms: ["RS256"],

    // Add decoded token to req.user
    requestProperty: "user",

    // Custom token extraction function
    // Priority: Authorization header > Cookie
    getToken: (req: Request) => {
        // Try Authorization header first (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const parts = authHeader.split(" ");
            if (parts.length === 2 && parts[0] === "Bearer") {
                const token = parts[1];
                if (token && token !== "undefined") {
                    return token;
                }
            }
        }

        // Fallback to cookie-based token
        const { accessToken } = req.cookies as Record<string, string>;
        if (accessToken && accessToken !== "undefined") {
            return accessToken;
        }

        // No token found
        return undefined;
    },

    // Custom error handler can be added here if needed
    // onError: (err, req, res, next) => { ... }
});
