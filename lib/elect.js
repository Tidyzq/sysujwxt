var Error = require('./error');
var http = require('http');
var querystring = require('querystring');
var md5 = require('md5');

var Elect = function (jsessionid, sid) {
    this.jsessionid = jsessionid;
    this.sid = sid;
};

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

function checkCookie (client) {
    return client.jsessionid ? Promise.resolve(client) : Promise.reject(Error.needCookie);
}

function checkLogin (client) {
    return client.sid ? Promise.resolve(client) : Promise.reject(Error.needLogin);
}

Elect.prototype.getCookie = function () {

    var client = this;

    function sendHttp () {
        var path = '/elect/index.html',
            headers = {
                'Cache-Control': 'no-cache'
            };

        return httpGet(path, headers);
    }

    function solve (res) {
        if (res.statusCode == 200) {
            try {
                var cookie = res.headers['set-cookie'][0];
                var jsessionid = /JSESSIONID=([^;]*);/.exec(cookie)[1];
                client.jsessionid = jsessionid;
                return Promise.resolve(client);
            } catch (err) {
                return Promise.reject(Error.serverError);
            }
        } else {
            return Promise.reject(Error.serverError);
        }
    }

    return sendHttp()
        .then(solve);
};

Elect.prototype.getCheckCode = function () {

    var client = this;

    function handleError (err) {
        return err.code == Error.needCookie.code ? Elect.prototype.getCookie.apply(client) : Promise.reject(err);
    }

    function sendHttp () {
        var path = '/elect/login/code',
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + client.jsessionid
            },
            encoding = 'base64';

        return httpGet(path, headers, encoding);
    }

    function solve (res) {
        if (res.statusCode == 200) {
            return Promise.resolve(res.body);
        } else {
            return Promise.reject(Error.serverError);
        }
    }

    return checkCookie(client)
        .catch(handleError)
        .then(sendHttp)
        .then(solve)
};

Elect.prototype.login = function (username, password, checkcode) {

    var client = this;

    function sendHttp () {
        var postData = querystring.stringify({
                'username': username,
                'password': md5(password).toUpperCase(),
                'j_code': checkcode
            }),
            path = '/elect/login',
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + client.jsessionid
            };

        return httpPost(path, headers, postData);
    }

    function solve (res) {
        try {
            if (res.statusCode == 500) { // 登录失败
                var a = /if \('([^']*)' != '([^']*)'\)/.exec(res.body)[1];
                switch (a) {
                    case "": // 用户不存在或密码错误
                        return Promise.reject(Error.wrongPassword);
                    case "验证码错误":
                        return Promise.reject(Error.wrongCheckCode);
                    default:
                        return Promise.reject(Error.serverError);
                }
            } else { // 登录成功
                var location = res.headers.location;
                var sid = /sid=(\S*)/.exec(location)[1];
                client.sid = sid;
                return Promise.resolve(sid);
            }
        } catch (err) {
            return Promise.reject(Error.serverError);
        }
    }

    return checkCookie(client)
        .then(sendHttp)
        .then(solve);
};

Elect.prototype.logout = function () {

    var client = this;

    function sendHttp () {
        var path = '/elect/login?logout=1',
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + client.jsessionid
            };
        return httpGet(path, headers);
    }

    function solve (res) {
        return res.statusCode == 302 ? Promise.resolve() : Promise.reject(Error.serverError);
    }

    return checkCookie(client)
        .then(sendHttp)
        .then(solve);
};

Elect.prototype.isLogin = function () {

    var client = this;

    function sendHttp () {
        var query = querystring.stringify({
            sid: client.sid
        });
        var path = '/elect/s/types?' + query,
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + client.jsessionid
            };

        return httpGet(path, headers);
    }

    function solve (res) {
        return res.statusCode != 500 ? Promise.resolve() : Promise.reject(Error.needLogin);
    }

    return checkCookie(client)
        .then(checkLogin)
        .then(sendHttp)
        .then(solve);
};

function getCourseGroupsWithUrl(jsessionid, sid) {

    function sendHttp () {
        var query = querystring.stringify({
            sid: sid
        });
        var path = '/elect/s/types?' + query,
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + jsessionid
            };

        return httpGet(path, headers);
    }

    function solve (res) {
        try {
            if (res.statusCode == 500) {
                return Promise.reject(Error.needLogin);
            } else {
                var courseGroup = [];
                var regex = /<td class='c'><a href="([^"]+)">([^<]+)<\/a><\/td>/g;
                for (var match = regex.exec(res.body); match; match = regex.exec(res.body)) {
                    var group = {
                        name: match[2],
                        url: match[1]
                    };
                    courseGroup.push(group);
                }
                return Promise.resolve(courseGroup);
            }
        } catch (err) {
            return Promise.reject(Error.serverError);
        }
    }

    return sendHttp()
        .then(solve);
}

function getCoursesByUrl(jsessionid, url) {

    function sendHttp () {
        var path = url,
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + jsessionid
            };

        return httpGet(path, headers);
    }

    function solve (res) {
        try {
            if (res.statusCode == 500) {
                return Promise.reject(Error.needLogin);
            } else {
                var courses = [];
                var electedRegex = /<tr class="\w+" >[\n\t]+<td class='c'>[\s\S]*?<\/td>\[\n\t]+<td>([^<]*)<\/td>[\n\t]+<td><a href="javascript:void\(0\)" onclick="courseDet\('(\d*)'[^\)]+\)">([^<]*)<\/a><\/td>[\n\t]+<td>([^<]*)<\/td>[\n\t]+<td class='c w'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c'>[\n\t]*([^<\n\t]*)[\n\t]*<\/td>[\n\t]+<td class='c'>([^<]*)<\/td>[\n\t]+<td class='c l'>([^<]*)<\/td>[\n\t]+<\/tr>/g;
                for (var match = electedRegex.exec(res.body); match; match = electedRegex.exec(res.body)) {
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
                for (var unelectedMatch = unelectRegex.exec(res.body); unelectedMatch; unelectedMatch = unelectRegex.exec(res.body)) {
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
                return Promise.resolve({ elected: elected, courses: courses });
            }
        } catch (err) {
            return Promise.reject(Error.serverError);
        }
    }
    
    return sendHttp()
        .then(solve);
}

Elect.prototype.getList = function () {

    var client = this;

    function getCourseGroup () {
        return getCourseGroupsWithUrl(client.jsessionid, client.sid);
    }

    function solveCourseGroup (courseGroup) {
        var promises = [];
        for (var i = 0; i < courseGroup.length; ++i) {
            promises.push(getCoursesByUrl(client.jsessionid, courseGroup[i].url).then(function (data) {
                courseGroup[i].elected = data.elected;
                courseGroup[i].courses = data.courses;
                delete courseGroup[index].url;
            }));
        }
        return Promise.all(promises).then(function () {
            return Promise.resolve(courseGroup);
        });
    }

    return checkCookie(client)
        .then(checkLogin)
        .then(getCourseGroup)
        .then(solveCourseGroup)
};

Elect.prototype.getDetail = function (courseId) {

    var client = this;

    function sendHttp () {
        var query = querystring.stringify({
            sid: client.sid,
            id: courseId
        });
        var path = '/elect/s/courseDet?' + query,
            headers = {
                'Cache-Control': 'no-cache',
                'Cookie': 'JSESSIONID=' + client.jsessionid
            };

        return httpGet(path, headers);
    }

    function solve (res) {
        try {
            if (res.statusCode == 500) {
                return Promise.reject(Error.needLogin);
            } else {
                var courseDetail = {};
                var regex = /<td class='lab'>([^>]+)：<\/td>\n\t+<td class='val'[^>]*>[\n\t]*([^>\t\n]*)[\n\t]*<\/td>/g;
                for (var match = regex.exec(res.body); match; match = regex.exec(res.body)) {
                    courseDetail[match[1]] = match[2];
                }
                return Promise.resolve(courseDetail);
            }
        } catch (err) {
            return Promise.reject(Error.serverError);
        }
    }
    
    return checkCookie(client)
        .then(checkLogin)
        .then(sendHttp)
        .then(solve);
};

function courseOperation (jsessionid, sid, courseId, isElect) {

    function sendHttp () {
        var postData = querystring.stringify({
            jxbh: courseId,
            sid: sid
        });
        var path = '/elect/s/' + (isElect ? 'elect' : 'unelect'),
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'Cookie': 'JSESSIONID=' + jsessionid,
            };

        return httpPost(path, headers, postData);
    }

    function solve (res) {
        try {
            if (res.statusCode == 500) {
                return Promise.reject(Error.needLogin);
            } else {
                var data = JSON.parse(res.body);
                if (data.err.code == 0) {
                    resolve();
                } else {
                    return Promise.reject(new Error(Error.electFail.code, data));
                }
            }
        } catch (err) {
            return Promise.reject(Error.serverError);
        }
    }
    
    return sendHttp()
        .then(solve);
}

module.exports = Elect;