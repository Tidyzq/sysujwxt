var Error = require('./error');
var http = require('http');
var querystring = require('querystring');
var md5 = require('md5');

var jwxt = {
    loginInfo: null
}

function httpGet(path, headers, encoding) {
    encoding = encoding ? encoding : 'utf8';
    var options = {
        hostname: 'uems.sysu.edu.cn',
        path: path,
        headers: headers
    };
    return new Promise(function (resolve, reject) {
        http.get(options, function (res) {
            res.setEncoding(encoding);
            var body = [];
            res.on('data', function (chunk) {
                body.push(chunk);
            }).on('end', function () {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body.join()
                });
            });
        }).on('error', function (err) {
            reject(Error.httpError);
        });
    });
}

function httpPost(path, headers, data, encoding) {
    encoding = encoding ? encoding : 'utf8';
    var options = {
        hostname: 'uems.sysu.edu.cn',
        path: path,
        method: 'POST',
        headers: headers
    };
    return new Promise(function (resolve, reject) {
        var req = http.request(options, function (res) {
            res.setEncoding(encoding);
            var body = [];
            res.on('data', function (chunk) {
                body.push(chunk);
            }).on('end', function () {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body.join()
                });
            });
        }).on('error', function (err) {
            reject(Error.httpError);
        });
        req.write(data);
        req.end();
    });
}

function checkCookie () {
    return jwxt.loginInfo && jwxt.loginInfo.jsessionid && jwxt.loginInfo.rno ? Promise.resolve() : Promise.reject(Error.needCookie);
}

jwxt.getCookie = function() {

    function sendHttp () {
        var path = '/jwxt/',
            headers = {
                'Cache-Control': 'no-cache'
            };

        return httpGet(path, headers);
    }

    function solve (res) {
        try {
            if (res.statusCode == 200) {
                var cookie = res.headers['set-cookie'][0];
                var jsessionid = /JSESSIONID=([^;]*);/.exec(cookie)[1];
                var rno = /<input type="hidden" id="rno" name="rno" value=([\d.]+)><\/input>/.exec(res.body)[1];
                jwxt.loginInfo = {
                    "jsessionid": jsessionid,
                    "rno": rno
                };
                return Promise.resolve();
            } else {
                return Promise.reject(Error.serverError);
            }
        } catch (err) {
            return Promise.reject(Error.serverError);
        }
    }
    
    return sendHttp()
        .then(solve);
};

jwxt.getCheckCode = function() {

    function handleError (err) {
        if (Error.needCookie.code == err.code) {
            return jwxt.getCookie();
        } else {
            throw err;
        }
    }

    function sendHttp () {
        var path = '/jwxt/jcaptcha',
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid
            };

        return httpGet(path, headers, 'base64');
    }

    function solve (res) {
        if (res.statusCode == 200) {
            return Promise.resolve(res.body);
        } else {
            return Promise.reject(Error.serverError);
        }
    }

    return checkCookie()
        .catch(handleError)
        .then(sendHttp)
        .then(solve);
};

jwxt.login = function(username, password, checkcode) {

    function sendHttp () {
        var postData = querystring.stringify({
                'j_username': username,
                'j_password': md5(password).toUpperCase(),
                'rno': jwxt.loginInfo.rno,
                'jcaptcha_response': checkcode
            });
        var path = '/jwxt/j_unieap_security_check.do',
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid
            };

        return httpPost(path, headers, postData);
    }

    function solve (res) {
        if (res.statusCode == 302) { // 登陆成功
            return Promise.resolve();
        } else if (res.statusCode == 200) { // 登陆失败
            try {
                var info = /<span style="color:#D7E1EC">([^<]+)<\/span>/.exec(res.body)[1];
                return Promise.reject(info == '用户名不存在或密码错误！' ? Error.wrongPassword : Error.wrongCheckCode);
            } catch (err) {
                console.log(err);
                return Promise.reject(Error.serverError);
            }
        } else {
            return Promise.reject(Error.serverError);
        }
    }

    return checkCookie()
        .then(sendHttp)
        .then(solve);
};

jwxt.logout = function () {

    function sendHttp () {
        var path = '/jwxt/logout.jsp',
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid
            };

        return httpGet(path, headers);
    }

    function solve (res) {
        if (res.statusCode == 200) {
            if (/会话过期,请重新登录/.test(res.body)) { // 未登录
                return Promise.reject(Error.needLogin);
            } else { // 已登陆
                return Promise.resolve();
            }
        } else {
            return Promise.reject(Error.serverError);
        }
    }

    return checkCookie()
        .then(sendHttp)
        .then(solve);
};

jwxt.isLogin = function() {

    function sendHttp () {
        var path = '/jwxt/edp/index.jsp',
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid
            };

        return httpGet(path, headers);
    }

    function solve (res) {
        if (res.statusCode == 200) {
            if (/会话过期,请重新登录/.test(res.body)) { // 未登录
                return Promise.reject(Error.needLogin);
            } else { // 已登陆
                return Promise.resolve();
            }
        } else {
            return Promise.reject(Error.serverError);
        }
    }
    
    return checkCookie()
        .then(sendHttp)
        .then(solve);
};

jwxt.getTimeTable = function(year, term) {

    function sendHttp () {
        var postData = '{body:{parameters:{"args": ["' + term + '", "' + year + '"], "responseParam": "rs"}}}';
        var path = '/jwxt/KcbcxAction/KcbcxAction.action?method=getList',
            headers = {
                'render': 'unieap',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid,
            };

        return httpPost(path, headers, postData);
    }

    function solve (res) {
        try {
            if (res.statusCode != 200) throw Error.serverError;
            if (/会话过期,请重新登录/.test(res.body)) { // 未登录
                return Promise.reject(Error.needLogin);
            } else {
                var table = /\{rs:"(.+)"\}/.exec(res.body)[1];
                var findRow = /<td [^>]+>&nbsp;<\/td>|<td [^>]+ rowspan=\d [^>]+>([^<]|<br>)+<\/td>/g;
                var findCourse = /<td [^>]+ rowspan=(\d) [^>]+>([^<]+)<br>([^<]+)<br>([^<]+)<br>([^<]+)<\/td>/;
                var week = [0, 0, 0, 0, 0, 0, 0], curWeek = 0, curSection = 1;
                var courses = [];
                for (var row = findRow.exec(table); row; row = findRow.exec(table)) {
                    var match = findCourse.exec(row[0]);
                    if (match) {
                        week[curWeek] += parseInt(match[1]);
                        var course = {
                            day: curWeek,
                            name: match[2],
                            place: match[3],
                            start: curSection,
                            last: parseInt(match[1]),
                            weeks: match[5]
                        };
                        courses.push(course);
                    }
                    do {
                        if (curWeek == 6) {
                            ++curSection;
                            for (var i = 0; i < 7; ++i)
                                week[i] = Math.max(week[i] - 1, 0);
                        }
                        curWeek = (curWeek + 1) % 7;
                    } while (week[curWeek]);
                }
                return Promise.resolve(courses);
            }
        } catch (err) {
            return Promise.reject(Error.serverError);
        }
    }
    
    return checkCookie()
        .then(sendHttp)
        .then(solve);
};

function solveStrangeJSON(json) {
    var courses = [];
    var primary = /primary:\[([^\]]*)\]/g.exec(json)[1];
    var coursesRegex = /\{([^\}]*)\}/g;
    var keyValueRegex = /"([^"]*)"[^:]*:[^"]*"([^"]*)"/g;
    for (var courseMatch = coursesRegex.exec(primary); courseMatch; courseMatch = coursesRegex.exec(primary)) {
        var courseStr = courseMatch[1];
        var course = {};
        for (var keyValueMatch = keyValueRegex.exec(courseStr); keyValueMatch; keyValueMatch = keyValueRegex.exec(courseStr)) {
            var key = keyValueMatch[1].replace(',', ''), value = keyValueMatch[2].replace(',', '');
            course[key] = value;
        }
        courses.push(course);
    }
    return courses;
}

jwxt.getScore = function(year, term) {

    function sendHttp () {
        var postData = '{body:{dataStores:{kccjStore:{rowSet:{"primary":[],"filter":[],"delete":[]},name:"kccjStore",pageNumber:1,pageSize:100,recordCount:0,rowSetName:"pojo_com.neusoft.education.sysu.xscj.xscjcx.model.KccjModel",order:"t.xn, t.xq, t.kch, t.bzw"}},parameters:{"kccjStore-params": [{"name": "Filter_t.pylbm", "type": "String", "value": "\'01\'", "condition": " = ", "property": "t.pylbm"}, {"name": "Filter_t.xn", "type": "String", "value": "\'' + year + '\'", "condition": " = ", "property": "t.xn"}, {"name": "Filter_t.xq", "type": "String", "value": "\'' + term + '\'", "condition": " = ", "property": "t.xq"}], "args": ["student"]}}}';
        var path = '/jwxt/xscjcxAction/xscjcxAction.action?method=getKccjList',
            headers = {
                'render': 'unieap',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid,
            };

        return httpPost(path, headers, postData);
    }

    function solve (res) {
        if (res.statusCode == 200) {
            if (/会话过期,请重新登录/.test(res.body)) { // 未登录
                return Promise.reject(Error.needLogin);
            } else {
                var courses = solveStrangeJSON(res.body);
                for (var i = 0; i < courses.length; ++i) {
                    delete courses[i].class;
                }
                return Promise.resolve(courses);
            }
        } else {
            return Promise.reject(Error.serverError);
        }
    }

    return checkCookie()
        .then(sendHttp)
        .then(solve);
};

jwxt.getElectResult = function(year, term) {

    function sendHttp () {
        var postData = '{body:{dataStores:{xsxkjgStore:{rowSet:{"primary":[],"filter":[],"delete":[]},name:"xsxkjgStore",pageNumber:1,pageSize:100,recordCount:45,rowSetName:"pojo_com.neusoft.education.sysu.xk.xkjg.entity.XkjgxxEntity",order:"xkjg.xnd desc,xkjg.xq desc, xkjg.jxbh"}},parameters:{"xsxkjgStore-params": [{"name": "Filter_xkjg.xnd_0.7795633738978915", "type": "String", "value": "\'' + year + '\'", "condition": " = ", "property": "xkjg.xnd"}, {"name": "Filter_xkjg.xq_0.1267991526005824", "type": "String", "value": "\'' + term + '\'", "condition": " = ", "property": "xkjg.xq"}], "args": []}}}';
        var path = '/jwxt/xstk/xstk.action?method=getXsxkjgxxlistByxh',
            headers = {
                'render': 'unieap',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid,
            };

        return httpPost(path, headers, postData);
    }

    function solve (res) {
        if (res.statusCode == 200) {
            if (/会话过期,请重新登录/.test(res.body)) { // 未登录
                return Promise.reject(Error.needLogin);
            } else {
                var courses = solveStrangeJSON(res.body);
                for (var i = 0; i < courses.length; ++i) {
                    delete courses[i].class;
                }
                return Promise.resolve(courses);
            }
        } else {
            return Promise.reject(Error.serverError);
        }
    }

    return checkCookie()
        .then(sendHttp)
        .then(solve);
};

module.exports = jwxt;
