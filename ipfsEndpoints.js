// import { create } from 'kubo-rpc-client'
// let client;
const {default: axios} = require('axios');
const fs = require('fs');
const fetch = require('node-fetch');
const {Readable} = require('stream');
const FormData = require('form-data');

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
      console.log(files);
      if (!files || files.length === 0) {
        return res.status(400).send({status: 400, message: 'No files were uploaded'});
      }

      const formData = new FormData();

      files.forEach((file, index) => {
        console.log(file.buffer);
        formData.append(`path/files/${file.originalname}`, file.buffer, 
        
        {
          filename: `path/files/${file.originalname}`,
          path: `path/files/${file.originalname}`
          // contentType: file.mimetype,
        }
        
        );
      });

    
      // console.log(formData)
      const ipfsResponse = await axios.post('http://127.0.0.1:5001/api/v0/add', formData);

      res.send(ipfsResponse.data);
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
