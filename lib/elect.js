var Error = require('./error');
var http = require('http');
var querystring = require('querystring');
var md5 = require('md5');

var elect = {
    loginInfo: null
};

elect.getCookie = function () {
    var options = {
        hostname: 'uems.sysu.edu.cn',
        path: '/elect/index.html',
        headers: {
            'Cache-Control': 'no-cache'
        }
    };
    return new Promise(function (resolve, reject) {
        http.get(options, function (res) {
            if (res.statusCode == 200) {
                res.setEncoding('utf8');
                try {
                    var cookie = res.headers['set-cookie'][0];
                    var jsessionid = /JSESSIONID=([^;]*);/.exec(cookie)[1];
                    elect.loginInfo = {
                        jsessionid: jsessionid
                    }
                    resolve(elect.loginInfo);
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

elect.getCheckCode = function () {
    return new Promise(function (resolve, reject) {
        elect.loginInfo ? resolve() : reject(Error.needCookie);
    })
    .catch(function (err) {
        if (err == Error.needCookie)
            return elect.getCookie();
        else
            return Promise.reject(err);
    })
    .then(function () {
        return new Promise(function (resolve, reject) {
            var options = {
                hostname: 'uems.sysu.edu.cn',
                path: '/elect/login/code',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Cookie': 'JSESSIONID=' + elect.loginInfo.jsessionid
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

elect.login = function (username, password, checkcode) {
    return new Promise(function (resolve, reject) {
        (elect.loginInfo && elect.loginInfo.jsessionid) ? resolve() : reject(Error.needCookie);
    }).then(function () {
        var postData = querystring.stringify({
            'username': username,
            'password': md5(password).toUpperCase(),
            'j_code': checkcode
        });
        var options = {
            hostname: 'uems.sysu.edu.cn',
            path: '/elect/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + elect.loginInfo.jsessionid
            }
        };
        return new Promise(function (resolve, reject) {
            var req = http.request(options, function (res) {
                res.setEncoding('utf8');
                if (res.statusCode == 500) { // 登录失败
                    var body = [];
                    res.on('data', function (html) {
                        body.push(html);
                    }).on('end', function () {
                        var a = /if \('([^']*)' != '([^']*)'\)/.exec(body.join())[1];
                        switch (a) {
                            case "": // 用户不存在或密码错误
                                reject(Error.wrongPassword);
                                break;
                            case "验证码错误":
                                reject(Error.wrongCheckCode);
                                break;
                            default:
                                reject(Error.serverError);
                                break;
                        }
                    }).on('error', function () {
                        reject(Error.httpError);
                    });
                } else { // 登录成功
                    var location = res.headers.location;
                    var sid = /sid=(\S*)/.exec(location)[1];
                    elect.loginInfo.sid = sid;
                    resolve(sid);
                }
            });
            req.write(postData);
            req.end();
        });
    });
};

elect.logout = function () {
    return new Promise(function (resolve, reject) {
        (elect.loginInfo && elect.loginInfo.jsessionid) ? resolve() : reject(Error.needCookie);
    }).then(function () {
        var options = {
            hostname: 'uems.sysu.edu.cn',
            path: '/elect/login?logout=1',
            headers: {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + elect.loginInfo.jsessionid
            }
        };
        return new Promise(function (resolve, reject) {
            http.get(options, function (res) {
                res.setEncoding('utf8');
                res.statusCode == 302 ? resolve() : reject(Error.serverError);
            }).on('error', function (err) {
                reject(Error.httpError);
            });;
        });
    });
};

elect.isLogin = function () {
    return new Promise(function (resolve, reject) {
        (elect.loginInfo && elect.loginInfo.jsessionid) ? (elect.loginInfo.sid ? resolve() : reject(Error.needLogin)) : reject(Error.needCookie);
    }).then(function () {
        var query = querystring.stringify({
            sid: elect.loginInfo.sid
        });
        var options = {
            host: 'uems.sysu.edu.cn',
            path: '/elect/s/types?' + query,
            headers: {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + elect.loginInfo.jsessionid
            }
        };
        return new Promise(function (resolve, reject) {
            http.get(options, function (res) {
                res.statusCode != 500 ? resolve() : reject(Error.needLogin);
            }).on('error', function (err) {
                reject(Error.httpError);
            });
        });
    });
};

function getCourseGroupsWithUrl(jsessionid, sid) {
    var query = querystring.stringify({
        sid: sid
    });
    var options = {
        host: 'uems.sysu.edu.cn',
        path: '/elect/s/types?' + query,
        headers: {
            'Cache-Control': 'no-cache',
            'Cookie': 'JSESSIONID=' + jsessionid
        }
    };
    return new Promise(function (resolve, reject) {
        http.get(options, function (res) {
            res.setEncoding('utf8');
            var body = [];
            res.on('data', function (chunk) {
                body.push(chunk);
            }).on('end', function () {
                if (res.statusCode == 500) {
                    reject(Error.needLogin);
                } else {
                    var html = body.join();
                    var courseGroup = [];
                    var regex = /<td class='c'><a href="([^"]+)">([^<]+)<\/a><\/td>/g;
                    for (var match = regex.exec(html); match; match = regex.exec(html)) {
                        var group = {
                            name: match[2],
                            url: match[1]
                        };
                        courseGroup.push(group);
                    }
                    resolve(courseGroup);
                }
            });
        }).on('error', function (err) {
            reject(Error.httpError);
        });
    });
}

function getCoursesByUrl(jsessionid, url) {
    var options = {
        host: 'uems.sysu.edu.cn',
        path: url,
        headers: {
            'Cache-Control': 'no-cache',
            'Cookie': 'JSESSIONID=' + jsessionid
        }
    };
    return new Promise(function (resolve, reject) {
        var req = http.get(options, function (res) {
            res.setEncoding('utf8');
            if (res.statusCode == 500) {
                reject(Error.needLogin);
            } else {
                var body = [];
                res.on('data', function (chunk) {
                    body.push(chunk);
                }).on('end', function () {
                    var html = body.join();
                    var courses = [];
                    var electedRegex = /<tr class="\w+" >[\n\t]+<td class='c'>[\s\S]*?<\/td>\[\n\t]+<td>([^<]*)<\/td>[\n\t]+<td><a href="javascript:void\(0\)" onclick="courseDet\('(\d*)'[^\)]+\)">([^<]*)<\/a><\/td>[\n\t]+<td>([^<]*)<\/td>[\n\t]+<td class='c w'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>[\n\t]*([^<\n\t]*)[\n\t]*<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c l'>([^<]*)<\/td>[\n\t]+<\/tr>/g;
                    for (var match = electedRegex.exec(html); match; match = electedRegex.exec(html)) {
                        var electedCourse = {};
                        electedCourse.isConflict = false;
                        electedCourse.state = (match[1] == "选课成功" ? 2 : 1);
                        electedCourse.id = match[2];
                        electedCourse.name = match[3];
                        electedCourse.timeAndPlace = match[4];
                        electedCourse.teacher = match[5];
                        electedCourse.score = parseInt(match[6]);
                        electedCourse.empty= parseInt(match[9]);
                        electedCourse.hitRate = match[10];
                        electedCourse.filterStyle = match[14];
                        courses.push(electedCourse);
                    }
                    var elected = courses.length;
                    var unelectRegex = /<tr class="\w+ (\w*)" >[\n\t]+<td class='c'>[\s\S]*?<\/td>[\n\t]+<td><a href="javascript:void\(0\)" onclick="courseDet\('(\d*)'\)">([^<]*)<\/a><\/td>[\n\t]+<td>([^<]*)<\/td>[\n\t]+<td class='c w'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>[\n\t]*([^<\n\t]*)[\n\t]*<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c l s'>([^<]*)<\/td>[\n\t]+<\/tr>/g;
                    for (var unelectedMatch = unelectRegex.exec(html); unelectedMatch; unelectedMatch = unelectRegex.exec(html)) {
                        var unelectedCourse = {};
                        unelectedCourse.isConflict = unelectedMatch[1] != '';
                        unelectedCourse.state = 0;
                        unelectedCourse.id = unelectedMatch[2];
                        unelectedCourse.name = unelectedMatch[3];
                        unelectedCourse.timeAndPlace = unelectedMatch[4];
                        unelectedCourse.teacher = unelectedMatch[5];
                        unelectedCourse.score = parseInt(unelectedMatch[6]);
                        unelectedCourse.empty= parseInt(unelectedMatch[9]);
                        unelectedCourse.hitRate = unelectedMatch[10];
                        unelectedCourse.filterStyle = unelectedMatch[14];
                        courses.push(unelectedCourse);
                    }
                    resolve({ elected: elected, courses: courses });
                });
            }
        }).on('error', function (err) {
            reject(Error.httpError);
        });
    });
}

elect.getList = function () {
    return new Promise(function (resolve, reject) {
        (elect.loginInfo && elect.loginInfo.jsessionid) ? (elect.loginInfo.sid ? resolve() : reject(Error.needLogin)) : reject(Error.needCookie);
    })
    .then(function () {
        return getCourseGroupsWithUrl(elect.loginInfo.jsessionid, elect.loginInfo.sid);
    })
    .then(function (courseGroup) {
        var promises = [];
        for (var i = 0; i < courseGroup.length; ++i) {
            promises.push(getCoursesByUrl(elect.loginInfo.jsessionid, courseGroup[i].url).then(function (data) {
                courseGroup[i].elected = data.elected;
                courseGroup[i].courses = data.courses;
                delete courseGroup[index].url;
            }));
        }
        return Promise.all(promises).then(function () {
            return Promise.resolve(courseGroup);
        });
    });
};

elect.getDetail = function (courseId) {
    return new Promise(function (resolve, reject) {
        (elect.loginInfo && elect.loginInfo.jsessionid) ? (elect.loginInfo.sid ? resolve() : reject(Error.needLogin)) : reject(Error.needCookie);
    }).then(function () {
        var query = querystring.stringify({
            sid: elect.loginInfo.sid,
            id: courseId
        });
        var options = {
            host: 'uems.sysu.edu.cn',
            path: '/elect/s/courseDet?' + query,
            headers: {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + elect.loginInfo.jsessionid
            }
        };
        return new Promise(function (resolve, reject) {
            var req = http.request(options, function (res) {
                res.setEncoding('utf8');
                if (res.statusCode == 500) {
                    reject(Error.needLogin);
                } else {
                    var body = [];
                    res.on('data', function (chunk) {
                        body.push(chunk);
                    }).on('end', function () {
                        var html = body.join();
                        var courseDetail = {};
                        var regex = /<td class='lab'>([^>]+)：<\/td>\n\t+<td class='val'[^>]*>[\n\t]*([^>\t\n]*)[\n\t]*<\/td>/g;
                        for (var match = regex.exec(html); match; match = regex.exec(html)) {
                            courseDetail[match[1]] = match[2];
                        }
                        resolve(courseDetail);
                    });
                }
            });
            req.on('error', function (err) {
                reject(Error.httpError);
            });
            req.end();
        });
    });
}

module.exports = elect;