const db = require('../config/db');


// ==========================================================
// GET ALL STUDENTS
// ==========================================================
const getStudents = async (req, res) => {
    return res.status(410).json({
        success: false,
        message:
            'Individual student registration is disabled. The system uses course registration counts instead.'
    });
};


// ==========================================================
// GET ONE STUDENT
// ==========================================================
const getStudentById = async (req, res) => {
    return res.status(410).json({
        success: false,
        message:
            'Individual student registration is disabled. The system uses course registration counts instead.'
    });
};


// ==========================================================
// UPLOAD / CREATE STUDENT
// ==========================================================
const createStudent = async (req, res) => {
    return res.status(410).json({
        success: false,
        message:
            'Individual student registration is disabled. Please enter the number of students per course on the course registration form.'
    });
};


// ==========================================================
// UPDATE STUDENT
// ==========================================================
const updateStudent = async (req, res) => {
    return res.status(410).json({
        success: false,
        message:
            'Individual student registration is disabled. Please update the course student counts instead.'
    });
};


// ==========================================================
// ACTIVATE / DEACTIVATE STUDENT
// EXAM OFFICER ONLY
// ==========================================================
const setStudentStatus = async (req, res) => {
    return res.status(410).json({
        success: false,
        message:
            'Individual student registration is disabled. Student counts are managed on each course.'
    });
};


module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    setStudentStatus
};