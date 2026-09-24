const db = require('../config/db');


// ==========================================================
// BUILD COURSE CONFLICT GRAPH
// ==========================================================
const buildCourseConflictGraph = async (
    sessionId,
    facultyId
) => {

    // Confirm session/semester belongs to faculty
    const [sessionRows] = await db.query(
        `SELECT
            id,
            session_name,
            semester

         FROM academic_sessions

         WHERE id = ?
         AND faculty_id = ?

         LIMIT 1`,
        [
            Number(sessionId),
            Number(facultyId)
        ]
    );


    if (sessionRows.length === 0) {
        const error =
            new Error('Academic session not found');

        error.statusCode = 404;

        throw error;
    }


    // Find pairs of courses sharing students / having examination conflicts
    const [conflicts] = await db.query(
        `SELECT
            c1.id AS course_a_id,
            c1.course_code AS course_a_code,
            c1.course_title AS course_a_title,

            c2.id AS course_b_id,
            c2.course_code AS course_b_code,
            c2.course_title AS course_b_title,

            CASE
                -- If courses are in the same combined group
                WHEN c1.combined_group_id IS NOT NULL 
                     AND c1.combined_group_id = c2.combined_group_id 
                    THEN GREATEST(1, LEAST(c1.registered_students, c2.registered_students))

                -- If one or both are general studies at the same level
                WHEN (c1.is_general_studies = 1 OR c2.is_general_studies = 1) 
                     AND c1.level = c2.level
                    THEN GREATEST(1, 
                        CASE
                            WHEN c1.is_general_studies = 1 AND c2.is_general_studies = 1
                                THEN LEAST(c1.registered_students, c2.registered_students)
                            WHEN c1.is_general_studies = 1
                                THEN c2.registered_students
                            ELSE c1.registered_students
                        END
                    )

                -- If same department and same level
                WHEN c1.department_id = c2.department_id 
                     AND c1.level = c2.level
                    THEN GREATEST(1, 
                        CASE 
                            WHEN c1.regular_students > 0 AND c2.regular_students > 0 
                                THEN LEAST(c1.regular_students, c2.regular_students)
                            ELSE LEAST(c1.registered_students, c2.registered_students)
                        END
                    )

                ELSE 0
            END AS shared_students

         FROM courses c1

         INNER JOIN courses c2
            ON c1.id < c2.id
            AND c1.session_id = c2.session_id

         INNER JOIN departments d1
            ON c1.department_id = d1.id

         INNER JOIN departments d2
            ON c2.department_id = d2.id

         WHERE c1.session_id = ?
         AND c2.session_id = ?

         AND d1.faculty_id = ?
         AND d2.faculty_id = ?

         AND c1.is_active = TRUE
         AND c2.is_active = TRUE

         AND (
             (c1.department_id = c2.department_id AND c1.level = c2.level)
             OR (c1.combined_group_id IS NOT NULL AND c1.combined_group_id = c2.combined_group_id)
             OR ((c1.is_general_studies = 1 OR c2.is_general_studies = 1) AND c1.level = c2.level)
         )

         ORDER BY
            shared_students DESC,
            c1.course_code ASC,
            c2.course_code ASC`,
        [
            Number(sessionId),
            Number(sessionId),
            Number(facultyId),
            Number(facultyId)
        ]
    );


    // Build adjacency-list graph for future CSP
    const graph = {};


    for (const conflict of conflicts) {

        const courseA =
            String(conflict.course_a_id);

        const courseB =
            String(conflict.course_b_id);


        if (!graph[courseA]) {
            graph[courseA] = [];
        }

        if (!graph[courseB]) {
            graph[courseB] = [];
        }


        graph[courseA].push({
            course_id:
                conflict.course_b_id,

            course_code:
                conflict.course_b_code,

            shared_students:
                Number(conflict.shared_students)
        });


        graph[courseB].push({
            course_id:
                conflict.course_a_id,

            course_code:
                conflict.course_a_code,

            shared_students:
                Number(conflict.shared_students)
        });
    }


    return {
        session: sessionRows[0],

        conflict_count:
            conflicts.length,

        conflicts:
            conflicts.map((item) => ({
                ...item,
                shared_students:
                    Number(item.shared_students)
            })),

        graph
    };
};


module.exports = {
    buildCourseConflictGraph
};