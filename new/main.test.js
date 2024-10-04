const Joi = require('joi');
const axios = require('axios');
const IpfsTask = require('./ipfs-task');
let ipfsTask;
beforeAll(async () => {
  ipfsTask = new IpfsTask();
  ipfsTask.initialize();
});


describe('Performing the task', () => {
  it('should performs the core logic task', async () => {
    const result = await ipfsTask.task();
    console.log(result);
  });

  it('should fetch the submission', async () => {
    const result = await ipfsTask.fetchSubmission();
    console.log(result);
  });
});
