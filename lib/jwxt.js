var Error = require('./error');
var http = require('http');
var querystring = require('querystring');
var md5 = require('md5');

var jwxt = {
    loginInfo: null
}

jwxt.getCookie = function() {
    var options = {
        hostname: 'uems.sysu.edu.cn',
        path: '/jwxt/',
        headers: {
            'Cache-Control': 'no-cache'
        }
    };
    return new Promise(function(resolve, reject) {
        http.get(options, function (res) {
            if (res.statusCode == 200) {
                res.setEncoding('utf8');
                try {
                    var cookie = res.headers['set-cookie'][0];
                    var jsessionid = /JSESSIONID=([^;]*);/.exec(cookie)[1];
                    var body = [];
                    res.on('data', function (chunk) {
                        body.push(chunk);
                    }).on('end', function () {
                        var html = body.join();
                        var rno = /<input type="hidden" id="rno" name="rno" value=([\d.]+)><\/input>/.exec(html)[1];
                        jwxt.loginInfo = {
                            "jsessionid": jsessionid,
                            "rno": rno
                        };
                        resolve(jwxt.loginInfo);
                    });
                } catch (err) {
                    console.log(err);
                    reject(Error.serverError);
                }
            } else {
                reject(Error.serverError);
            }
        }).on('error', function (err) {
            reject(Error.httpError);
        });
    });
};

jwxt.getCheckCode = function() {
    return new Promise(function (resolve, reject) {
        jwxt.loginInfo ? resolve() : reject(Error.needCookie);
    })
    .catch(function (err) {
        if (err == Error.needCookie)
            return jwxt.getCookie();
        else
            return Promise.reject(err);
    })
    .then(function () {
        return new Promise(function (resolve, reject) {
            var options = {
                hostname: 'uems.sysu.edu.cn',
                path: '/jwxt/jcaptcha',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid
                }
            };
            http.get(options, function (res) {
                if (res.statusCode == 200) {
                    var imageData = '';
                    res.setEncoding('base64');

                    res.on('data', function (chunk) {
                        imageData += chunk;
                    }).on('end', function () {
                        resolve(imageData);
                    });
                } else {
                    reject(Error.serverError);
                }
            }).on('error', function (err) {
                reject(Error.httpError);
            });
        })
    });
};

jwxt.login = function(username, password, checkcode) {
    return new Promise(function (resolve, reject) {
        if (jwxt.loginInfo && jwxt.loginInfo.jsessionid) {
            resolve();
        } else {
            reject(Error.needCookie);
        }
    }).then(function () {
        return new Promise(function (resolve, reject) {
            var postData = querystring.stringify({
                'j_username': username,
                'j_password': md5(password).toUpperCase(),
                'rno': jwxt.loginInfo.rno,
                'jcaptcha_response': checkcode
            });
            var options = {
                hostname: 'uems.sysu.edu.cn',
                path: '/jwxt/j_unieap_security_check.do',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length,
                    'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid
                }
            };
            var req = http.request(options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                if (res.statusCode == 302 || res.statusCode == 200) {
                    var body = [];
                    res.on('data', function (chunk) {
                        body.push(chunk);
                    }).on('end', function () {
                        var html = body.join();
                        if (res.statusCode == 302) { // 登陆成功
                            resolve();
                        } else { // 登陆失败
                            try {
                                var info = /<span style="color:#D7E1EC">([^<]+)<\/span>/.exec(html)[1];
                                reject(info == '用户名不存在或密码错误！' ? Error.wrongPassword : Error.wrongCheckCode);
                            } catch (err) {
                                console.log(err);
                                reject(Error.serverError);
                            }
                        }
                    });
                } else {
                    reject(Error.serverError);
                }
            });

            req.on('error', function (err) {
                console.log(err);
                reject(Error.httpError);
            });

            req.write(postData);
            req.end();
        })
    })
};

jwxt.logout = function () {
    return new Promise(function (resolve, reject) {
        if (jwxt.loginInfo && jwxt.loginInfo.jsessionid) {
            resolve();
        } else {
            reject(Error.needCookie);
        }
    }).then(function () {
        return new Promise(function (resolve, reject) {
            var options = {
                hostname: 'uems.sysu.edu.cn',
                path: '/jwxt/logout.jsp',
                headers: {
                    'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid
                }
            };
            http.get(options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                if (res.statusCode == 200) {
                    var body = [];
                    res.on('data', function (chunk) {
                        body.push(chunk);
                    }).on('end', function () {
                        var html = body.join();
                        // console.log('BODY: ' + html);
                        if (/会话过期,请重新登录/.test(html)) { // 未登录
                            reject(Error.needLogin);
                        } else { // 已登陆
                            resolve();
                        }
                    });
                } else {
                    reject(Error.serverError);
                }
            }).on('error', function (err) {
                console.log(err);
                reject(Error.httpError);
            });
        });
    });
};

jwxt.isLogin = function() {
    return new Promise(function (resolve, reject) {
        if (jwxt.loginInfo && jwxt.loginInfo.jsessionid && jwxt.loginInfo.rno) {
            resolve();
        } else {
            reject(Error.needCookie);
        }
    }).then(function () {
        return new Promise(function (resolve, reject) {
            var options = {
                hostname: 'uems.sysu.edu.cn',
                path: '/jwxt/edp/index.jsp',
                headers: {
                    'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid
                }
            };
            http.get(options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                if (res.statusCode == 200) {
                    var body = [];
                    res.on('data', function (chunk) {
                        body.push(chunk);
                    }).on('end', function () {
                        var html = body.join();
                        if (/会话过期,请重新登录/.test(html)) { // 未登录
                            reject(Error.needLogin);
                        } else { // 已登陆
                            resolve();
                        }
                    });
                } else {
                    reject(Error.serverError);
                }
            }).on('error', function (err) {
                console.log(err);
                reject(Error.httpError);
            });
        });
    });
};

jwxt.getTimeTable = function(year, term) {
    return new Promise(function (resolve, reject) {
        if (jwxt.loginInfo && jwxt.loginInfo.jsessionid) {
            resolve();
        } else {
            reject(Error.needLogin);
        }
    }).then(function () {
        var postData = '{header:{"code": -100, "message": {"title": "", "detail": ""}},body:{dataStores:{},parameters:{"args": ["' + term + '", "' + year + '"], "responseParam": "rs"}}}';
        var options = {
            hostname: 'uems.sysu.edu.cn',
            path: '/jwxt/KcbcxAction/KcbcxAction.action?method=getList',
            method: 'POST',
            headers: {
                'render': 'unieap',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid,
            }
        };
        return new Promise(function (resolve, reject) {
            var req = http.request(options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                if (res.statusCode == 200) {
                    var body = [];
                    res.on('data', function (chunk) {
                        body.push(chunk);
                    }).on('end', function () {
                        var html = body.join();
                        if (/会话过期,请重新登录/.test(html)) { // 未登录
                            reject(Error.needLogin);
                        } else {
                            var table = /\{rs:"(.+)"\}/.exec(html)[1];
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
                            resolve(courses);
                        }
                    });
                } else {
                    reject(Error.serverError);
                }
            }).on('error', function (err) {
                console.log(err);
                reject(Error.httpError);
            });
            req.write(postData);
            req.end();
        });
    });
};

function resolveStrangeJSON(json) {
    var courses = [];
    var primary = /primary:\[([^\]]*)\]/g.exec(json)[1];
    var coursesRegex = /\{([^\}]*)\}/g;
    var keyValueRegex = /"([^"]*)"[^:]*:[^:]*"([^"]*)"/g;
    for (var courseMatch = coursesRegex.exec(primary); courseMatch; courseMatch = coursesRegex.exec(primary)) {
        var courseStr = courseMatch[1];
        var course = {};
        for (var keyValueMatch = keyValueRegex.exec(courseStr); keyValueMatch; keyValueMatch = keyValueRegex.exec(courseStr)) {
            var key = keyValueMatch[1].replace(',', ''), value = keyValueMatch[2].replace(',', '');
            courses[key] = value;
        }
        courses.push(course);
    }
    return courses;
}

jwxt.getScore = function(year, term) {
    return new Promise(function (resolve, reject) {
        if (jwxt.loginInfo && jwxt.loginInfo.jsessionid) {
            resolve();
        } else {
            reject(Error.needLogin);
        }
    }).then(function () {
        var postData = '{header:{"code": -100, "message": {"title": "", "detail": ""}},body:{dataStores:{kccjStore:{rowSet:{"primary":[],"filter":[],"delete":[]},name:"kccjStore",pageNumber:1,pageSize:100,recordCount:0,rowSetName:"pojo_com.neusoft.education.sysu.xscj.xscjcx.model.KccjModel",order:"t.xn, t.xq, t.kch, t.bzw"}},parameters:{"kccjStore-params": [{"name": "Filter_t.pylbm_0.9296534471892823", "type": "String", "value": "\'01\'", "condition": " = ", "property": "t.pylbm"}, {"name": "Filter_t.xn_0.034865942747631606", "type": "String", "value": "\'' + year + '\'", "condition": " = ", "property": "t.xn"}, {"name": "Filter_t.xq_0.6471972329784646", "type": "String", "value": "\'' + term + '\'", "condition": " = ", "property": "t.xq"}], "args": ["student"]}}}';
        var options = {
            hostname: 'uems.sysu.edu.cn',
            path: '/jwxt/xscjcxAction/xscjcxAction.action?method=getKccjList',
            method: 'POST',
            headers: {
                'render': 'unieap',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid,
            }
        };
        return new Promise(function (resolve, reject) {
            var req = http.request(options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                if (res.statusCode == 200) {
                    var body = [];
                    res.on('data', function (chunk) {
                        body.push(chunk);
                    }).on('end', function () {
                        var html = body.join();
                        // console.log(html);
                        if (/会话过期,请重新登录/.test(html)) { // 未登录
                            reject(Error.needLogin);
                        } else {
                            // try {
                                // var courses = eval('(' + html + ')').body.dataStores.kccjStore.rowSet.primary;
                                var courses = resolveStrangeJSON(html);
                                for (var i = 0; i < courses.length; ++i) {
                                    delete courses[i].class;
                                }
                                resolve(courses);
                            // } catch (Error) {
                                // console.log(Error);
                                // reject(Error.serverError);
                            // }
                        }
                    });
                } else {
                    reject(Error.serverError);
                }
            }).on('error', function (err) {
                console.log(err);
                reject(Error.httpError);
            });
            req.write(postData);
            req.end();
        });
    });
};

jwxt.getElectResult = function(year, term) {
    return new Promise(function (resolve, reject) {
        if (jwxt.loginInfo && jwxt.loginInfo.jsessionid) {
            resolve();
        } else {
            reject(Error.needLogin);
        }
    }).then(function () {
        var postData = '{header:{"code": -100, "message": {"title": "", "detail": ""}},body:{dataStores:{xsxkjgStore:{rowSet:{"primary":[],"filter":[],"delete":[]},name:"xsxkjgStore",pageNumber:1,pageSize:100,recordCount:45,rowSetName:"pojo_com.neusoft.education.sysu.xk.xkjg.entity.XkjgxxEntity",order:"xkjg.xnd desc,xkjg.xq desc, xkjg.jxbh"}},parameters:{"xsxkjgStore-params": [{"name": "Filter_xkjg.xnd_0.7795633738978915", "type": "String", "value": "\'' + year + '\'", "condition": " = ", "property": "xkjg.xnd"}, {"name": "Filter_xkjg.xq_0.1267991526005824", "type": "String", "value": "\'' + term + '\'", "condition": " = ", "property": "xkjg.xq"}], "args": []}}}';
        var options = {
            hostname: 'uems.sysu.edu.cn',
            path: '/jwxt/xstk/xstk.action?method=getXsxkjgxxlistByxh',
            method: 'POST',
            headers: {
                'render': 'unieap',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + jwxt.loginInfo.jsessionid,
            }
        };
        return new Promise(function (resolve, reject) {
            var req = http.request(options, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                if (res.statusCode == 200) {
                    var body = [];
                    res.on('data', function (chunk) {
                        body.push(chunk);
                    }).on('end', function () {
                        var html = body.join();
                        if (/会话过期,请重新登录/.test(html)) { // 未登录
                            reject(Error.needLogin);
                        } else {
                            var courses = resolveStrangeJSON(html);
                            for (var i = 0; i < courses.length; ++i) {
                                delete courses[i].class;
                            }
                            resolve(courses);
                        }
                    });
                } else {
                    reject(Error.serverError);
                }
            }).on('error', function (err) {
                console.log(err);
                reject(Error.httpError);
            });
            req.write(postData);
            req.end();
        });
    });
};

module.exports = jwxt;
