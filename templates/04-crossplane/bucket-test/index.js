const {Storage} = require('@google-cloud/storage');
var fs = require('fs');
var os = require('os');
var uuid = require('uuid');


const bucketName = process.env.BUCKET_NAME;
// Assumes GOOGLE_APPLICATION_CREDENTIALS env var is available.
const storage = new Storage();

async function run() {
  // Write to disk.
  const filePath = `${os.tmpdir()}/${uuid.v4()}`
  fs.writeFile(filePath, "mydata", function (err) {
    console.log(`${filePath} is written.`);
  })
  // Upload.
  await storage.bucket(bucketName).upload(filePath);
  console.log(`${filePath} uploaded to ${bucketName}`);
  // List.
  const [files] = await storage.bucket(bucketName).getFiles();
  console.log('Files:');
  files.forEach(file => {
    console.log(file.name);
  });
}

run().catch(console.error);