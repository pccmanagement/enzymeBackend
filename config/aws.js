// config/aws.js
const AWS =  require('@aws-sdk/client-s3')

const s3Client = new AWS.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

module.exports = s3Client;
