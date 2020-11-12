export const dimensionIdTranslator = (id) => {
    switch (id) {
        case 1: return 'entrance';
        default: return 'default';
    }
}


export const createTimestamp = () => {
    let ts = new Date();
    let gg = ts.getDate();
    let mm = ts.getMonth();
    let aaaa = ts.getFullYear();
    let hh = ts.getHours();
    let min = ts.getMinutes();
    let ss = ts.getSeconds();
    let millisec = ts.getMilliseconds();
    return gg + "-" + mm + "-" + aaaa + "-" + hh + "-" + min + "-" + ss + "-" + millisec;
}