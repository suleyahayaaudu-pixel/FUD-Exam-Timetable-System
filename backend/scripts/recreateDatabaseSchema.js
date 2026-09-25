const db = require('../src/config/db');

const defaultFaculties = [
    ['Faculty of Computing', 'COMP'],
    ['Faculty of Life Science', 'LIFE'],
    ['Faculty of Physical Science', 'PHYS'],
    ['Faculty of Art and Social Science', 'ARTS'],
    ['Faculty of Management Science', 'MGT'],
    ['Faculty of Agricultural Science', 'AGRI'],
    ['Faculty of Education', 'EDU'],
    ['Faculty of Basic Medical Science', 'BMS'],
    ['Faculty of Clinical Science', 'CLIN']
];

const schemaSql = [
    `
    CREATE TABLE IF NOT EXISTS faculties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        short_code VARCHAR(20) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_faculties_short_code (short_code)
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        short_code VARCHAR(30) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_departments_faculty_code (faculty_id, short_code),
        KEY idx_departments_faculty (faculty_id),
        CONSTRAINT fk_departments_faculty
            FOREIGN KEY (faculty_id) REFERENCES faculties(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NULL,
        department_id INT NULL,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_users_email (email),
        KEY idx_users_faculty (faculty_id),
        KEY idx_users_department (department_id),
        CONSTRAINT fk_users_faculty
            FOREIGN KEY (faculty_id) REFERENCES faculties(id)
            ON DELETE SET NULL,
        CONSTRAINT fk_users_department
            FOREIGN KEY (department_id) REFERENCES departments(id)
            ON DELETE SET NULL
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS academic_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        session_name VARCHAR(120) NOT NULL,
        semester ENUM('first', 'second') NOT NULL,
        exam_start_date DATE NOT NULL,
        exam_end_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_session_faculty_semester (faculty_id, session_name, semester),
        KEY idx_sessions_faculty (faculty_id),
        CONSTRAINT fk_sessions_faculty
            FOREIGN KEY (faculty_id) REFERENCES faculties(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS combined_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        group_name VARCHAR(150) NOT NULL,
        group_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_combined_groups_session_name (session_id, group_name),
        KEY idx_combined_groups_session (session_id),
        CONSTRAINT fk_combined_groups_session
            FOREIGN KEY (session_id) REFERENCES academic_sessions(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        session_id INT NOT NULL,
        course_code VARCHAR(30) NOT NULL,
        course_title VARCHAR(255) NOT NULL,
        level INT NOT NULL,
        credit_units INT NOT NULL,
        registered_students INT NOT NULL DEFAULT 0,
        regular_students INT NOT NULL DEFAULT 0,
        spillover_students INT NOT NULL DEFAULT 0,
        carryover_students INT NOT NULL DEFAULT 0,
        is_general_studies BOOLEAN NOT NULL DEFAULT FALSE,
        combined_group_id INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_courses_session_code (session_id, course_code),
        KEY idx_courses_department (department_id),
        KEY idx_courses_session (session_id),
        KEY idx_courses_combined_group (combined_group_id),
        CONSTRAINT fk_courses_department
            FOREIGN KEY (department_id) REFERENCES departments(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_courses_session
            FOREIGN KEY (session_id) REFERENCES academic_sessions(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_courses_combined_group
            FOREIGN KEY (combined_group_id) REFERENCES combined_groups(id)
            ON DELETE SET NULL
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS course_department_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        department_id INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_course_department (course_id, department_id),
        KEY idx_course_department_course (course_id),
        KEY idx_course_department_department (department_id),
        CONSTRAINT fk_course_department_course
            FOREIGN KEY (course_id) REFERENCES courses(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_course_department_department
            FOREIGN KEY (department_id) REFERENCES departments(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        matric_number VARCHAR(50) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        level INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_students_matric (matric_number),
        KEY idx_students_department (department_id),
        CONSTRAINT fk_students_department
            FOREIGN KEY (department_id) REFERENCES departments(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS venues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id INT NOT NULL,
        venue_name VARCHAR(150) NOT NULL,
        venue_code VARCHAR(30) NOT NULL,
        venue_type VARCHAR(50) NOT NULL,
        capacity INT NOT NULL,
        is_combinable BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_venues_faculty_code (faculty_id, venue_code),
        KEY idx_venues_faculty (faculty_id),
        CONSTRAINT fk_venues_faculty
            FOREIGN KEY (faculty_id) REFERENCES faculties(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS time_slots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        slot_label VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_time_slots_session_label (session_id, slot_label),
        KEY idx_time_slots_session (session_id),
        CONSTRAINT fk_time_slots_session
            FOREIGN KEY (session_id) REFERENCES academic_sessions(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS blackout_dates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        blackout_date DATE NOT NULL,
        reason VARCHAR(255) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blackout_session_date (session_id, blackout_date),
        KEY idx_blackout_session (session_id),
        CONSTRAINT fk_blackout_session
            FOREIGN KEY (session_id) REFERENCES academic_sessions(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS invigilators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        staff_id VARCHAR(50) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        max_duties_per_semester INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_invigilators_staff_id (staff_id),
        KEY idx_invigilators_department (department_id),
        CONSTRAINT fk_invigilators_department
            FOREIGN KEY (department_id) REFERENCES departments(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS timetables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        version_number INT NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_by INT NOT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_timetables_session (session_id),
        KEY idx_timetables_creator (created_by),
        CONSTRAINT fk_timetables_session
            FOREIGN KEY (session_id) REFERENCES academic_sessions(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_timetables_user
            FOREIGN KEY (created_by) REFERENCES users(id)
            ON DELETE RESTRICT
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS timetable_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timetable_id INT NOT NULL,
        course_id INT NOT NULL,
        exam_date DATE NOT NULL,
        time_slot_id INT NOT NULL,
        cohort_type VARCHAR(50) NOT NULL DEFAULT 'main',
        candidate_count INT NOT NULL DEFAULT 0,
        generated_by VARCHAR(50) NOT NULL DEFAULT 'system',
        status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_timetable_entries_timetable (timetable_id),
        KEY idx_timetable_entries_course (course_id),
        KEY idx_timetable_entries_slot (time_slot_id),
        CONSTRAINT fk_timetable_entries_timetable
            FOREIGN KEY (timetable_id) REFERENCES timetables(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_timetable_entries_course
            FOREIGN KEY (course_id) REFERENCES courses(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_timetable_entries_slot
            FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS timetable_entry_venues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timetable_entry_id INT NOT NULL,
        venue_id INT NOT NULL,
        allocated_candidates INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_entry_venues_entry (timetable_entry_id),
        KEY idx_entry_venues_venue (venue_id),
        CONSTRAINT fk_entry_venues_entry
            FOREIGN KEY (timetable_entry_id) REFERENCES timetable_entries(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_entry_venues_venue
            FOREIGN KEY (venue_id) REFERENCES venues(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS timetable_entry_invigilators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timetable_entry_id INT NOT NULL,
        invigilator_id INT NOT NULL,
        assignment_type VARCHAR(50) NOT NULL DEFAULT 'main',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_entry_invigilators_entry (timetable_entry_id),
        KEY idx_entry_invigilators_invigilator (invigilator_id),
        CONSTRAINT fk_entry_invigilators_entry
            FOREIGN KEY (timetable_entry_id) REFERENCES timetable_entries(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_entry_invigilators_invigilator
            FOREIGN KEY (invigilator_id) REFERENCES invigilators(id)
            ON DELETE CASCADE
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS timetable_feedback_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timetable_id INT NOT NULL,
        token_hash CHAR(64) NOT NULL,
        public_token VARCHAR(255) NOT NULL,
        created_by INT NOT NULL,
        expires_at DATETIME NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_feedback_token_hash (token_hash),
        UNIQUE KEY uq_feedback_public_token (public_token),
        KEY idx_feedback_link_timetable (timetable_id),
        KEY idx_feedback_link_active (is_active),
        CONSTRAINT fk_feedback_link_timetable
            FOREIGN KEY (timetable_id) REFERENCES timetables(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_feedback_link_creator
            FOREIGN KEY (created_by) REFERENCES users(id)
            ON DELETE RESTRICT
    )
    `,

    `
    CREATE TABLE IF NOT EXISTS timetable_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        feedback_link_id INT NOT NULL,
        timetable_id INT NOT NULL,
        department_id INT NOT NULL,
        course_id INT NULL,
        level INT NOT NULL,
        submitter_name VARCHAR(120) NOT NULL,
        submitter_role ENUM('class_rep', 'level_coordinator') NOT NULL,
        category ENUM('exam_clash', 'exam_date', 'exam_time', 'venue', 'missing_course', 'wrong_course', 'student_conflict', 'other') NOT NULL,
        comment TEXT NOT NULL,
        status ENUM('open', 'under_review', 'resolved', 'rejected') NOT NULL DEFAULT 'open',
        officer_response TEXT NULL,
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_feedback_link (feedback_link_id),
        KEY idx_feedback_timetable (timetable_id),
        KEY idx_feedback_department (department_id),
        KEY idx_feedback_course (course_id),
        KEY idx_feedback_status (status),
        KEY idx_feedback_created (created_at),
        CONSTRAINT fk_feedback_submission_link
            FOREIGN KEY (feedback_link_id) REFERENCES timetable_feedback_links(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_feedback_submission_timetable
            FOREIGN KEY (timetable_id) REFERENCES timetables(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_feedback_submission_department
            FOREIGN KEY (department_id) REFERENCES departments(id)
            ON DELETE RESTRICT,
        CONSTRAINT fk_feedback_submission_course
            FOREIGN KEY (course_id) REFERENCES courses(id)
            ON DELETE SET NULL,
        CONSTRAINT fk_feedback_reviewed_by
            FOREIGN KEY (reviewed_by) REFERENCES users(id)
            ON DELETE SET NULL
    )
    `
];

async function main() {
    try {
        for (const sql of schemaSql) {
            await db.query(sql);
        }

        if (defaultFaculties.length) {
            const facultyInsertSql = `
                INSERT IGNORE INTO faculties (name, short_code)
                VALUES ?
            `;

            await db.query(facultyInsertSql, [defaultFaculties]);
        }

        const [rows] = await db.query('SHOW TABLES');
        console.log('Database schema recreated successfully.');
        console.log('Tables created:', rows.length);
        console.log(rows.map(r => Object.values(r)[0]).sort().join(', '));
        console.log('Seeded faculties:', defaultFaculties.length);
    } catch (error) {
        console.error('Schema rebuild failed:', error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
}

main();
