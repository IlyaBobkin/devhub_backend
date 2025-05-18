import pool from './db.js';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';

export default {
    registerUser: async (res, userData) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const isExists = await client.query('SELECT * FROM users WHERE email = $1', [userData.email]);
            if (isExists.rows.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Email уже занят', isExists: true });
            }

            const keycloakUser = await userData.kcAdminClient.users.create({
                realm: 'hh_realm',
                username: userData.email,
                email: userData.email,
                enabled: true,
                emailVerified: true,
                firstName: userData.name,
                credentials: [{ type: 'password', value: userData.password, temporary: false }],
            });

            const kcRole = await userData.kcAdminClient.roles.findOneByName({ realm: 'hh_realm', name: userData.role });
            await userData.kcAdminClient.users.addRealmRoleMappings({
                id: keycloakUser.id,
                realm: 'hh_realm',
                roles: [{ id: kcRole.id, name: kcRole.name }],
            });

            const createdAt = new Date().toISOString().split('T')[0];
            await client.query(
                'INSERT INTO users(id, name, email, role, created_at) VALUES($1, $2, $3, $4, $5)',
                [keycloakUser.id, userData.name, userData.email, userData.role, createdAt]
            );

            let companyId = null;
            let companyName = null;
            let companyDescription = null;
            if (userData.role === 'company_owner') {
                companyId = randomUUID();
                companyName = userData.companyName;
                companyDescription = userData.companyDescription;
                await client.query(
                    'INSERT INTO companies(id, name, description, owner_id, created_at) VALUES($1, $2, $3, $4, $5)',
                    [companyId, companyName, companyDescription, keycloakUser.id, createdAt]
                );
            }

            const result = await client.query(
                'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
                [keycloakUser.id]
            );

            await client.query('COMMIT');

            res.status(201).json({
                ...result.rows[0],
                companyId,
                companyName,
                companyDescription,
                isExists: false,
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Ошибка при регистрации:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        } finally {
            client.release();
        }
    },

    loginUser: async (res, email, password, role, kcAdminClient) => {
        const client = await pool.connect();
        try {
            const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            if (!userResult.rows.length) {
                return res.status(401).json({ error: 'Пользователь не найден' });
            }

            const user = userResult.rows[0];
            if (user.role !== role) {
                return res.status(403).json({ error: `Ожидалась роль ${role}, получена ${user.role}` });
            }

            const tokenResponse = await fetch('http://keycloak:8080/realms/hh_realm/protocol/openid-connect/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'password',
                    client_id: 'frontend',
                    username: email,
                    password: password,
                }),
            });

            const tokenData = await tokenResponse.json();
            if (!tokenResponse.ok) {
                return res.status(401).json({ error: tokenData.error_description || 'Ошибка аутентификации' });
            }

            let companyId = null;
            let companyName = null;
            let companyDescription = null;
            if (user.role === 'company_owner') {
                const companyResult = await client.query('SELECT id, name, description FROM companies WHERE owner_id = $1', [
                    user.id,
                ]);
                if (!companyResult.rows.length) {
                    return res.status(400).json({ error: 'У пользователя с ролью company_owner отсутствует компания' });
                }
                companyId = companyResult.rows[0].id;
                companyName = companyResult.rows[0].name;
                companyDescription = companyResult.rows[0].description;
            }

            res.status(200).json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
                companyId,
                companyName,
                companyDescription,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
            });
        } catch (error) {
            console.error('Ошибка при входе:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        } finally {
            client.release();
        }
    },

    getSpecializations: async (res) => {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT id, name FROM specializations');
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('Ошибка при получении специализаций:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        } finally {
            client.release();
        }
    },

    createVacancy: async (res, userId, company_id, title, description, salary_from, salary_to, specialization_id, experience_level, location) => {
        try {
            const company = await pool.query(
                'SELECT id FROM companies WHERE id = $1 AND owner_id = $2',
                [company_id, userId]
            );
            if (company.rows.length === 0) {
                return res
                    .status(403)
                    .json({ error: 'Unauthorized: User does not own this company' });
            }

            const id = randomUUID();
            const result = await pool.query(
                `INSERT INTO vacancies
                     (id, company_id, title, description,
                      salary_from, salary_to, specialization_id,
                      experience_level, location, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                     RETURNING *`,
                [
                    id,
                    company_id,
                    title,
                    description,
                    salary_from,
                    salary_to,
                    specialization_id,
                    experience_level,
                    location,
                    new Date(),
                ]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to create vacancy' });
        }
    },

    getMyVacancies: async (res, userId) => {
        try {
            const result = await pool.query(
                `SELECT v.*, s.name AS specialization_name
                 FROM vacancies v
                 JOIN companies c ON v.company_id = c.id
                 JOIN specializations s ON v.specialization_id = s.id
                 WHERE c.owner_id = $1`,
                [userId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch vacancies' });
        }
    },

    getUserProfile: async (res, userId) => {
        try {
            const user = await pool.query(
                `SELECT u.id,
                        u.name,
                        u.email,
                        u.role,
                        u.created_at,
                        c.id   AS "companyId",
                        c.name AS "companyName",
                        c.description AS "companyDescription"
                 FROM users u
                 LEFT JOIN companies c ON c.owner_id = u.id
                 WHERE u.id = $1`,
                [userId]
            );
            if (user.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    },

    updateVacancy: async (res, vacancyId, userId, company_id, title, description, salary_from, salary_to, specialization_id, experience_level, location) => {
        try {
            const owns = await pool.query(
                `SELECT v.id
                 FROM vacancies v
                 JOIN companies c ON v.company_id = c.id
                 WHERE v.id = $1 AND c.owner_id = $2`,
                        [vacancyId, userId]
            );
            if (owns.rows.length === 0) {
                return res
                    .status(403)
                    .json({ error: 'Unauthorized: cannot update this vacancy' });
            }

            const result = await pool.query(
                `UPDATE vacancies
                 SET company_id = $1,
                     title = $2,
                     description = $3,
                     salary_from = $4,
                     salary_to = $5,
                     specialization_id = $6,
                     experience_level = $7,
                     location = $8
                 WHERE id = $9
                 RETURNING *`,
                [
                    company_id,
                    title,
                    description,
                    salary_from,
                    salary_to,
                    specialization_id,
                    experience_level,
                    location,
                    vacancyId,
                ]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to update vacancy' });
        }
    },

    deleteVacancy: async (res, vacancyId, userId) => {
        const client = await pool.connect();
        try {
            const check = await client.query(
                `SELECT v.id FROM vacancies v
         JOIN companies c ON v.company_id = c.id
         WHERE v.id = $1 AND c.owner_id = $2`,
                [vacancyId, userId]
            );
            if (!check.rows.length) {
                return res.status(404).json({ error: 'Вакансия не найдена или не принадлежит пользователю' });
            }
            await client.query('DELETE FROM vacancies WHERE id = $1', [vacancyId]);
            res.status(200).json({ message: 'Vacancy deleted' });
        } catch (error) {
            console.error('Ошибка при удалении вакансии:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        } finally {
            client.release();
        }
    },

    createResume: async (res, resumeData) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const userExists = await client.query(
                'SELECT id, role FROM users WHERE id = $1',
                [resumeData.user_id]
            );
            if (!userExists.rows.length || userExists.rows[0].role !== 'applicant') {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'Только соискатели могут создавать резюме' });
            }

            const already = await client.query(
                'SELECT id FROM resumes WHERE user_id = $1',
                [resumeData.user_id]
            );
            if (already.rows.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'У пользователя уже есть резюме' });
            }

            const spec = await client.query(
                'SELECT id FROM specializations WHERE id = $1',
                [resumeData.specialization_id]
            );
            if (!spec.rows.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Указанная специализация не существует' });
            }

            const createdAt = new Date().toISOString().split('T')[0];
            const result = await client.query(
                `INSERT INTO resumes(
                   id, user_id, title, description, expected_salary,
                   specialization_id, experience_level, location, created_at
                 ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 RETURNING *`,
                [
                    resumeData.id,
                    resumeData.user_id,
                    resumeData.title,
                    resumeData.description,
                    resumeData.expected_salary,
                    resumeData.specialization_id,
                    resumeData.experience_level,
                    resumeData.location,
                    createdAt,
                ]
            );

            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Ошибка при создании резюме:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        } finally {
            client.release();
        }
    },

    getResume: async (res, userId) => {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT r.*, s.name AS specialization_name
                 FROM resumes r
                 JOIN specializations s ON r.specialization_id = s.id
                 WHERE r.user_id = $1`,
                [userId]
            );
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Резюме не найдено' });
            }
            res.status(200).json(result.rows[0]);
        } catch (error) {
            console.error('Ошибка при получении резюме:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        } finally {
            client.release();
        }
    },

    updateResume: async (res, id, resumeData) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const own = await client.query(
                `SELECT id FROM resumes WHERE id = $1 AND user_id = $2`,
                [id, resumeData.user_id]
            );
            if (!own.rows.length) {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'Резюме не найдено или не принадлежит пользователю' });
            }

            const spec = await client.query(
                'SELECT id FROM specializations WHERE id = $1',
                [resumeData.specialization_id]
            );
            if (!spec.rows.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Указанная специализация не существует' });
            }

            const updateQuery = `
                UPDATE resumes
                SET
                  title            = $1,
                  description      = $2,
                  expected_salary  = $3,
                  specialization_id= $4,
                  experience_level = $5,
                  location         = $6
                WHERE id = $7
                RETURNING *;
              `;
            const result = await client.query(updateQuery, [
                resumeData.title,
                resumeData.description,
                resumeData.expected_salary,
                resumeData.specialization_id,
                resumeData.experience_level,
                resumeData.location,
                id,
            ]);

            await client.query('COMMIT');
            res.status(200).json(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Ошибка при обновлении резюме:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        } finally {
            client.release();
        }
    },

    deleteResume: async (res, resumeId, userId) => {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'DELETE FROM resumes WHERE id = $1 AND user_id = $2 RETURNING *',
                [resumeId, userId]
            );
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Резюме не найдено или не принадлежит пользователю' });
            }
            res.status(200).json({ message: 'Resume deleted' });
        } catch (error) {
            console.error('Ошибка при удалении резюме:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        } finally {
            client.release();
        }
    },

    getVacanciesFeed: async (res) => {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT
                   v.id,
                   v.title,
                   v.description,
                   v.salary_from,
                   v.salary_to,
                   s.name AS specialization_name,
                   v.experience_level,
                   v.location,
                   v.created_at,
                   c.id   AS company_id,
                   c.name AS company_name
                 FROM vacancies v
                 JOIN specializations s ON v.specialization_id = s.id
                 JOIN companies c ON v.company_id = c.id
                 ORDER BY v.created_at DESC;`
            );
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('Ошибка при получении ленты вакансий:', error);
            res.status(500).json({ error: 'Failed to fetch vacancies feed' });
        } finally {
            client.release();
        }
    },

    getResumesFeed: async (res) => {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT
                   r.id,
                   r.title,
                   r.description,
                   r.expected_salary,
                   s.name AS specialization_name,
                   r.experience_level,
                   r.location,
                   r.created_at,
                   u.id   AS applicant_id,
                   u.name AS applicant_name
                 FROM resumes r
                 JOIN specializations s ON r.specialization_id = s.id
                 JOIN users u ON r.user_id = u.id
                 ORDER BY r.created_at DESC;`
            );
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('Ошибка при получении ленты резюме:', error);
            res.status(500).json({ error: 'Failed to fetch resumes feed' });
        } finally {
            client.release();
        }
    },

    getVacancyResponses: async (res, vacancyId) => {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT vr.id, vr.message, vr.created_at, vr.status,  u.id AS user_id, u.name AS user_name
         FROM vacancy_responses vr
         JOIN users u ON vr.user_id = u.id
         WHERE vr.vacancy_id = $1
         ORDER BY vr.created_at DESC;`,
                [vacancyId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error('Ошибка получения откликов вакансии:', err);
            res.status(500).json({ error: 'Failed to fetch vacancy responses' });
        } finally {
            client.release();
        }
    },

    createVacancyResponse: async (res, { vacancyId, userId, message }) => {
        const client = await pool.connect();
        console.log("userId: ",userId);
        try {
            const createdAt = new Date().toISOString().split('T')[0];
            const { rows } = await client.query(
                `INSERT INTO vacancy_responses
         (id, vacancy_id, user_id, message, created_at, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (user_id, vacancy_id)
       DO UPDATE
         SET status = 'pending',
             message = EXCLUDED.message,
             created_at = EXCLUDED.created_at
       RETURNING
         id,
         vacancy_id   AS "vacancyId",
         user_id      AS "userId",
         message,
         created_at   AS "created_at",
         status;`,
                [randomUUID(), vacancyId, userId, message, createdAt]
            );

            const statusCode = rows[0].created_at === createdAt ? 201 : 200;
            return res.status(statusCode).json(rows[0]);
        } catch (err) {
            console.error('Ошибка создания/обновления отклика:', err);
            return res.status(500).json({ error: 'Failed to create or update vacancy response' });
        } finally {
            client.release();
        }
    },

    getUserVacancyResponses: async (res, userId) => {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT
                    vr.id,
                    vr.message,
                    vr.created_at,
                    vr.status,
                    v.id         AS item_id,
                    v.title      AS item_title,
                    u_co.name    AS who_name
                FROM vacancy_responses vr
                         JOIN vacancies v   ON vr.vacancy_id = v.id
                         JOIN companies c   ON v.company_id = c.id
                         JOIN users u_co    ON c.owner_id = u_co.id
                WHERE vr.user_id = $1
                ORDER BY vr.created_at DESC;
            `, [userId]);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch user vacancy responses' });
        } finally {
            client.release();
        }
    },

    getOwnerVacancyResponses: async (res, ownerId) => {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT
                     vr.id,
                     vr.message,
                     vr.created_at,
                     vr.status,
                     u.id         AS applicant_id,
                     u.name       AS applicant_name,
                     v.id         AS vacancy_id,
                     v.title      AS vacancy_title
                 FROM vacancy_responses vr
                          JOIN vacancies v ON vr.vacancy_id = v.id
                          JOIN companies c ON v.company_id = c.id
                          JOIN users u     ON vr.user_id = u.id
                 WHERE c.owner_id = $1
                 ORDER BY vr.created_at DESC;`,
                [ownerId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error('Ошибка owner vacancy responses:', err);
            res.status(500).json({ error: 'Failed to fetch owner vacancy responses' });
        } finally {
            client.release();
        }
    },

    createChat: async (res, { id, applicantId, companyOwnerId, vacancyId }) => {
        const client = await pool.connect();
        try {
            const exists = await client.query(
                `SELECT id FROM chats
         WHERE applicant_id=$1 AND company_owner_id=$2 AND vacancy_id=$3`,
                [applicantId, companyOwnerId, vacancyId]
            );
            if (exists.rows.length) {
                return res.status(200).json(exists.rows[0]);
            }
            const result = await client.query(
                `INSERT INTO chats(id, applicant_id, company_owner_id, vacancy_id, created_at)
         VALUES($1,$2,$3,$4,NOW())
         RETURNING *`,
                [id, applicantId, companyOwnerId, vacancyId]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Ошибка создания чата:', err);
            res.status(500).json({ error: 'Не удалось создать чат' });
        } finally {
            client.release();
        }
    },

    getChatsByUser: async (res, userId) => {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT id, applicant_id, company_owner_id, vacancy_id, created_at
         FROM chats
         WHERE applicant_id=$1 OR company_owner_id=$1
         ORDER BY created_at DESC`,
                [userId]
            );
            res.status(200).json(result.rows);
        } catch (err) {
            console.error('Ошибка получения чатов:', err);
            res.status(500).json({ error: 'Не удалось получить чаты' });
        } finally {
            client.release();
        }
    },

    getChatMessages: async (res, userId, chatId) => {
        const client = await pool.connect();
        try {
            const chatCheck = await client.query(
                `SELECT 1 FROM chats
         WHERE id=$1 AND (applicant_id=$2 OR company_owner_id=$2)`,
                [chatId, userId]
            );
            if (!chatCheck.rows.length) {
                return res.status(404).json({ error: 'Чат не найден или недоступен' });
            }
            const messages = await client.query(
                `SELECT id, sender_id, text, created_at
         FROM messages
         WHERE chat_id=$1
         ORDER BY created_at ASC`,
                [chatId]
            );
            res.status(200).json(messages.rows);
        } catch (err) {
            console.error('Ошибка получения сообщений чата:', err);
            res.status(500).json({ error: 'Не удалось получить сообщения' });
        } finally {
            client.release();
        }
    },

    createMessage: async (res, { id, chatId, senderId, text }) => {
        const client = await pool.connect();
        try {
            if (!text || !text.trim()) {
                return res.status(400).json({ error: 'Сообщение не может быть пустым' });
            }
            const chatCheck = await client.query(
                `SELECT 1 FROM chats
         WHERE id=$1 AND (applicant_id=$2 OR company_owner_id=$2)`,
                [chatId, senderId]
            );
            if (!chatCheck.rows.length) {
                return res.status(403).json({ error: 'Вы не состоите в этом чате' });
            }
            const result = await client.query(
                `INSERT INTO messages(id, chat_id, sender_id, text, created_at)
         VALUES($1,$2,$3,$4,NOW())
         RETURNING *`,
                [id, chatId, senderId, text]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Ошибка создания сообщения:', err);
            res.status(500).json({ error: 'Не удалось отправить сообщение' });
        } finally {
            client.release();
        }
    },

    getVacancyById: async (res, vacancyId) => {
        try {
            const result = await pool.query(
                `SELECT 
         v.*,
         c.name AS company_name,
         s.name AS specialization_name
       FROM vacancies v
       JOIN companies c ON c.id = v.company_id
       JOIN specializations s ON s.id = v.specialization_id
       WHERE v.id = $1`,
                [vacancyId]
            );
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Vacancy not found' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch vacancy' });
        }
    },

    getResumeByIdOrUser: async (res, id) => {
        try {
            let result = await pool.query(
                `SELECT
         r.id,
         r.user_id,
         u.name             AS applicant_name,
         r.title,
         r.description,
         r.expected_salary,
         s.name             AS specialization_name,
         r.experience_level,
         r.location,
         r.created_at
       FROM resumes r
       LEFT JOIN users           u ON u.id = r.user_id
       LEFT JOIN specializations s ON s.id = r.specialization_id
       WHERE r.id = $1`,
                [id]
            );
            if (result.rows.length) {
                return res.json(result.rows[0]);
            }

            result = await pool.query(
                `SELECT
         r.id,
         r.user_id,
         u.name             AS applicant_name,
         r.title,
         r.description,
         r.expected_salary,
         s.name             AS specialization_name,
         r.experience_level,
         r.location,
         r.created_at
       FROM resumes r
       LEFT JOIN users           u ON u.id = r.user_id
       LEFT JOIN specializations s ON s.id = r.specialization_id
       WHERE r.user_id = $1`,
                [id]
            );
            if (result.rows.length) {
                return res.json(result.rows[0]);
            }

            return res.status(404).json({ error: 'Resume not found' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch resume' });
        }
    },

    getInvitedVacanciesForUser: async (res, userId) => {
        try {
            const { rows } = await pool.query(`
      SELECT
        vi.id,
        vi.message,
        vi.created_at,
        vi.status,
        v.id         AS vacancy_id,
        v.title      AS vacancy_title,
        u_co.id      AS employer_id,
        u_co.name    AS employer_name
      FROM vacancy_invitations vi
        JOIN vacancies v       ON vi.vacancy_id = v.id
        JOIN users u_co        ON vi.company_owner_id = u_co.id
      WHERE vi.applicant_id = $1
      ORDER BY vi.created_at DESC
    `, [userId]);
            res.json(rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch invited vacancies' });
        }
    },

    getSentVacancyInvitations: async (res, userId) => {
        try {
            const { rows } = await pool.query(`
      SELECT
        vi.id,
        vi.message,
        vi.created_at,
        vi.status,
        v.id         AS vacancy_id,
        v.title      AS vacancy_title,
        u_app.id     AS applicant_id,
        u_app.name   AS applicant_name
      FROM vacancy_invitations vi
        JOIN vacancies v       ON vi.vacancy_id = v.id
        JOIN users u_app       ON vi.applicant_id = u_app.id
      WHERE vi.company_owner_id = $1
      ORDER BY vi.created_at DESC
    `, [userId]);
            res.json(rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch sent vacancy invitations' });
        }
    },

    createVacancyInvitation: async (res, { id, companyOwnerId, applicantId, vacancyId, message }) => {
        const client = await pool.connect();
        try {
            const createdAt = new Date().toISOString().split('T')[0];
            const { rows } = await client.query(
                `INSERT INTO vacancy_invitations
         (id, company_owner_id, applicant_id, vacancy_id, message, created_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')
       ON CONFLICT (company_owner_id, applicant_id, vacancy_id)
       DO UPDATE
         SET status = 'pending',
             message = EXCLUDED.message,
             created_at = EXCLUDED.created_at
       RETURNING
         id,
         company_owner_id   AS "companyOwnerId",
         applicant_id       AS "applicantId",
         vacancy_id         AS "vacancyId",
         message,
         created_at         AS "created_at",
         status;`,
                [id, companyOwnerId, applicantId, vacancyId, message, createdAt]
            );
            const statusCode = rows[0].created_at === createdAt ? 201 : 200;
            return res.status(statusCode).json(rows[0]);
        } catch (err) {
            console.error('Ошибка создания/обновления приглашения:', err);
            return res.status(500).json({ error: 'Failed to create or update vacancy invitation' });
        } finally {
            client.release();
        }
    },

    updateVacancyResponseStatus: async (res, { responseId, status }) => {
        try {
            const result = await pool.query(
                `UPDATE vacancy_responses
         SET status = $1
       WHERE id = $2
       RETURNING *`,
                [status, responseId]
            );
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Отклик не найден' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Не удалось обновить статус отклика' });
        }
    },

    updateVacancyInvitationStatus: async (res, { invitationId, status }) => {
        try {
            const result = await pool.query(
                `UPDATE vacancy_invitations
         SET status = $1
       WHERE id = $2
       RETURNING *`,
                [status, invitationId]
            );
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Приглашение не найдено' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Не удалось обновить статус приглашения' });
        }
    },

};