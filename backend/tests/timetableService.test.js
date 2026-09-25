const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/config/db');
const { deleteTimetable } = require('../src/services/timetableService');

test('deleteTimetable ignores a missing complaints table', async () => {
  const originalGetConnection = db.getConnection;

  const connection = {
    async beginTransaction() {
      return undefined;
    },

    async query(sql) {
      const statement = String(sql).trim();

      if (
        statement.toLowerCase().includes('from timetables') &&
        statement.toLowerCase().includes('where t.id = ?')
      ) {
        return [[{
          id: 7,
          session_id: 3,
          title: 'Version 2',
          version_number: 2,
          status: 'draft'
        }]];
      }

      if (
        statement.toLowerCase().includes('from complaints c')
      ) {
        const error = new Error("Table 'fud_exam_timetable_v2.complaints' doesn't exist");
        error.code = 'ER_NO_SUCH_TABLE';
        throw error;
      }

      if (
        statement.toLowerCase().includes('from timetable_audit_log')
      ) {
        return [[{ total: 0 }]];
      }

      if (
        statement.toLowerCase().includes('from timetable_feedback_links')
      ) {
        return [[{ total: 0 }]];
      }

      if (
        statement.toLowerCase().includes('delete tev')
      ) {
        return [{ affectedRows: 0 }];
      }

      if (
        statement.toLowerCase().includes('delete tei')
      ) {
        return [{ affectedRows: 0 }];
      }

      if (
        statement.toLowerCase().includes('delete from timetable_entries')
      ) {
        return [{ affectedRows: 1 }];
      }

      if (
        statement.toLowerCase().includes('delete from timetables')
      ) {
        return [{ affectedRows: 1 }];
      }

      return [[{ total: 0 }]];
    },

    async commit() {
      return undefined;
    },

    async rollback() {
      return undefined;
    },

    release() {
      return undefined;
    }
  };

  db.getConnection = async () => connection;

  try {
    const result = await deleteTimetable(7, 5);

    assert.equal(result.timetable_id, 7);
    assert.equal(result.status, 'draft');
  } finally {
    db.getConnection = originalGetConnection;
  }
});
