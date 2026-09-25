const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/config/db');
const { createCourse, getCourses } = require('../src/controllers/courseController');

test('getCourses handles a missing course_department_links table without crashing', async () => {
  const originalQuery = db.query;

  db.query = async (sql) => {
    const statement = String(sql).toLowerCase();

    if (statement.includes('group_concat') || statement.includes('left join course_department_links')) {
      throw new Error("Table 'course_department_links' doesn't exist");
    }

    if (statement.includes('from courses')) {
      return [[{
        id: 7,
        department_id: 1,
        department_ids: '1,2',
        department_names: 'Computer Science, Mathematics',
        department_codes: 'CSC, MAT',
        department_name: 'Computer Science',
        department_code: 'CSC',
        session_id: 10,
        session_name: '2025/2026',
        semester: 'First Semester',
        course_code: 'CSE 101',
        course_title: 'Intro to Computing',
        level: 100,
        credit_units: 3,
        registered_students: 30,
        regular_students: 20,
        spillover_students: 5,
        carryover_students: 5,
        is_general_studies: 0,
        combined_group_id: null,
        is_active: 1,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      }]];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  };

  try {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };

    await getCourses({
      query: {},
      user: {
        faculty_id: 5,
        role: 'exam_officer'
      }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.courses[0].department_ids, [1, 2]);
    assert.deepEqual(res.body.courses[0].department_names, ['Computer Science', 'Mathematics']);
    assert.deepEqual(res.body.courses[0].department_codes, ['CSC', 'MAT']);
  } finally {
    db.query = originalQuery;
  }
});

test('createCourse accepts combined courses without a valid combined-group record', async () => {
  const originalQuery = db.query;

  db.query = async (sql) => {
    const statement = String(sql).toLowerCase();

    if (statement.includes('from departments')) {
      return [[
        { id: 1, name: 'Computer Science', short_code: 'CSC' },
        { id: 2, name: 'Mathematics', short_code: 'MAT' }
      ]];
    }

    if (statement.includes('from academic_sessions')) {
      return [[{
        id: 10,
        session_name: '2025/2026',
        semester: 'First Semester',
        is_active: 1
      }]];
    }

    if (statement.includes('from courses') && statement.includes('where session_id = ?')) {
      return [[]];
    }

    if (statement.includes('from combined_groups')) {
      return [[]];
    }

    if (statement.includes('insert into courses')) {
      return [{ insertId: 99 }];
    }

    if (statement.includes('insert ignore into course_department_links')) {
      return [{ affectedRows: 2 }];
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  };

  try {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };

    await createCourse({
      body: {
        session_id: 10,
        department_ids: [1, 2],
        course_code: 'GST 101',
        course_title: 'General Studies',
        level: 100,
        credit_units: 3,
        regular_students: 30,
        spillover_students: 5,
        carryover_students: 2,
        is_general_studies: true,
        combined_group_id: 999
      },
      user: {
        faculty_id: 5,
        role: 'exam_officer'
      }
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.course.combined_group_id, null);
  } finally {
    db.query = originalQuery;
  }
});
