class IpfsTask {
  #db;
  #app;
  constructor() {
    this.initialize();
    this.initializeDB();
  }

  initialize() {
    this.#app = require("./ipfs-server");
    this.#app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  }

  /**
   * Initialize the database
   */
  async initializeDB() {
    if (this.#db) return;
    this.#db = Datastore.create("./localKOIIDB.db");
  }

  /**
   * Get the database
   * @returns {Datastore} The database
   */
  async getDb() {
    if (this.#db) return this.#db;
    await this.initializeDB();
    return this.#db;
  }
  
  /**
   * Get a value from the database
   * @param {string} key // Path to get
   */
  async storeGet(key) {
    try {
      await this.initializeDB();
      const resp = await this.#db.findOne({ key: key });
      if (resp) {
        return resp[key];
      } else {
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  /**
   * Store a value in the database
   * @param {string} key Path to set
   * @param {*} value Data to set
   */
  async storeSet(key, value) {
    try {
      await this.initializeDB();
      await this.#db.update(
        { key: key },
        { [key]: value, key },
        { upsert: true }
      );
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  async task() {
    try{
      const ipfsResponse = await axios.post(`${baseIpfsApiUrl}/api/v0/pin/ls`);
      const data = ipfsResponse.data;
      const cids = Object.keys(data.Keys);
      const submission = {
        cids,
        proofs: [],
      };
      await this.storeSet('value', submission);
      return submission;
    } catch (err) {
      console.log('ERROR IN EXECUTING TASK', err);
      return 'ERROR IN EXECUTING TASK' + err;
    }
  }

  async fetchSubmission() {
    try{
      const submission = await this.storeGet('value');
      return submission;
    } catch (err) {
      console.log('ERROR IN FETCHING SUBMISSION', err);
      return 'ERROR IN FETCHING SUBMISSION' + err;
    }
  }
}

module.exports = IpfsTask;
