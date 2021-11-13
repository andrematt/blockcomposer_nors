let node = "http://127.0.0.1:20000/";
let php = "http://127.0.0.1:8000/";
let nodeRed = "http://127.0.0.1:1880/"

//const triggers_url = "https://giove.isti.cnr.it/demo/pat/nors/data/triggers/IT.json";
//const actions_url = "https://giove.isti.cnr.it/demo/pat/nors/data/actions/it.json";
const db_access_url ="https://giove.isti.cnr.it/demo/pat/nors/dbaccess/db_access.php";

// URL for testing in localhost
const triggers_url = "http://127.0.0.1:20000/triggers";
const actions_url = "http://127.0.0.1:20000/actions";


const GLOBALS  = {
  triggers : triggers_url,
  actions : actions_url,
  db_access_url: db_access_url,
  appname: "pat",
  gapi: {},
  nodeUrl: node,
  nodeRedUrl: nodeRed,
};

export default GLOBALS;
