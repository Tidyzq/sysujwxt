var error = {
    success: {},
    serverError: {},
    httpError: {},
    wrongPassword: {},
    wrongCheckCode: {},
    needCookie: {},
    needLogin: {},
    electFail: {}
}

function Error (code, addon) {
    this.code = code;
    if (addon != undefined) {
        this.addon = addon;
    } 
}

Error.message = [];

var code = 0;
for (var item in error) {
    if (error.hasOwnProperty(item)) {
        Error.message[code] = item.replace(/([A-Z])/g, ' $1').toLowerCase();
        Error[item] = new Error(code++);
    }
}

module.exports = Error;
