const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 5000;

let metadata; // Declare metadata outside of the endpoint

// Use the cors middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
  ],
  methods: 'GET',
}));

// API endpoint to get the list of tags
app.get('/api/tags', async (req, res) => {
  try {
    const metadataPath = path.join('F:', 'data', 'pictures', 'metadata.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    metadata = JSON.parse(metadataContent); // Assign metadata globally

    const tags = Object.keys(metadata.tags || {});
    res.json(tags);
  } catch (error) {
    console.error('Error reading metadata:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Define a function to handle file types for a specific category
const getFileListForCategory = async (folderPath, fileExtensions) => {
  try {
    const files = await fs.readdir(folderPath);

    const filteredFiles = files.filter(file => {
      const regex = new RegExp(`\\.(${fileExtensions.join('|')})$`, 'i');
      return regex.test(file);
    });

    return filteredFiles.map(file => ({
      title: file,
      date: new Date().toISOString(),
      file_source: `/api/pictures/${file}`, // Updated endpoint path
    }));
  } catch (error) {
    console.error('Error reading directory:', error);
    throw new Error('Internal Server Error');
  }
};

// API endpoint to get the list of images with optional tags query parameter
app.get('/api/pictures-list', async (req, res) => {
  try {
    const imagesPath = path.join('F:', 'data', 'pictures');
    const tags = req.query.tags ? JSON.parse(req.query.tags) : [];

    // Ensure metadata is initialized
    if (!metadata) {
      const metadataPath = path.join('F:', 'data', 'pictures', 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    }

    // Fetch all image files
    const allImageFiles = await getFileListForCategory(imagesPath, ['png', 'jpg', 'jpeg']);

    // Filter images based on tags
    const filteredImageFiles = tags.length > 1
      ? allImageFiles.filter(image => {
          const imageTags = metadata.items[image.title]?.tags || [];
          return tags.every(tag => imageTags.includes(tag));
        })
      : tags.length === 1
      ? allImageFiles.filter(image => {
          const imageTags = metadata.items[image.title]?.tags || [];
          return imageTags.includes(tags[0]);
        })
      : allImageFiles;

    res.json(filteredImageFiles);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.use('/api/pictures', express.static(path.join('F:', 'data', 'pictures'))); // Updated static file path

// API endpoint to get the list of videos
app.get('/api/videos-list', async (req, res) => {
  try {
    const videosPath = path.join('F:', 'data', 'videos');
    const videoFiles = await getFileListForCategory(videosPath, ['mp4', 'webm']);
    res.json(videoFiles);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve static files for videos
app.use('/api/videos', express.static(path.join('F:', 'data', 'videos')));

// Add similar static file serving for documents and audio if needed

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});