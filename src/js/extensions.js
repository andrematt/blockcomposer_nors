import { getWorkspace } from "./main.js";

  /**
   * Obbliga il workspace a ricaricare i pezzi presenti creando un blocco
   * dummy e eliminandolo subito dopo. 
   */
  export function forceWorkspaceReload(){
    
    let myWorkspace = getWorkspace();
    var newBlock = myWorkspace.newBlock('dummy_block');
    newBlock.initSvg();
    newBlock.render();
    newBlock.dispose();
  }

   /**
   * Obbliga il workspace a creare il pezzo passato come arg ed a eliminarlo
   * subito dopo. Serve perchè i pezzi dinamici non vengono inizializzati se non
   * vengono prima caricati nel ws, quindi quando carichiamo una regola dal db e
   * non è ancora stata aperta la toolbox da typeError  
    * @param {*} block 
    */
  export function createAndDispose(block){
    console.log(block);
    let myWorkspace = getWorkspace();
    var newBlock = myWorkspace.newBlock(block);
    newBlock.initSvg();
    newBlock.render();
    newBlock.dispose();
  }
