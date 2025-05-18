CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) CHECK (role IN ('admin', 'company_owner', 'applicant')) NOT NULL,
    created_at DATE NOT NULL
);

CREATE TABLE specializations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE companies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    owner_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at DATE NOT NULL
);

CREATE TABLE vacancies (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    salary_from DECIMAL(8,2) NOT NULL,
    salary_to DECIMAL(8,2),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    specialization_id UUID NOT NULL REFERENCES specializations(id),
    experience_level VARCHAR(50) CHECK (experience_level IN ('junior', 'middle', 'senior')) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    expected_salary DECIMAL(8,2),
    specialization_id UUID NOT NULL REFERENCES specializations(id),
    experience_level VARCHAR(50) CHECK (experience_level IN ('junior', 'middle', 'senior')) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL
);

CREATE TABLE vacancy_responses (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vacancy_id UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at DATE NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending',
    UNIQUE(user_id, vacancy_id)
);

CREATE TABLE vacancy_invitations (
    id UUID PRIMARY KEY,
    company_owner_id UUID NOT NULL REFERENCES users(id),
    applicant_id UUID NOT NULL REFERENCES users(id),
    vacancy_id UUID NOT NULL REFERENCES vacancies(id),
    message TEXT NOT NULL,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(10) NOT NULL DEFAULT 'pending',
    CONSTRAINT uniq_invite UNIQUE(company_owner_id, applicant_id, vacancy_id)
);


CREATE TABLE chats (
    id UUID PRIMARY KEY,
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vacancy_id UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text VARCHAR(2048) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()

);


BEGIN;
INSERT INTO specializations (name) VALUES
    ('Frontend Developer'),
    ('Backend Developer'),
    ('Fullstack Developer'),
    ('DevOps Engineer'),
    ('Data Scientist'),
    ('Machine Learning Engineer'),
    ('Data Engineer'),
    ('Data Analyst'),
    ('Database Administrator'),
    ('System Administrator'),
    ('Network Engineer'),
    ('Cybersecurity Engineer'),
    ('QA Engineer'),
    ('Automation QA Engineer'),
    ('Business Analyst'),
    ('Systems Analyst'),
    ('Product Manager'),
    ('Project Manager'),
    ('UI/UX Designer'),
    ('Mobile Developer (iOS/Android)'),
    ('iOS Developer'),
    ('Android Developer'),
    ('Game Developer'),
    ('Embedded Systems Developer'),
    ('Blockchain Developer'),
    ('Technical Writer'),
    ('Scrum Master'),
    ('Team Lead'),
    ('CTO (Chief Technology Officer)'),
    ('Cloud Engineer'),
    ('SRE (Site Reliability Engineer)'),
    ('AI Research Scientist'),
    ('Big Data Engineer'),
    ('ERP Consultant'),
    ('IT Support Specialist'),
    ('Penetration Tester'),
    ('Software Architect'),
    ('Firmware Engineer'),
    ('Computer Vision Engineer'),
    ('NLP Engineer'),
    ('BI Developer'),
    ('Salesforce Developer'),
    ('Unity Developer'),
    ('Unreal Engine Developer'),
    ('AR/VR Developer'),
    ('Low-Code Developer'),
    ('RPA Developer'),
    ('Mainframe Developer'),
    ('IT Auditor'),
    ('Digital Marketing Tech Specialist');
COMMIT;
