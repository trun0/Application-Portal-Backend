dotenv.config();
import dotenv from "dotenv";
import pool from "./db.js";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
    },
});

const sendEmail = async (
    candidateName,
    candidateEmail,
    emailSubject,
    emailText
) => {
    let mailOptions = {
        from: process.env.MAIL_USERNAME,
        to: candidateEmail,
        subject: emailSubject,
        text: `Dear ${candidateName},\n${emailText}`,
    };
    transporter.sendMail(mailOptions, function (err, data) {
        if (err) {
            console.log("Error " + err);
        } else {
            console.log(`Email sent successfully: ${emailSubject}`);
        }
    });
};

const adminLogin = async (req, res) => {
    try {
        //console.log(req.body);
        const { userName, password } = req.body;
        const findAdmin = await pool.query(
            "SELECT * FROM admin WHERE adminName = $1",
            [userName]
        );
        if (findAdmin.rows.length !== 0) {
            bcrypt
                .compare(password, findAdmin.rows[0].adminpassword)
                .then((result) => {
                    if (result) res.send({ status: true });
                    else
                        res.send({
                            status: false,
                            message: "Wrong credentials. Please try again",
                        });
                });
        } else
            res.send({
                status: false,
                message: "Wrong credentials. Please try again",
            });
    } catch (err) {
        console.error(err.message);
        res.send({ status: false, message: "Error occured", error: err });
    }
};

const userSignup = async (req, res) => {
    try {
        const { userName, userPassword } = req.body;

        const findCandidate = await pool.query(
            "SELECT * FROM candidate WHERE username = $1",
            [userName]
        );
        if (findCandidate.rows.length === 0) {
            bcrypt.hash(userPassword, 8, async function (err, hash) {
                if (err) {
                    console.log(err);
                    return res.send({
                        status: false,
                        message: "Some error occurred!!!",
                    });
                } else {
                    const newCandidate = await pool.query(
                        "INSERT INTO candidate (username, candidatePassword, currentStatus) VALUES ($1, $2, $3) RETURNING *",
                        [userName, hash, "Not sent"]
                    );
                    res.send({
                        status: true,
                        message: "Signup Successfull",
                        id: newCandidate.rows[0].candidate_id,
                    });
                }
            });
        } else {
            res.send({
                status: false,
                message:
                    "User already exists. Please try again with different username",
            });
        }
    } catch (err) {
        console.error(err.message);
        res.send({ status: false, message: "Error occured", error: err });
    }
};

const userLogin = async (req, res) => {
    try {
        const { userName, password } = req.body;
        const findCandidate = await pool.query(
            "SELECT * FROM candidate WHERE username = $1",
            [userName]
        );
        if (findCandidate.rows.length !== 0) {
            bcrypt
                .compare(password, findCandidate.rows[0].candidatepassword)
                .then((result) => {
                    if (result)
                        res.send({
                            status: true,
                            id: findCandidate.rows[0].candidate_id,
                        });
                    else
                        res.send({
                            status: false,
                            message: "Wrong credentials. Please try again",
                        });
                });
        } else
            res.send({
                status: false,
                message: "Wrong credentials. Please try again",
            });
    } catch (err) {
        console.error(err.message);
        res.send({ status: false, message: "Error occured", error: err });
    }
};

const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const candidate = await pool.query(
            "SELECT candidate.candidateName, candidate.email, candidate.phone, candidate.areaOfInterest, candidate.currentStatus, resume.filename, resume.data FROM candidate INNER JOIN resume ON candidate.candidate_id = resume.candidate_id WHERE candidate.candidate_id = $1",
            [id]
        );
        if (candidate.rowCount !== 0)
            res.send({
                status: true,
                message: "Candidate found",
                candidate: candidate.rows[0],
            });
        else res.send({ status: false, message: "No candidate found" });
    } catch (err) {
        console.error(err.message);
        res.send({ status: false, message: "Error occured", error: err });
    }
};

const updateUserResume = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.body.dontAcceptFile)
            return res.send({
                success: false,
                message: "Only pdf format allowed!",
            });
        // console.log(req.file);
        const { originalname, mimetype, buffer } = req.file;
        const base64Pdf = Buffer.from(buffer).toString("base64");
        const candidate = await pool.query(
            "SELECT candidate.candidateName, candidate.email FROM candidate WHERE candidate.candidate_id = $1",
            [id]
        );
        const updateResume = await pool.query(
            "UPDATE resume SET filename = $1, mimetype = $2, data = $3 WHERE candidate_id = $4 RETURNING *",
            [id+"_"+originalname, mimetype, base64Pdf, id]
        );
        if (updateResume.rowCount !== 0 || candidate.rowCount !== 0) {
            const emailSubject = "Application Updated";
            const emailText =
                "\nWe wanted to let you know that we have received an updated version of your application at FoxStore. We appreciate your efforts to improve and enhance your application, and we will be sure to review it thoroughly.\nPlease keep in mind that our review process may take some time, but we will be in touch with you as soon as we have made a decision. Thank you for your patience and for considering FoxStore as a potential employer.\nIf you have any questions or concerns, please do not hesitate to reach out.\n\nSIncerely,\nFoxStore";
            sendEmail(
                candidate.rows[0].candidatename,
                candidate.rows[0].email,
                emailSubject,
                emailText
            );
            res.send({ status: true, message: "Candidate application updated" });
        } else res.send({ status: false, message: "Nothing updated" });
    } catch (error) {
        console.error(err.message);
        res.send({ status: false, message: "Error occured", error: err });
    }
};

const addUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.body.dontAcceptFile)
            return res.send({
                success: false,
                message: "Only pdf format allowed!",
            });
        // console.log(req.file);
        const { originalname, mimetype, buffer } = req.file;
        //const pdfResume = Buffer.from(buffer).toString('binary');
        const base64Pdf = Buffer.from(buffer).toString("base64");
        const { candidateName, email, phone, areaOfInterest, currentStatus } =
            req.body;

        const addResume = await pool.query(
            "INSERT INTO resume (filename, mimetype, data, candidate_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [id+"_"+originalname, mimetype, base64Pdf, id]
        );

        const addCandidate = await pool.query(
            "UPDATE candidate SET candidateName = $1, email = $2, phone = $3, areaOfInterest = $4, currentStatus = $5 WHERE candidate_id = $6 RETURNING *",
            [candidateName, email, phone, areaOfInterest, currentStatus, id]
        );
        //console.log(updateCandidate.rowCount);
        if (addCandidate.rowCount !== 0 && addResume.rowCount !== 0) {
            const emailText =
                "\nThank you for submitting your application to FoxStore. We have received your application and are excited to review your qualifications and experience.\nWe appreciate your interest in our company and look forward to considering you as a potential candidate for the open position.\nWe will be in touch with you shortly to discuss the next steps in the recruitment process. In the meantime, if you have any additional questions, please do not hesitate to reach out.\n\nSincerely,\nFoxStore";
            const emailSubject = "Application Received";
            sendEmail(candidateName, email, emailSubject, emailText);
            res.send({ status: true, message: "Candidate details updated" });
        } else res.send({ status: false, message: "Nothing updated" });
    } catch (err) {
        console.error(err.message);
        res.send({ status: false, message: "Error occured", error: err });
    }
};

const getApplications = async (req, res) => {
    try {
        //console.log(req.body);
        const { cas } = req.params;
        const candidateList = await pool.query(
            "SELECT candidate.candidate_id, candidate.candidateName, candidate.email, candidate.phone, candidate.areaOfInterest, resume.filename, resume.data FROM candidate INNER JOIN resume ON candidate.candidate_id = resume.candidate_id WHERE candidate.currentStatus = $1 ORDER BY candidate.submissionDate DESC",
            [cas]
        );
        //console.log(candidateList);
        let message = " No candidates found";
        let list = [];
        if (candidateList.rowCount !== 0) {
            message = "Candidates found";
            list = candidateList.rows;
        }
        res.send({
            status: true,
            message: message,
            list: list
        });
    } catch (err) {
        console.error(err.message);
        res.send({ status: false, message: "Error occured", error: err });
    }
};

const updateApplicationStatus = async (req, res) => {
    try {
        //console.log(req.body);
        const { id } = req.params;
        const { currentStatus } = req.body;
        const candidate = await pool.query(
            "SELECT candidate.candidateName, candidate.email FROM candidate WHERE candidate.candidate_id = $1",
            [id]
        );
        const updateCandidate = await pool.query(
            "UPDATE candidate SET currentStatus = $1 WHERE candidate_id = $2 RETURNING *",
            [currentStatus, id]
        );
        //console.log(candidate);
        if (updateCandidate.rowCount !== 0 || candidate.rowCount !== 0) {
            let date = new Date();
            date.setDate(date.getDate() + 15);
            const emailSubject = "Application Status";
            const emailText =
                currentStatus === "approved"
                    ? `\nWe are pleased to inform you that you have been selected by FoxStore. We were impressed by your qualifications and believe you will be a valuable asset to our team.\nPlease let us know if you accept this offer by ${date.toDateString()}. We look forward to welcoming you to the team and beginning this exciting new chapter in your career.\n\nBest regards\nFoxStore`
                    : "\nThank you for applying to FoxStore and for the opportunity to consider you as a candidate for our open position.\nAfter careful review of your application and a thorough evaluation of your skills and qualifications, we have decided to move forward with other candidates who are a better fit for the role.\nWe appreciate your interest in our company and encourage you to continue to keep an eye on our job openings in the future. We wish you the best of luck in your job search.\n\nSincerely,\nFoxStore";
            sendEmail(
                candidate.rows[0].candidatename,
                candidate.rows[0].email,
                emailSubject,
                emailText
            );
            res.send({ status: true, message: "Candidate status updated" });
        } else res.send({ status: false, message: "Nothing updated" });
    } catch (err) {
        console.error(err.message);
        res.send({ status: false, message: "Nothing updated" });
    }
};

export {
    adminLogin,
    userSignup,
    userLogin,
    getUser,
    addUser,
    updateUserResume,
    getApplications,
    updateApplicationStatus,
};
