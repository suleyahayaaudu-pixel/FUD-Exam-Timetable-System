const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/config/db');
const { deleteInvigilator } = require('../src/controllers/invigilatorController');

test('deleteInvigilator checks the correct assignment table', async () => {
  const originalQuery = db.query;

  db.query = async (sql, params) => {
    const statement = String(sql).toLowerCase();

    if (statement.includes('from invigilators i') && statement.includes('where i.id = ?')) {
      return [[{ id: 4, staff_id: 'INV-001', full_name: 'Jane Doe' }]];
    }

    if (statement.includes('from timetable_entry_invigilators')) {
      return [[{ total: 0 }]];
    }

    if (statement.includes('delete from invigilators')) {
      return [[{ affectedRows: 1 }]];
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

    await deleteInvigilator(
      {
        params: { id: '4' },
        user: { faculty_id: 5 }
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  } finally {
    db.query = originalQuery;
  }
});
