import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
    jwksUri: 'http://keycloak:8080/realms/hh_realm/protocol/openid-connect/certs',
    requestTimeout: 5000,
});

function getKey(header, cb) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) return cb(err);
        const signingKey = key.getPublicKey();
        cb(null, signingKey);
    });
}

export default function verifyTokenMiddleware(requiredRole) {
    return (req, res, next) => {
        if (!req.headers) {
            console.error('Request headers are undefined');
            return res.status(400).json({ error: 'Invalid request: headers missing' });
        }

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        jwt.verify(
            token,
            getKey,
            {
                algorithms: ['RS256'],
                issuer: 'http://localhost:8086/realms/hh_realm', // Обновлено с http://keycloak:8080
                audience: 'frontend',
            },
            (err, decoded) => {
                if (err) {
                    console.error('Token verification error:', err.name, err.message);
                    return res.status(401).json({ error: 'Invalid token', details: err.message });
                }

                req.user = decoded;

                if (requiredRole && (!decoded.realm_access?.roles || !decoded.realm_access.roles.includes(requiredRole))) {
                    return res.status(403).json({ error: `Forbidden: Role ${requiredRole} required` });
                }

                next();
            }
        );
    };
}