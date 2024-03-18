const {coreLogic} = require('./coreLogic');
const {namespaceWrapper, taskNodeAdministered, app} = require('./_koiiNode/koiiNode');
const os = require('os');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const {exec} = require('child_process');
const ipfsEndpoints = require('./ipfsEndpoints');
const multer = require('multer'); // For handling file uploads

const downloadFile = async (url, dest) => {
  const response = await axios.get(url, {responseType: 'stream'});
  const writer = fs.createWriteStream(dest);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};
const getPlatformExt = () => {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'darwin') {
    if (arch === 'x64') {
      return 'darwin-amd64';
    } else if (arch === 'arm64') {
      return 'darwin-arm64';
    }
  } else if (platform === 'linux') {
    return 'linux-amd64';
  } else if (platform === 'win32') {
    return 'windows-amd64';
  }

  return null;
};

const setExecutablePermission = (filePath) => {
  fs.chmodSync(filePath, '755'); // Add execute permission for owner
};

const initIPFS = (filePath) => {
  const command = `${filePath} init`;
  console.log('Running ', command);
  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        // Podman is not installed or an error occurred
        if (error.message.includes('ipfs configuration file already exists')) resolve(true);
        else {
          console.error(error);
          reject(error);
        }
      } else {
        // Podman is installed and the command executed successfully
        resolve(true);
      }
    });
  });
};

const startIPFSDaemon = (filePath) => {
  const command = `${filePath} daemon`;
  console.log('Running ', command);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Resolving after 10sec because he command won't exit
      resolve(true);
    }, 10000); // 10000 milliseconds = 10 seconds
    exec(command, (error) => {
      if (error) {
        // Podman is not installed or an error occurred
        console.error(error);
        reject(error);
      } else {
        // Podman is installed and the command executed successfully
        resolve(true);
      }
    });
  });
};

const downloadFileIfNeeded = async (url, destination, currentPlatform) => {
  const platformExt = getPlatformExt();

  if (!platformExt) {
    console.error('Unsupported platform');
    return;
  }

  const fileName = `${currentPlatform}_ipfs`; // Adjust the version and filename accordingly

  let filePath;
  if (taskNodeAdministered) {
    filePath = path.join(destination, fileName);
  } else {
    filePath = `${destination}${fileName}`;
  }
  if (fs.existsSync(filePath)) {
    console.log('File already exists, skipping download.');
    return filePath;
  }

  console.log('Downloading file...');
  await downloadFile(url, filePath);
  setExecutablePermission(filePath); // Set executable permission after download
  console.log('File downloaded successfully.');
  await initIPFS(filePath);
  return filePath;
};

async function downloadKuboWrapper() {
  const currentPlatform = getPlatformExt();
  // const url = `https://dist.ipfs.tech/kubo/v0.24.0/kubo_v0.24.0_${currentPlatform}.tar.gz`;
  const url = `https://github.com/SyedGhazanferAnwar/kubo-binaries/releases/download/v0.24.0/${currentPlatform}_ipfs`;

  const downloadPath = await namespaceWrapper.getBasePath();
  console.log('STARTING DOWNLOADING KUBO:', url);
  const filePath = await downloadFileIfNeeded(url, downloadPath, currentPlatform);
  await startIPFSDaemon(filePath);
  console.log('IPFS daemon running!');
}
// downloadKuboWrapper();
async function setup() {
  console.log('setup function called');
  // Run default setup
  await namespaceWrapper.defaultTaskSetup();
  process.on('message', (m) => {
    try {
      console.log('CHILD got message:', m);
      if (m.functionCall == 'submitPayload') {
        console.log('submitPayload called');
        coreLogic.submitTask(m.roundNumber);
      } else if (m.functionCall == 'auditPayload') {
        console.log('auditPayload called');
        coreLogic.auditTask(m.roundNumber);
      } else if (m.functionCall == 'executeTask') {
        console.log('executeTask called');
        coreLogic.task();
      } else if (m.functionCall == 'generateAndSubmitDistributionList') {
        console.log('generateAndSubmitDistributionList called');
        coreLogic.submitDistributionList(m.roundNumber);
      } else if (m.functionCall == 'distributionListAudit') {
        console.log('distributionListAudit called');
        coreLogic.auditDistribution(m.roundNumber);
      }
    } catch (e) {
      console.error(e);
    }
  });
  await downloadKuboWrapper();

  /* GUIDE TO CALLS K2 FUNCTIONS MANUALLY

  If you wish to do the development by avoiding the timers then you can do the intended calls to K2 
  directly using these function calls. 

  To disable timers please set the TIMERS flag in task-node ENV to disable

  NOTE : K2 will still have the windows to accept the submission value, audit, so you are expected
  to make calls in the intended slots of your round time. 

  */

  // Get the task state
  //console.log(await namespaceWrapper.getTaskState());

  //GET ROUND

  // const round = await namespaceWrapper.getRound();
  // console.log("ROUND", round);

  // Call to do the work for the task

  //await coreLogic.task();

  // Submission to K2 (Preferablly you should submit the cid received from IPFS)

  //await coreLogic.submitTask(round - 1);

  // Audit submissions

  //await coreLogic.auditTask(round - 1);

  // upload distribution list to K2

  //await coreLogic.submitDistributionList(round - 2)

  // Audit distribution list

  //await coreLogic.auditDistribution(round - 2);

  // Payout trigger

  // const responsePayout = await namespaceWrapper.payoutTrigger();
  // console.log("RESPONSE TRIGGER", responsePayout);
}

if (taskNodeAdministered) {
  setup();
}
if (app) {
  const storage = multer.memoryStorage();
  const upload = multer({storage: storage});
  //  Write your Express Endpoints here.
  //  For Example
  //  app.post('/accept-cid', async (req, res) => {})

  // Sample API that return your task state

  app.get('/taskState', async (req, res) => {
    const state = await namespaceWrapper.getTaskState();
    console.log('TASK STATE', state);

    res.status(200).json({taskState: state});
  });

  app.get('/ipfs/:cid/:filename?', ipfsEndpoints.getIPFSCID);
  app.post('/ipfs/add', upload.array('files'), ipfsEndpoints.addIPFSCID);
}
