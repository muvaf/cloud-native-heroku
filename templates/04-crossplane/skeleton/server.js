const {Storage} = require('@google-cloud/storage');
var fs = require('fs');
var os = require('os');
var uuid = require('uuid');


const bucketName = process.env.BUCKET_NAME;
// Assumes GOOGLE_APPLICATION_CREDENTIALS env var is available.
const storage = new Storage();

async function run() {
  const start = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes
  while (start + timeout > Date.now()) {
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
    console.log("Waiting for 30 seconds...")
    await new Promise(resolve => setTimeout(resolve, 30 * 1000));
  }
}
run().catch(console.error);