const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = process.env.PORT || 3000;

const baseIpfsApiUrl = 'http://127.0.0.1:5001';
const baseIpfsGatewayUrl = 'http://127.0.0.1:8080';

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

app.get('/health', (req, res) => {
  res.status(200).send({ status: 200, message: 'OK' });
});

app.get('/ipfs/:cid/:filename?', async (req, res) => {
  try {
    const { cid, filename } = req.params;
    const response = await axios(`${baseIpfsGatewayUrl}/ipfs/${cid}/${filename || ''}`, {
      responseType: 'stream',
      timeout: 180000,
    });
    res.set('Content-Type', response.headers['content-type']);
    response.data.pipe(res);

    // Pin the file
    axios.post(`${baseIpfsApiUrl}/api/v0/pin/add?arg=${cid}`)
      .then((response) => {
        console.log('Pin added successfully:', response.data);
      })
      .catch((error) => {
        console.error('Error adding pin:', error);
      });
  } catch (error) {
    handleError(error, res);
  }
});

app.post('/ipfs/add', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).send('No files were uploaded');
    }

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file-${index}`, file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    const ipfsResponse = await axios.post(
      `${baseIpfsApiUrl}/api/v0/add?wrap-with-directory=true&cid-version=1`,
      formData,
      { headers: formData.getHeaders() }
    );

    const parsedResp = ipfsResponse.data
      .split('\n')
      .filter(e => e !== '')
      .map(e => JSON.parse(e));
    const folderHash = parsedResp.find(e => e.Name === '');

    res.send({ status: 200, cid: folderHash?.Hash });
  } catch (error) {
    handleError(error, res);
  }
});

app.get('/ipfs/get-pinned-cids', async (req, res) => {
  try {
    const response = await axios.post(`${baseIpfsApiUrl}/api/v0/pin/ls`);
    res.json(response.data);
  } catch (error) {
    handleError(error, res);
  }
});

function handleError(error, res) {
  console.error('Error:', error);
  if (error.code === 'ECONNABORTED') {
    res.status(504).send('Request Timed Out');
  } else if (error?.response?.status === 404) {
    res.status(404).send('Not found');
  } else {
    res.status(500).send('Internal Server Error');
  }
}

app.listen(port, () => {
  console.log(`IPFS server listening at http://localhost:${port}`);
});

module.exports = app;
