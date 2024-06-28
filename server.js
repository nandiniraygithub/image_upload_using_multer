const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const port = 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.static("public"));

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).array('files', 10); // Allow up to 10 files

function checkFileType(file, cb) {
  const fileTypes = /jpeg|jpg|png/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = fileTypes.test(file.mimetype);

  if (extname && mimeType) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// Route to serve the HTML form
app.get('/', async (req, res) => {
  try {
    const files = await fs.readdir("./public/uploads/");
    res.render("index", { images: files });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error reading uploads directory");
  }
});

// Route to handle image uploads
app.post("/upload", (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: "Multer error: " + err.message });
    } else if (err) {
      return res.status(400).json({ message: err });
    } else if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Please select an image to upload" });
    }
    res.status(200).json({ message: "Images uploaded successfully", savedImages: req.files.map(file => file.filename) });
  });
});

// Route to handle image deletion (PUT request)
app.put("/delete", async (req, res) => {
  try {
    const deleteImages = req.body.deleteImages;
    if (!deleteImages || deleteImages.length === 0) {
      return res.status(400).json({ message: "Please select an image to delete" });
    }
    await Promise.all(deleteImages.map(image => 
      fs.unlink(path.join(__dirname, "public/uploads", image))
    ));
    res.status(200).json({ message: "Images deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});