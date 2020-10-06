
const triggers_url = "http://127.0.0.1:20000/triggers";
const actions_url = "http://127.0.0.1:20000/actions";
//const db_access_url = "http://127.0.0.1/blockComposer_dbaccess/db_access.php";  //XAMPP
const db_access_url = "http://127.0.0.1:8000/db_access.php";  //direct PHP server
const nodeUrl = "http://localhost:1880/";

//const triggers_url = "https://giove.isti.cnr.it/demo/pat/pat-node-server/triggers.json";
//const actions_url = "https://giove.isti.cnr.it/demo/pat/pat-node-server/actions.json";
//const db_access_url ="https://giove.isti.cnr.it/demo/pat/pat-sqlite-server/db_access.php";




const GLOBALS  = {
  triggers : triggers_url,
  actions : actions_url,
  db_access_url: db_access_url,
  appname: "pat",
  nodeUrl: nodeUrl
};

export default GLOBALS;
