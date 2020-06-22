
let triggers_url = "http://127.0.0.1:20000/triggers";
let actions_url = "http://127.0.0.1:20000/actions";
//let db_access_url = "http://localhost:8000/pat-sqlite-server/db_access.php";


//let triggers_url = "https://giove.isti.cnr.it/demo/pat/pat-node-server/triggers.json";
//let actions_url = "https://giove.isti.cnr.it/demo/pat/pat-node-server/actions.json";
let db_access_url ="https://giove.isti.cnr.it/demo/pat/pat-sqlite-server/db_access.php";

//let db_access_url = "http://localhost:80/tarbe_db/db_access.php";
//let db_access_url = "http://localhost:80/tarbe_sqlite_server/db_access.php";
//let db_access_url = "http://localhost:20000/";
let nodeUrl = "http://localhost:1880/";


const GLOBALS  = {
  triggers : triggers_url,
  actions : actions_url,
  db_access_url: db_access_url,
  appname: "pat",
  nodeUrl: nodeUrl
};

export default GLOBALS;
