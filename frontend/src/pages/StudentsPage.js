import ExamOfficerLayout from '../layouts/ExamOfficerLayout';

import '../styles/students.css';

const StudentsPage = () => {
    return (
        <ExamOfficerLayout activePage="Students">
            <section className="students-header">
                <div>
                    <span className="students-label">STUDENT REGISTRATION</span>
                    <h2>Students</h2>
                    <p>
                        Individual student registration is disabled. The system uses course-level student counts instead.
                    </p>
                </div>
            </section>

            <div className="student-error" style={{ marginTop: 20 }}>
                <strong>Disabled</strong>
                <span>
                    Please enter the number of students for each course in the course registration form.
                </span>
            </div>
        </ExamOfficerLayout>
    );
};

export default StudentsPage;
