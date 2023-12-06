const {default: axios} = require('axios');
const FormData = require('form-data');
// const multiformats = require('multiformats');
// const base58btc = require('base58btc'); // npm install base58btc
module.exports = {
  getIPFSCID: async (req, res) => {
    try {
      const {cid, filename} = req.params;
      const response = await axios(`http://127.0.0.1:8080/ipfs/${cid}/${filename || ''}`, {
        responseType: 'stream',
        timeout: 180000,
      });
      res.set('Content-Type', response.headers['content-type']);

      // Pipe the response stream directly to res.send
      response.data.pipe(res);
    } catch (error) {
      console.error(error);
      if (error.code === 'ECONNABORTED') {
        // Timeout error
        res.status(504).send('Request Timed Out');
      } else {
        res.status(500).send('Internal Server Error');
      }
    }
  },
  addIPFSCID: async (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).send({status: 400, message: 'No files were uploaded'});
      }

      const formData = new FormData();

      files.forEach((file, index) => {
        formData.append(`${file.originalname}-${index}`, file.buffer, {
          filename: `${file.originalname}`,
          path: `${file.originalname}`,
          contentType: file.mimetype,
        });
      });
      const ipfsResponse = await axios.post(
        'http://127.0.0.1:5001/api/v0/add?wrap-with-directory=true&cid-version=1',
        formData
      );
      const parsedResp = ipfsResponse.data
        .split('\n')
        .filter((e) => e != '')
        .map((e) => JSON.parse(e));
      const folderHash = parsedResp.find((e) => e.Name == '');
      console.log('folderHash?.Hash', folderHash);
      res.send({status: 200, cid: folderHash?.Hash});
    } catch (error) {
      console.error(error);
      if (error.code === 'ECONNABORTED') {
        // Timeout error
        res.status(504).send('Request Timed Out');
      } else {
        res.status(500).send('Internal Server Error');
      }
    }
  },
};
