require('dotenv').config();
const express = require('express')
require('express-async-errors');
const multer = require('multer')
const port = process.env.PORT || 3000;

const app = express()

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
const upload = multer({ storage: storage })

const cloudinary = require("cloudinary").v2;
const bodyParser = require('body-parser');
const fs = require('fs')

// body parser configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(express.static(__dirname + '/public'));
app.use('/uploads', express.static('uploads'));

// cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
})
console.log(process.env.CLOUD_NAME);
console.log(process.env.CLOUD_API_KEY);
console.log(process.env.CLOUD_API_SECRET);

async function uploadToCloudinary(locaFilePath) {
  // locaFilePath :
  // path of image which was just uploaded to "uploads" folder

  const mainFolderName = "main"
  // filePathOnCloudinary :
  // path of image we want when it is uploded to cloudinary
  const filePathOnCloudinary = mainFolderName + "/" + locaFilePath

  return cloudinary.uploader.upload(locaFilePath, { "public_id": filePathOnCloudinary })
    .then((result) => {
      console.log('Result = ', result);
      // Image has been successfully uploaded on cloudinary
      // So we dont need local image file anymore
      // Remove file from local uploads folder 
      fs.unlinkSync(locaFilePath)

      return {
        message: "Success",
        url: result.url
      };
    }).catch((error) => {
      // Remove file from local uploads folder 
      fs.unlinkSync(locaFilePath)
      console.log(error);
      return { message: "Fail", };
    });
}

function buildSuccessMsg(urlList) {
  // Building success msg
  let response = '<h1><a href="/">Click to go to Home page</a><br></h1><hr>'

  for (let i = 0; i < urlList.length; i++) {
    response += "File uploaded successfully.<br><br>"
    response += `FILE URL: <a href="${urlList[i]}">${urlList[i]}</a>.<br><br>`
    response += `<img src="${urlList[i]}" /><br><hr>`
  }

  response += `<br><p>Now you can store this url in database or do anything with it  based on use case.</p>`
  return response
}

app.post('/profile-upload-single', upload.single('profile-file'), async (req, res, next) => {
  // req.file is the `profile-file` file
  // req.body will hold the text fields, if there were any
  const locaFilePath = req.file.path
  console.log(locaFilePath);
  const result = await uploadToCloudinary(locaFilePath)
  console.log('Result = ', result);
  const response = buildSuccessMsg([result.url])

  return res.send(response)
})

app.post('/profile-upload-multiple', upload.array('profile-files', 12), async (req, res, next) => {
  // req.files is array of `profile-files` files
  // req.body will contain the text fields, if there were any
  let imageUrlList = []

  for (let i = 0; i < req.files.length; i++) {
    let locaFilePath = req.files[i].path
    const result = await uploadToCloudinary(locaFilePath)
    imageUrlList.push(result.url)
  }
  const response = buildSuccessMsg(imageUrlList)

  return res.send(response)
})


app.listen(port, () => console.log(`Server running on port ${port}!\nClick http://localhost:${port}/`))
