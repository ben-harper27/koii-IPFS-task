class IpfsTask {
  constructor() {
    this.initialize();
  }

  initialize() {
    this.app = require('./ipfs-server');
  }

  async task() {
    // TODO: Implement the task logic
    return {
      cids: [],
      proofs: []
    };
  }
  
  async fetchSubmission() {
    // TODO: Implement the fetch submission logic
    return {
      cids: [],
      proofs: []
    };
  }
}

module.exports = IpfsTask;
