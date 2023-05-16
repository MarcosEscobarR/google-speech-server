"use strict";

const path = require("path");
const fs = require("fs");

const certs =
  process.env.CERTS_DIRECTORY || path.join(__dirname, "./", "certs");
/* eslint-disable security/detect-non-literal-fs-filename */
const privateKey = fs.readFileSync(path.join(certs, "private.pem"));
const publicKey = fs.readFileSync(path.join(certs, "public.pem"));
/* eslint-enable security/detect-non-literal-fs-filename */

if (privateKey && !process.env.JWT_PRIVATE_KEY) {
  process.env.JWT_PRIVATE_KEY = privateKey.toString();
}

if (publicKey && !process.env.JWT_PUBLIC_KEY) {
  process.env.JWT_PUBLIC_KEY = publicKey.toString();
}

module.exports = {
  jwt: {
    private: process.env.JWT_PRIVATE_KEY || privateKey,
    public: process.env.JWT_PUBLIC_KEY || publicKey,
    audience: process.env.JWT_AUDIENCE,
    issuer: process.env.JWT_ISSUER,
    expire: process.env.JWT_EXPIRE || "1 day",
    algorithm: process.env.JWT_ALGORITHM || "ES512",
  },
};
