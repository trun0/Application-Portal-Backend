CREATE TABLE admin(
    admin_id SERIAL PRIMARY KEY,
    adminName VARCHAR(255),
    adminPassword VARCHAR(255)
);

INSERT INTO admin(adminName, adminPassword) VALUES('admin', '$2y$08$1xF9RqBI6tagfIw0lJz4jOy6niPALgcV2m4KpHdrbvE3JrzZtbuNW');

CREATE TABLE candidate(
    candidate_id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    candidatePassword VARCHAR(255),
    candidateName VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(10),
    areaOfInterest VARCHAR(255),
    currentStatus VARCHAR(255),
    submissionDate TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT(NOW())
);

CREATE TABLE resume(
    resume_id SERIAL PRIMARY KEY,
    candidate_id INT,
    filename VARCHAR(255),
    mimetype VARCHAR(255),
    data text,
    FOREIGN KEY (candidate_id) REFERENCES candidate(candidate_id)
);

