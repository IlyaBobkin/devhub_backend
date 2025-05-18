import KcAdminClient from '@keycloak/keycloak-admin-client';
import Keycloak from 'keycloak-connect';
import session from 'express-session';

export default async function initKeycloak() {
    const kcConnectConfig = {
        clientId: 'frontend',
        serverUrl: 'http://keycloak:8080',
        realm: 'hh_realm',
        sslRequired: 'none',
        resource: 'frontend',
        publicClient: true,
        confidentialPort: 0,
        verifyTokenAudience: true,
    };

    const memoryStore = new session.MemoryStore();
    const keycloak = new Keycloak({ store: memoryStore }, kcConnectConfig);

    const kcAdminClient = new KcAdminClient({
        baseUrl: 'http://keycloak:8080',
        realmName: 'hh_realm',
    });

    try {
        await kcAdminClient.auth({
            username: 'hh_admin',
            password: 'hh_admin_password',
            grantType: 'password',
            clientId: 'admin-cli',
        });

        const clients = await kcAdminClient.clients.find({ clientId: 'frontend' });
        if (clients.length === 0) {
            throw new Error('Frontend client not found in Keycloak. Check your config.json import');
        }

        const frontendClient = clients[0];

        return {
            memoryStore,
            keycloak,
            kcAdminClient,
            frontendClient,
        };
    } catch (error) {
        console.error('Keycloak initialization failed:', error);
        throw error;
    }
}