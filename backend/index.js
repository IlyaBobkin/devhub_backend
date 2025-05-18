import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { randomUUID } from 'crypto';
import dbController from './db/dbController.js';
import pool from './db/db.js';
import initKeycloak from './keycloak/init.js';
import verifyTokenMiddleware from './middlewares/keycloak.js';

const app = express();

try {
    const keycloak = await initKeycloak();
    const { memoryStore, kcAdminClient } = keycloak;

    app.use(
        session({
            secret: 'mySecret',
            resave: false,
            saveUninitialized: true,
            store: memoryStore,
        })
    );
    app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
    app.use(express.json());

    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'OK' });
    });

    app.post('/user/register', async (req, res) => {
        const { name, email, password, role, companyName, companyDescription } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Все обязательные поля (name, email, password, role) должны быть заполнены' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Некорректный email' });
        }

        const validRoles = ['applicant', 'company_owner'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: `Недопустимая роль. Допустимые роли: ${validRoles.join(', ')}` });
        }

        if (role === 'company_owner' && (!companyName || !companyDescription)) {
            return res.status(400).json({ error: 'Для роли company_owner требуется companyName и companyDescription' });
        }

        try {
            await dbController.registerUser(res, {
                name,
                email,
                password,
                kcAdminClient,
                role,
                companyName,
                companyDescription,
            });
        } catch (err) {
            console.error('Ошибка регистрации:', err);
            res.status(500).json({ error: 'Ошибка регистрации' });
        }
    });

    app.post('/user/login', (req, res) => {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        const validRoles = ['applicant', 'company_owner'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Недопустимая роль' });
        }

        dbController.loginUser(res, email, password, role, kcAdminClient);
    });

    app.get('/specializations', (req, res) => {
        dbController.getSpecializations(res);
    });

    app.post('/vacancies', verifyTokenMiddleware('company_owner'), (req, res) => {
            const { company_id, title, description, salary_from, salary_to, specialization_id, experience_level, location, } = req.body;

            if (!company_id || !title || !description || !salary_from || !salary_to || !specialization_id || !experience_level || !location) {
                return res
                    .status(400)
                    .json({ error: 'Все обязательные поля должны быть заполнены' });
            }

            dbController.createVacancy(
                res,
                req.user.sub,
                company_id,
                title,
                description,
                salary_from,
                salary_to,
                specialization_id,
                experience_level,
                location
            );
        }
    );

    app.get('/vacancies/my', verifyTokenMiddleware('company_owner'), (req, res) => {
            dbController.getMyVacancies(res, req.user.sub);
        }
    );

    app.get('/user/profile', verifyTokenMiddleware(), (req, res) => {
            dbController.getUserProfile(res, req.user.sub);
        }
    );

    app.get('/user/profile/:id', verifyTokenMiddleware(), (req, res) => {
            dbController.getUserProfile(res, req.params.id);
        }
    );

    app.patch('/vacancies/:id', verifyTokenMiddleware('company_owner'), (req, res) => {
            const { id } = req.params;
            const {company_id, title, description, salary_from, salary_to, specialization_id, experience_level, location,} = req.body;

            if (!company_id || !title || !description || !salary_from || !salary_to || !specialization_id || !experience_level || !location) {
                return res
                    .status(400)
                    .json({ error: 'Все обязательные поля должны быть заполнены' });
            }

            dbController.updateVacancy(
                res,
                id,
                req.user.sub,
                company_id,
                title,
                description,
                salary_from,
                salary_to,
                specialization_id,
                experience_level,
                location
            );
        }
    );

    app.delete('/vacancies/:id', verifyTokenMiddleware('company_owner'), async (req, res) => {
        const vacancyId = req.params.id;
        const userId = req.user.sub;
        try {
            dbController.deleteVacancy(res, vacancyId, userId);
        } catch (err) {
            console.error('Ошибка удаления вакансии:', err);
            res.status(500).json({ error: 'Failed to delete vacancy' });
        }
    });

    app.post('/resumes', verifyTokenMiddleware('applicant'), async (req, res) => {
        const { title, description, expected_salary, specialization_id, experience_level, location } = req.body;
        const userId = req.user.sub;

        if (!title || !description || !specialization_id || !experience_level || !location) {
            return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
        }

        try {
            dbController.createResume(res, {
                id: randomUUID(),
                user_id: userId,
                title,
                description,
                expected_salary,
                specialization_id,
                experience_level,
                location,
            });
        } catch (err) {
            console.error('Ошибка создания резюме:', err);
            res.status(500).json({ error: 'Failed to create resume' });
        }
    });

    app.get('/resumes/my', verifyTokenMiddleware('applicant'), async (req, res) => {
        try {
            const userId = req.user.sub;
            dbController.getResume(res, userId);
        } catch (err) {
            console.error('Ошибка загрузки резюме:', err);
            res.status(500).json({ error: 'Failed to fetch resume' });
        }
    });

    app.patch('/resumes/:id', verifyTokenMiddleware('applicant'), async (req, res) => {
        const resumeId = req.params.id;
        const userId = req.user.sub;
        const { title, description, expected_salary, specialization_id, experience_level, location } = req.body;

        if (!title || !description || !specialization_id || !experience_level || !location) {
            return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
        }

        try {
            dbController.updateResume(res, resumeId, {
                user_id: userId,
                title,
                description,
                expected_salary,
                specialization_id,
                experience_level,
                location,
            });
        } catch (err) {
            console.error('Ошибка обновления резюме:', err);
            res.status(500).json({ error: 'Failed to update resume' });
        }
    });

    app.delete('/resumes/:id', verifyTokenMiddleware('applicant'), async (req, res) => {
        const resumeId = req.params.id;
        const userId = req.user.sub;
        try {
            dbController.deleteResume(res, resumeId, userId);
        } catch (err) {
            console.error('Ошибка удаления резюме:', err);
            res.status(500).json({ error: 'Failed to delete resume' });
        }
    });

    app.get('/vacancies/all', verifyTokenMiddleware('applicant'), async (req, res) => {
            try {
                dbController.getVacanciesFeed(res);
            } catch (err) {
                console.error('Ошибка загрузки вакансий:', err);
                res.status(500).json({ error: 'Failed to fetch vacancies feed' });
            }
        }
    );

    app.get('/resumes/all', verifyTokenMiddleware('company_owner'), async (req, res) => {
            try {
                dbController.getResumesFeed(res);
            } catch (err) {
                console.error('Ошибка загрузки резюме:', err);
                res.status(500).json({ error: 'Failed to fetch resumes feed' });
            }
        }
    );

    app.get('/vacancies/:vacancyId/responses', verifyTokenMiddleware('company_owner'), (req, res) =>
        dbController.getVacancyResponses(res, req.params.vacancyId)
    );

    app.post(
        '/vacancies/:vacancyId/responses', verifyTokenMiddleware('applicant'), async (req, res) => {
            const userId = req.user.sub;
            const { message } = req.body;

            try {
                const result = await pool.query(
                    'SELECT 1 FROM resumes WHERE user_id = $1',
                    [userId]
                );
                if (result.rows.length === 0) {
                    return res
                        .status(400)
                        .json({ error: 'Сначала создайте резюме' });
                }
            } catch (err) {
                console.error('Ошибка проверки резюме:', err);
                return res
                    .status(500)
                    .json({ error: 'Ошибка сервера при проверке резюме' });
            }

            dbController.createVacancyResponse(res, {
                vacancyId: req.params.vacancyId,
                userId,
                message,
            });
        }
    );

    app.get('/responses/vacancies', verifyTokenMiddleware('applicant'), (req, res) =>
        dbController.getUserVacancyResponses(res, req.user.sub)
    );

    app.post('/chats', verifyTokenMiddleware(), (req, res) => {
        const { applicant_id, company_owner_id, vacancy_id } = req.body;
        const userId = req.user.sub;
        if (userId !== applicant_id && userId !== company_owner_id) {
            return res.status(403).json({ error: 'Нельзя создавать чат от имени другого пользователя' });
        }
        dbController.createChat(res, {
            id: randomUUID(),
            applicantId: applicant_id,
            companyOwnerId: company_owner_id,
            vacancyId: vacancy_id,
        });
    });

    app.get('/chats', verifyTokenMiddleware(), (req, res) => {
        dbController.getChatsByUser(res, req.user.sub);
    });

    app.get('/chats/:chatId/messages', verifyTokenMiddleware(), (req, res) => {
        dbController.getChatMessages(res, req.user.sub, req.params.chatId);
    });

    app.post('/chats/:chatId/messages', verifyTokenMiddleware(), (req, res) => {
        const chatId = req.params.chatId;
        const senderId = req.user.sub;
        const {text} = req.body;
        dbController.createMessage(res, {
            id: randomUUID(),
            chatId,
            senderId,
            text
        });
    });

    app.get('/responses/vacancies-owner', verifyTokenMiddleware('company_owner'), (req, res) =>
        dbController.getOwnerVacancyResponses(res, req.user.sub)
    );

    app.get('/vacancy/:id', verifyTokenMiddleware(), (req, res) =>
        dbController.getVacancyById(res, req.params.id)
    );

    app.get('/resume/:id', verifyTokenMiddleware(), (req, res) =>
        dbController.getResumeByIdOrUser(res, req.params.id)
    );

    app.get('/responses/vacancies-invited', verifyTokenMiddleware('applicant'), (req, res) =>
        dbController.getInvitedVacanciesForUser(res, req.user.sub)
    );

    app.get('/responses/vacancies-owner-invited', verifyTokenMiddleware('company_owner'), (req, res) =>
        dbController.getSentVacancyInvitations(res, req.user.sub)
    );

    app.post('/vacancies/:vacancyId/invitations', verifyTokenMiddleware('company_owner'), (req, res) => {
            const companyOwnerId = req.user.sub;
            const { vacancyId } = req.params;
            const { applicantId, message } = req.body;
            const id = randomUUID();
            dbController.createVacancyInvitation(res, {
                id,
                companyOwnerId,
                applicantId,
                vacancyId,
                message,
            });
        }
    );

    app.patch('/vacancies/:vacancyId/responses/:responseId', verifyTokenMiddleware(), (req, res) => {
            const { responseId } = req.params;
            const { status } = req.body;
            dbController.updateVacancyResponseStatus(res, { responseId, status });
        }
    );

    app.patch('/vacancies/:vacancyId/invitations/:invitationId', verifyTokenMiddleware(), (req, res) => {
            const { invitationId } = req.params;
            const { status } = req.body;
            dbController.updateVacancyInvitationStatus(res, { invitationId, status });
        }
    );


    app.listen(8080, () => {
        console.log('Server running on port 8080');
    });
} catch (error) {
    console.error('Ошибка инициализации Keycloak:', error);
    process.exit(1);
}