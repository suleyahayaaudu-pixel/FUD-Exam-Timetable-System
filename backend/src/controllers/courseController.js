const db =
    require('../config/db');


// ==========================================================
// HELPERS
// ==========================================================

const normalizeStudentNumber = (
    value
) => {

    const number =
        Number(
            value
        );

    if (
        !Number.isInteger(
            number
        ) ||
        number < 0
    ) {

        return null;
    }

    return number;
};


const calculateRegisteredStudents = (
    regularStudents,
    spilloverStudents,
    carryoverStudents
) => {

    return (
        regularStudents +
        spilloverStudents +
        carryoverStudents
    );
};


const normalizeDepartmentIds = (
    value,
    fallbackId = null
) => {

    const rawValues =
        Array.isArray(value)
            ? value
            : value === undefined || value === null || value === ''
                ? []
                : [value];

    const ids =
        rawValues
            .flatMap(
                item => {

                    if (
                        Array.isArray(item)
                    ) {

                        return item;
                    }

                    if (
                        typeof item === 'string'
                    ) {

                        return item
                            .split(',')
                            .map(
                                part =>
                                    part.trim()
                            )
                            .filter(
                                part =>
                                    part.length > 0
                            );
                    }

                    return [item];
                }
            )
            .map(
                item => Number(item)
            )
            .filter(
                item =>
                    Number.isInteger(item) &&
                    item > 0
            );

    if (
        ids.length === 0 &&
        fallbackId !== null &&
        fallbackId !== undefined &&
        fallbackId !== ''
    ) {

        return [
            Number(
                fallbackId
            )
        ];
    }

    return [
        ...new Set(ids)
    ];
};


// ==========================================================
// GET ALL COURSES
// ==========================================================

const getCourses = async (
    req,
    res
) => {

    try {

        const facultyId =
            Number(
                req.user.faculty_id
            );


        const userRole =
            String(
                req.user.role
            )
                .trim()
                .toLowerCase();


        const userDepartmentId =
            req.user.department_id
                ? Number(
                    req.user.department_id
                )
                : null;


        const {
            session_id,
            department_id,
            level,
            is_active
        } = req.query;


        let sql = `
            SELECT
                c.id,
                c.department_id,
                GROUP_CONCAT(DISTINCT cdl.department_id ORDER BY cdl.department_id SEPARATOR ',') AS department_ids,
                GROUP_CONCAT(DISTINCT d2.name ORDER BY d2.name SEPARATOR ', ') AS department_names,
                GROUP_CONCAT(DISTINCT d2.short_code ORDER BY d2.short_code SEPARATOR ', ') AS department_codes,

                d.name AS department_name,
                d.short_code AS department_code,

                c.session_id,

                s.session_name,
                s.semester,

                c.course_code,
                c.course_title,
                c.level,
                c.credit_units,

                c.registered_students,
                c.regular_students,
                c.spillover_students,
                c.carryover_students,

                c.is_general_studies,
                c.combined_group_id,
                c.is_active,
                c.created_at,
                c.updated_at

            FROM courses c

            INNER JOIN departments d
                ON c.department_id = d.id

            LEFT JOIN course_department_links cdl
                ON cdl.course_id = c.id

            LEFT JOIN departments d2
                ON d2.id = cdl.department_id

            INNER JOIN academic_sessions s
                ON c.session_id = s.id

            WHERE d.faculty_id = ?
            AND s.faculty_id = ?
        `;


        const params = [
            facultyId,
            facultyId
        ];


        // --------------------------------------------------
        // COORDINATOR RESTRICTION
        // --------------------------------------------------

        if (
            userRole ===
            'departmental_coordinator'
        ) {

            if (
                !userDepartmentId
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        'No department is assigned to this coordinator'

                });
            }


            sql += `
                AND c.department_id = ?
            `;


            params.push(
                userDepartmentId
            );


        } else if (
            department_id
        ) {

            sql += `
                AND c.department_id = ?
            `;


            params.push(
                Number(
                    department_id
                )
            );
        }


        if (
            session_id
        ) {

            sql += `
                AND c.session_id = ?
            `;


            params.push(
                Number(
                    session_id
                )
            );
        }


        if (
            level
        ) {

            sql += `
                AND c.level = ?
            `;


            params.push(
                Number(
                    level
                )
            );
        }


        if (
            is_active === 'true' ||
            is_active === 'false'
        ) {

            sql += `
                AND c.is_active = ?
            `;


            params.push(
                is_active === 'true'
            );
        }


        sql += `
            GROUP BY
                c.id,
                c.department_id,
                d.name,
                d.short_code,
                d2.name,
                d2.short_code,
                c.session_id,
                s.session_name,
                s.semester,
                c.course_code,
                c.course_title,
                c.level,
                c.credit_units,
                c.registered_students,
                c.regular_students,
                c.spillover_students,
                c.carryover_students,
                c.is_general_studies,
                c.combined_group_id,
                c.is_active,
                c.created_at,
                c.updated_at
            ORDER BY
                s.session_name DESC,
                s.semester ASC,
                d.short_code ASC,
                c.level ASC,
                c.course_code ASC
        `;


        let courses;

        try {

            [courses] =
                await db.query(
                    sql,
                    params
                );

        } catch (error) {

            const message =
                String(
                    error.message || ''
                ).toLowerCase();

            if (
                !message.includes("doesn't exist") &&
                !message.includes('does not exist') &&
                !message.includes('no such table')
            ) {

                throw error;
            }

            let fallbackSql = `
                SELECT
                    c.id,
                    c.department_id,
                    c.department_id AS department_ids,
                    d.name AS department_names,
                    d.short_code AS department_codes,

                    d.name AS department_name,
                    d.short_code AS department_code,

                    c.session_id,
                    s.session_name,
                    s.semester,
                    c.course_code,
                    c.course_title,
                    c.level,
                    c.credit_units,
                    c.registered_students,
                    c.regular_students,
                    c.spillover_students,
                    c.carryover_students,
                    c.is_general_studies,
                    c.combined_group_id,
                    c.is_active,
                    c.created_at,
                    c.updated_at

                FROM courses c

                INNER JOIN departments d
                    ON c.department_id = d.id

                INNER JOIN academic_sessions s
                    ON c.session_id = s.id

                WHERE d.faculty_id = ?
                AND s.faculty_id = ?
            `;

            const fallbackParams = [
                facultyId,
                facultyId
            ];

            if (
                userRole ===
                'departmental_coordinator'
            ) {

                fallbackSql += `
                    AND c.department_id = ?
                `;

                fallbackParams.push(
                    userDepartmentId
                );

            } else if (
                department_id
            ) {

                fallbackSql += `
                    AND c.department_id = ?
                `;

                fallbackParams.push(
                    Number(
                        department_id
                    )
                );
            }

            if (
                session_id
            ) {

                fallbackSql += `
                    AND c.session_id = ?
                `;

                fallbackParams.push(
                    Number(
                        session_id
                    )
                );
            }

            if (
                level
            ) {

                fallbackSql += `
                    AND c.level = ?
                `;

                fallbackParams.push(
                    Number(
                        level
                    )
                );
            }

            if (
                is_active === 'true' ||
                is_active === 'false'
            ) {

                fallbackSql += `
                    AND c.is_active = ?
                `;

                fallbackParams.push(
                    is_active === 'true'
                );
            }

            fallbackSql += `
                ORDER BY
                    s.session_name DESC,
                    s.semester ASC,
                    d.short_code ASC,
                    c.level ASC,
                    c.course_code ASC
            `;

            [courses] =
                await db.query(
                    fallbackSql,
                    fallbackParams
                );
        }


        const normalizedCourses =
            courses.map(
                course => {

                    const departmentIds =
                        course.department_ids
                            ? String(
                                course.department_ids
                            )
                                .split(',')
                                .filter(
                                    value =>
                                        value
                                )
                                .map(
                                    value =>
                                        Number(value)
                                )
                            : [
                                Number(
                                    course.department_id
                                )
                            ];

                    const departmentNames =
                        course.department_names
                            ? String(
                                course.department_names
                            )
                                .split(',')
                                .map(
                                    value =>
                                        value.trim()
                                )
                                .filter(
                                    Boolean
                                )
                            : [
                                course.department_name
                            ].filter(
                                Boolean
                            );

                    const departmentCodes =
                        course.department_codes
                            ? String(
                                course.department_codes
                            )
                                .split(',')
                                .map(
                                    value =>
                                        value.trim()
                                )
                                .filter(
                                    Boolean
                                )
                            : [
                                course.department_code
                            ].filter(
                                Boolean
                            );

                    return {

                        ...course,

                        department_ids:
                            departmentIds,

                        department_names:
                            departmentNames,

                        department_codes:
                            departmentCodes

                    };
                }
            );


        return res.status(200).json({

            success: true,

            count:
                normalizedCourses.length,

            courses:
                normalizedCourses

        });


    } catch (error) {

        console.error(
            'Get courses error:',
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                'Unable to retrieve courses'

        });
    }
};


// ==========================================================
// GET ONE COURSE
// ==========================================================

const getCourseById = async (
    req,
    res
) => {

    try {

        const courseId =
            Number(
                req.params.id
            );


        const facultyId =
            Number(
                req.user.faculty_id
            );


        const userRole =
            String(
                req.user.role
            )
                .trim()
                .toLowerCase();


        const userDepartmentId =
            req.user.department_id
                ? Number(
                    req.user.department_id
                )
                : null;


        let rows;

        try {

            [rows] =
                await db.query(
                    `SELECT
                        c.id,
                        c.department_id,
                        GROUP_CONCAT(DISTINCT cdl.department_id ORDER BY cdl.department_id SEPARATOR ',') AS department_ids,

                        d.name AS department_name,
                        d.short_code AS department_code,

                        c.session_id,

                        s.session_name,
                        s.semester,

                        c.course_code,
                        c.course_title,
                        c.level,
                        c.credit_units,

                        c.registered_students,
                        c.regular_students,
                        c.spillover_students,
                        c.carryover_students,

                        c.is_general_studies,
                        c.combined_group_id,
                        c.is_active

                     FROM courses c

                     INNER JOIN departments d
                        ON c.department_id = d.id

                     LEFT JOIN course_department_links cdl
                        ON cdl.course_id = c.id

                     INNER JOIN academic_sessions s
                        ON c.session_id = s.id

                     WHERE c.id = ?
                     AND d.faculty_id = ?
                     AND s.faculty_id = ?

                     GROUP BY
                        c.id,
                        c.department_id,
                        d.name,
                        d.short_code,
                        c.session_id,
                        s.session_name,
                        s.semester,
                        c.course_code,
                        c.course_title,
                        c.level,
                        c.credit_units,
                        c.registered_students,
                        c.regular_students,
                        c.spillover_students,
                        c.carryover_students,
                        c.is_general_studies,
                        c.combined_group_id,
                        c.is_active

                     LIMIT 1`,
                    [
                        courseId,
                        facultyId,
                        facultyId
                    ]
                );

        } catch (error) {

            const message =
                String(
                    error.message || ''
                ).toLowerCase();

            if (
                !message.includes("doesn't exist") &&
                !message.includes('does not exist') &&
                !message.includes('no such table')
            ) {

                throw error;
            }

            [rows] =
                await db.query(
                    `SELECT
                        c.id,
                        c.department_id,
                        c.department_id AS department_ids,

                        d.name AS department_name,
                        d.short_code AS department_code,

                        c.session_id,

                        s.session_name,
                        s.semester,

                        c.course_code,
                        c.course_title,
                        c.level,
                        c.credit_units,

                        c.registered_students,
                        c.regular_students,
                        c.spillover_students,
                        c.carryover_students,

                        c.is_general_studies,
                        c.combined_group_id,
                        c.is_active

                     FROM courses c

                     INNER JOIN departments d
                        ON c.department_id = d.id

                     INNER JOIN academic_sessions s
                        ON c.session_id = s.id

                     WHERE c.id = ?
                     AND d.faculty_id = ?
                     AND s.faculty_id = ?

                     LIMIT 1`,
                    [
                        courseId,
                        facultyId,
                        facultyId
                    ]
                );
        }


        if (
            rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Course not found'

            });
        }


        const course =
            rows[0];

        if (
            course
        ) {

            course.department_ids =
                course.department_ids
                    ? String(
                        course.department_ids
                    )
                        .split(',')
                        .filter(
                            value =>
                                value
                        )
                        .map(
                            value =>
                                Number(value)
                        )
                    : [
                        Number(
                            course.department_id
                        )
                    ];
        }


        if (
            userRole ===
            'departmental_coordinator' &&
            Number(
                course.department_id
            ) !==
            Number(
                userDepartmentId
            )
        ) {

            return res.status(403).json({

                success: false,

                message:
                    'You can only view courses from your department'

            });
        }


        return res.status(200).json({

            success: true,

            course

        });


    } catch (error) {

        console.error(
            'Get course error:',
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                'Unable to retrieve course'

        });
    }
};


// ==========================================================
// CREATE COURSE
// ==========================================================

const createCourse = async (
    req,
    res
) => {

    try {

        const facultyId =
            Number(
                req.user.faculty_id
            );


        const userRole =
            String(
                req.user.role
            )
                .trim()
                .toLowerCase();


        const userDepartmentId =
            req.user.department_id
                ? Number(
                    req.user.department_id
                )
                : null;


        let {
            department_id,
            department_ids,
            session_id,
            course_code,
            course_title,
            level,
            credit_units = 3,

            regular_students = 0,
            spillover_students = 0,
            carryover_students = 0,

            is_general_studies = false,
            combined_group_id = null

        } = req.body;


        if (
            !session_id ||
            !course_code ||
            !course_title ||
            !level
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Session, course code, course title and level are required'

            });
        }


        const selectedDepartmentIds =
            normalizeDepartmentIds(
                department_ids,
                department_id
            );


        if (
            userRole ===
            'departmental_coordinator'
        ) {

            if (
                !userDepartmentId
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        'No department is assigned to this coordinator'

                });
            }


            department_id =
                userDepartmentId;

            selectedDepartmentIds.splice(
                0,
                selectedDepartmentIds.length,
                userDepartmentId
            );
        }


        const allowsMultipleDepartments =
            Boolean(
                is_general_studies
            ) ||
            Boolean(
                combined_group_id
            );


        if (
            selectedDepartmentIds.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Department is required'

            });
        }


        if (
            !allowsMultipleDepartments &&
            selectedDepartmentIds.length > 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Only general studies and combined courses can select multiple departments'

            });
        }


        if (
            userRole ===
            'exam_officer' &&
            !department_id &&
            selectedDepartmentIds.length > 0
        ) {

            department_id =
                selectedDepartmentIds[0];
        }


        const regularStudents =
            normalizeStudentNumber(
                regular_students
            );


        const spilloverStudents =
            normalizeStudentNumber(
                spillover_students
            );


        const carryoverStudents =
            normalizeStudentNumber(
                carryover_students
            );


        if (
            regularStudents === null ||
            spilloverStudents === null ||
            carryoverStudents === null
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Student counts must be whole numbers greater than or equal to zero'

            });
        }


        const registeredStudents =
            calculateRegisteredStudents(
                regularStudents,
                spilloverStudents,
                carryoverStudents
            );


        if (
            Number(level) <= 0 ||
            Number(credit_units) <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Invalid numerical course values'

            });
        }


        // --------------------------------------------------
        // VERIFY DEPARTMENT
        // --------------------------------------------------

        const [departmentRows] =
            await db.query(
                `SELECT
                    id,
                    name,
                    short_code

                 FROM departments

                 WHERE id IN (?)
                 AND faculty_id = ?`,
                [
                    selectedDepartmentIds,
                    facultyId
                ]
            );


        if (
            departmentRows.length !==
            selectedDepartmentIds.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'One or more departments are invalid for this faculty'

            });
        }

        const primaryDepartment =
            departmentRows.find(
                row =>
                    Number(
                        row.id
                    ) === Number(
                        selectedDepartmentIds[0]
                    )
            ) || departmentRows[0];


        // --------------------------------------------------
        // VERIFY SESSION
        // --------------------------------------------------

        const [sessionRows] =
            await db.query(
                `SELECT
                    id,
                    session_name,
                    semester,
                    is_active

                 FROM academic_sessions

                 WHERE id = ?
                 AND faculty_id = ?

                 LIMIT 1`,
                [
                    Number(
                        session_id
                    ),

                    facultyId
                ]
            );


        if (
            sessionRows.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Invalid academic session'

            });
        }


        const normalizedCode =
            String(
                course_code
            )
                .trim()
                .toUpperCase();


        // --------------------------------------------------
        // DUPLICATE COURSE CODE
        // --------------------------------------------------

        const [duplicateRows] =
            await db.query(
                `SELECT
                    id

                 FROM courses

                 WHERE session_id = ?
                 AND LOWER(course_code) = LOWER(?)

                 LIMIT 1`,
                [
                    Number(
                        session_id
                    ),

                    normalizedCode
                ]
            );


        if (
            duplicateRows.length > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    'Course code already exists for the selected semester'

            });
        }


        // --------------------------------------------------
        // COMBINED GROUP (OPTIONAL)
        // --------------------------------------------------

        const normalizedCombinedGroupId =
            combined_group_id === '' ||
            combined_group_id === null ||
            combined_group_id === undefined ||
            combined_group_id === '0'
                ? null
                : Number(
                    combined_group_id
                );


        if (
            normalizedCombinedGroupId
        ) {

            const [groupRows] =
                await db.query(
                    `SELECT
                        id

                     FROM combined_groups

                     WHERE id = ?
                     AND session_id = ?

                     LIMIT 1`,
                    [
                        normalizedCombinedGroupId,
                        Number(
                            session_id
                        )
                    ]
                );


            if (
                groupRows.length === 0
            ) {

                // Keep the course creation flexible for departments using
                // general studies / combined registrations without a formal
                // combined-group record yet.
                combined_group_id = null;
            }
        } else {

            combined_group_id = null;
        }


        // --------------------------------------------------
        // INSERT
        // --------------------------------------------------

        const [result] =
            await db.query(
                `INSERT INTO courses
                (
                    department_id,
                    session_id,

                    course_code,
                    course_title,

                    level,
                    credit_units,

                    registered_students,
                    regular_students,
                    spillover_students,
                    carryover_students,

                    is_general_studies,
                    combined_group_id,
                    is_active
                )

                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [
                    Number(
                        department_id ||
                        selectedDepartmentIds[0]
                    ),

                    Number(
                        session_id
                    ),

                    normalizedCode,

                    String(
                        course_title
                    ).trim(),

                    Number(
                        level
                    ),

                    Number(
                        credit_units
                    ),

                    registeredStudents,

                    regularStudents,

                    spilloverStudents,

                    carryoverStudents,

                    Boolean(
                        is_general_studies
                    ),

                    combined_group_id
                        ? Number(
                            combined_group_id
                        )
                        : null
                ]
            );


        if (
            selectedDepartmentIds.length > 0
        ) {

            try {

                const courseDepartmentRows =
                    selectedDepartmentIds.map(
                        courseDepartmentId => [
                            Number(
                                result.insertId
                            ),
                            Number(
                                courseDepartmentId
                            )
                        ]
                    );

                await db.query(
                    `INSERT IGNORE INTO course_department_links
                    (
                        course_id,
                        department_id
                    )
                    VALUES ?`,
                    [
                        courseDepartmentRows
                    ]
                );

            } catch (insertError) {

                const message =
                    String(
                        insertError.message || ''
                    ).toLowerCase();

                if (
                    !message.includes("doesn't exist") &&
                    !message.includes('does not exist') &&
                    !message.includes('no such table')
                ) {

                    throw insertError;
                }
            }
        }


        return res.status(201).json({

            success: true,

            message:
                'Course created successfully',

            course: {

                id:
                    result.insertId,

                department_id:
                    Number(
                        department_id ||
                        selectedDepartmentIds[0]
                    ),

                department_name:
                    primaryDepartment.name,

                department_code:
                    primaryDepartment.short_code,

                session_id:
                    Number(
                        session_id
                    ),

                session_name:
                    sessionRows[0].session_name,

                semester:
                    sessionRows[0].semester,

                course_code:
                    normalizedCode,

                course_title:
                    String(
                        course_title
                    ).trim(),

                level:
                    Number(
                        level
                    ),

                credit_units:
                    Number(
                        credit_units
                    ),

                registered_students:
                    registeredStudents,

                regular_students:
                    regularStudents,

                spillover_students:
                    spilloverStudents,

                carryover_students:
                    carryoverStudents,

                is_general_studies:
                    Boolean(
                        is_general_studies
                    ),

                combined_group_id:
                    combined_group_id
                        ? Number(
                            combined_group_id
                        )
                        : null,

                is_active:
                    true
            }

        });


    } catch (error) {

        console.error(
            'Create course error:',
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                'Unable to create course'

        });
    }
};


// ==========================================================
// UPDATE COURSE
// ==========================================================

const updateCourse = async (
    req,
    res
) => {

    try {

        const courseId =
            Number(
                req.params.id
            );


        const facultyId =
            Number(
                req.user.faculty_id
            );


        const userRole =
            String(
                req.user.role
            )
                .trim()
                .toLowerCase();


        const userDepartmentId =
            req.user.department_id
                ? Number(
                    req.user.department_id
                )
                : null;


        const selectedDepartmentIds =
            normalizeDepartmentIds(
                req.body.department_ids,
                req.body.department_id
            );


        let {
            department_id,
            department_ids,
            session_id,
            course_code,
            course_title,
            level,
            credit_units,

            regular_students = 0,
            spillover_students = 0,
            carryover_students = 0,

            is_general_studies = false,
            combined_group_id = null

        } = req.body;


        if (
            !courseId ||
            !session_id ||
            !course_code ||
            !course_title ||
            !level ||
            !credit_units
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Required course fields are missing'

            });
        }


        const regularStudents =
            normalizeStudentNumber(
                regular_students
            );


        const spilloverStudents =
            normalizeStudentNumber(
                spillover_students
            );


        const carryoverStudents =
            normalizeStudentNumber(
                carryover_students
            );


        if (
            regularStudents === null ||
            spilloverStudents === null ||
            carryoverStudents === null
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Student counts must be whole numbers greater than or equal to zero'

            });
        }


        const registeredStudents =
            calculateRegisteredStudents(
                regularStudents,
                spilloverStudents,
                carryoverStudents
            );


        if (
            Number(level) <= 0 ||
            Number(credit_units) <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Invalid numerical course values'

            });
        }


        // --------------------------------------------------
        // FIND COURSE
        // --------------------------------------------------

        const [courseRows] =
            await db.query(
                `SELECT
                    c.id,
                    c.department_id,
                    c.session_id

                 FROM courses c

                 INNER JOIN departments d
                    ON c.department_id = d.id

                 WHERE c.id = ?
                 AND d.faculty_id = ?

                 LIMIT 1`,
                [
                    courseId,
                    facultyId
                ]
            );


        if (
            courseRows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Course not found'

            });
        }


        const existingCourse =
            courseRows[0];


        // --------------------------------------------------
        // COORDINATOR RESTRICTION
        // --------------------------------------------------

        if (
            userRole ===
            'departmental_coordinator'
        ) {

            if (
                Number(
                    existingCourse.department_id
                ) !==
                Number(
                    userDepartmentId
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        'You can only update courses from your department'

                });
            }


            department_id =
                userDepartmentId;

            selectedDepartmentIds.splice(
                0,
                selectedDepartmentIds.length,
                userDepartmentId
            );


        } else if (
            userRole ===
            'exam_officer'
        ) {

            if (
                selectedDepartmentIds.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Department is required'

                });
            }

            department_id =
                selectedDepartmentIds[0];
        }


        // --------------------------------------------------
        // VERIFY DEPARTMENT
        // --------------------------------------------------

        const [departmentRows] =
            await db.query(
                `SELECT
                    id,
                    name,
                    short_code

                 FROM departments

                 WHERE id IN (?)
                 AND faculty_id = ?`,
                [
                    selectedDepartmentIds,
                    facultyId
                ]
            );


        if (
            departmentRows.length !==
            selectedDepartmentIds.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'One or more departments are invalid for this faculty'

            });
        }

        const primaryDepartment =
            departmentRows.find(
                row =>
                    Number(
                        row.id
                    ) === Number(
                        selectedDepartmentIds[0]
                    )
            ) || departmentRows[0];


        // --------------------------------------------------
        // VERIFY SESSION
        // --------------------------------------------------

        const [sessionRows] =
            await db.query(
                `SELECT
                    id,
                    session_name,
                    semester

                 FROM academic_sessions

                 WHERE id = ?
                 AND faculty_id = ?

                 LIMIT 1`,
                [
                    Number(
                        session_id
                    ),

                    facultyId
                ]
            );


        if (
            sessionRows.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Invalid academic session'

            });
        }


        const normalizedCode =
            String(
                course_code
            )
                .trim()
                .toUpperCase();


        // --------------------------------------------------
        // DUPLICATE
        // --------------------------------------------------

        const [duplicateRows] =
            await db.query(
                `SELECT
                    id

                 FROM courses

                 WHERE session_id = ?
                 AND LOWER(course_code) = LOWER(?)
                 AND id <> ?

                 LIMIT 1`,
                [
                    Number(
                        session_id
                    ),

                    normalizedCode,

                    courseId
                ]
            );


        if (
            duplicateRows.length > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    'Course code already exists for this semester'

            });
        }


        // --------------------------------------------------
        // COMBINED GROUP (OPTIONAL)
        // --------------------------------------------------

        const normalizedCombinedGroupId =
            combined_group_id === '' ||
            combined_group_id === null ||
            combined_group_id === undefined ||
            combined_group_id === '0'
                ? null
                : Number(
                    combined_group_id
                );


        if (
            normalizedCombinedGroupId
        ) {

            const [groupRows] =
                await db.query(
                    `SELECT
                        id

                     FROM combined_groups

                     WHERE id = ?
                     AND session_id = ?

                     LIMIT 1`,
                    [
                        normalizedCombinedGroupId,
                        Number(
                            session_id
                        )
                    ]
                );


            if (
                groupRows.length === 0
            ) {

                combined_group_id = null;
            }
        } else {

            combined_group_id = null;
        }


        // --------------------------------------------------
        // UPDATE
        // --------------------------------------------------

        const [result] =
            await db.query(
                `UPDATE courses

                 SET
                    department_id = ?,
                    session_id = ?,

                    course_code = ?,
                    course_title = ?,

                    level = ?,
                    credit_units = ?,

                    registered_students = ?,
                    regular_students = ?,
                    spillover_students = ?,
                    carryover_students = ?,

                    is_general_studies = ?,
                    combined_group_id = ?

                 WHERE id = ?`,
                [
                    Number(
                        department_id ||
                        selectedDepartmentIds[0]
                    ),

                    Number(
                        session_id
                    ),

                    normalizedCode,

                    String(
                        course_title
                    ).trim(),

                    Number(
                        level
                    ),

                    Number(
                        credit_units
                    ),

                    registeredStudents,

                    regularStudents,

                    spilloverStudents,

                    carryoverStudents,

                    Boolean(
                        is_general_studies
                    ),

                    combined_group_id
                        ? Number(
                            combined_group_id
                        )
                        : null,

                    courseId
                ]
            );


        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Course not found'

            });
        }


        if (
            selectedDepartmentIds.length > 0
        ) {

            try {

                const courseDepartmentRows =
                    selectedDepartmentIds.map(
                        courseDepartmentId => [
                            Number(
                                courseId
                            ),
                            Number(
                                courseDepartmentId
                            )
                        ]
                    );

                await db.query(
                    `INSERT IGNORE INTO course_department_links
                    (
                        course_id,
                        department_id
                    )
                    VALUES ?`,
                    [
                        courseDepartmentRows
                    ]
                );

            } catch (insertError) {

                const message =
                    String(
                        insertError.message || ''
                    ).toLowerCase();

                if (
                    !message.includes("doesn't exist") &&
                    !message.includes('does not exist') &&
                    !message.includes('no such table')
                ) {

                    throw insertError;
                }
            }
        }


        return res.status(200).json({

            success: true,

            message:
                'Course updated successfully',

            course: {

                id:
                    courseId,

                registered_students:
                    registeredStudents,

                regular_students:
                    regularStudents,

                spillover_students:
                    spilloverStudents,

                carryover_students:
                    carryoverStudents

            }

        });


    } catch (error) {

        console.error(
            'Update course error:',
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                'Unable to update course'

        });
    }
};


// ==========================================================
// ACTIVATE / DEACTIVATE
// ==========================================================

const setCourseStatus = async (
    req,
    res
) => {

    try {

        const courseId =
            Number(
                req.params.id
            );


        const facultyId =
            Number(
                req.user.faculty_id
            );


        const {
            is_active
        } = req.body;


        if (
            typeof is_active !==
            'boolean'
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'is_active must be true or false'

            });
        }


        const [result] =
            await db.query(
                `UPDATE courses c

                 INNER JOIN departments d
                    ON c.department_id = d.id

                 SET c.is_active = ?

                 WHERE c.id = ?
                 AND d.faculty_id = ?`,
                [
                    is_active,

                    courseId,

                    facultyId
                ]
            );


        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Course not found'

            });
        }


        return res.status(200).json({

            success: true,

            message:
                is_active
                    ? 'Course activated successfully'
                    : 'Course deactivated successfully'

        });


    } catch (error) {

        console.error(
            'Course status error:',
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                'Unable to update course status'

        });
    }
};


// ==========================================================
// DELETE COURSE
// ==========================================================

const deleteCourse = async (
    req,
    res
) => {

    try {

        const courseId =
            Number(
                req.params.id
            );


        const facultyId =
            Number(
                req.user.faculty_id
            );


        if (
            !Number.isInteger(
                courseId
            ) ||
            courseId <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    'Invalid course ID'

            });
        }


        // --------------------------------------------------
        // VERIFY COURSE BELONGS TO FACULTY
        // --------------------------------------------------

        const [courseRows] =
            await db.query(
                `SELECT
                    c.id,
                    c.course_code,
                    c.course_title

                 FROM courses c

                 INNER JOIN departments d
                    ON c.department_id = d.id

                 WHERE c.id = ?
                 AND d.faculty_id = ?

                 LIMIT 1`,
                [
                    courseId,
                    facultyId
                ]
            );


        if (
            courseRows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Course not found'

            });
        }


        const course =
            courseRows[0];


        // --------------------------------------------------
        // CHECK TIMETABLE USAGE
        // --------------------------------------------------

        const [timetableRows] =
            await db.query(
                `SELECT
                    COUNT(*) AS total

                 FROM timetable_entries

                 WHERE course_id = ?`,
                [
                    courseId
                ]
            );


        const timetableCount =
            Number(
                timetableRows[0].total
            );


        if (
            timetableCount > 0
        ) {

            return res.status(409).json({

                success: false,

                message:
                    `Cannot delete ${course.course_code} because it is already used in ${timetableCount} timetable examination record(s).`

            });
        }


        // --------------------------------------------------
        // DELETE
        // --------------------------------------------------

        const [result] =
            await db.query(
                `DELETE FROM courses

                 WHERE id = ?`,
                [
                    courseId
                ]
            );


        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    'Course not found'

            });
        }


        return res.status(200).json({

            success: true,

            message:
                `Course ${course.course_code} deleted successfully`

        });


    } catch (error) {

        console.error(
            'Delete course error:',
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                'Unable to delete course'

        });
    }
};


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getCourses,

    getCourseById,

    createCourse,

    updateCourse,

    setCourseStatus,

    deleteCourse

};