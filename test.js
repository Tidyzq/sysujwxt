var Error = require('./').Error;
var JWXT = require('./').JWXT;
var Elect = require('./').Elect;
var http = require('http');
var config = require('./config.test');
var PythonShell = require('python-shell');
var assert = require('assert');

describe('jwxt', function() {

    var jwxt = new JWXT();

    beforeEach(function () {
        jwxt.jsessionid = undefined;
        jwxt.rno = undefined;
    });

    afterEach(function () {
        jwxt.logout();
    });

    this.timeout(10000);

    function autoLogin (username, password) {
        return jwxt.getCheckCode().then(function (imageData) {
            var options = {
                args: [imageData]
            };
            return new Promise(function (resolve, reject) {
                PythonShell.run('verifyJWXT.py', options, function (err, results) {
                    if (err) reject(err);
                    else resolve(results);
                });
            }).then(function (results) {
                return jwxt.login(username, password, results[0])
                .catch(function (err) {
                    if (Error.wrongCheckCode.code == err.code) {
                        return autoLogin(username, password);
                    } else {
                        throw err;
                    }
                });
            });
        });
    }

    describe('#getCookie()', function () {
        it('应该能够获得jsessionid和rno', function () {
            return jwxt.getCookie().then(function () {
                assert(jwxt.jsessionid);
                assert(jwxt.rno);
            });
        });
    });
    describe('#getCheckCode()', function () {
        it('应该能够获得checkCode', function () {
            return jwxt.getCookie().then(function () {
                return jwxt.getCheckCode().then(function (imageData) {
                    assert(imageData);
                });
            });
        });
        it('在没有获取cookie的情况下应该能够获得checkCode', function () {
            return jwxt.getCheckCode().then(function (imageData) {
                assert(imageData);
            });
        });
    });
    describe('#login()', function () {
        it('密码和验证码正确时应该能够正常登陆', function () {
            return autoLogin(config.correct.username, config.correct.password);
        });
        it('密码错误时应该返回密码错误', function () {
            return autoLogin(config.correct.username, config.wrong.password).then(function () {
                throw Error.success;
            }, function (err) {
                assert.equal(Error.wrongPassword.code, err.code);
            });
        });
        it('验证码错误时应该返回验证码错误', function () {
            return jwxt.getCheckCode().then(function (imageData) {
                return jwxt.login(config.correct.username, config.correct.password, '12345').then(function () {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.wrongCheckCode.code, err.code);
                });
            });
        });
        it('未获取验证码时应该返回验证码错误', function () {
            return jwxt.getCookie().then(function () {
                return jwxt.login(config.correct.username, config.correct.password, '12345').then(function () {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.wrongCheckCode.code, err.code);
                });
            });
        });
    });
    describe('#logout()', function () {
        it('登录后退出应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.logout();
            });
        });
        it('未登录退出应该返回需要登录', function () {
            return jwxt.getCheckCode().then(function (imageData) {
                return jwxt.logout().then(function () {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.needLogin.code, err.code);
                });
            });
        });
        it('退出两次应该返回需要登录', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.logout().then(function () {
                    return jwxt.logout().then(function () {
                        throw Error.success;
                    }, function (err) {
                        assert(Error.needLogin.code, err.code);
                    });
                });
            });
        });
        it('未获取Cookie应该返回需要Cookie', function () {
            return jwxt.logout().then(function () {
                throw Error.success;
            }, function (err) {
                assert.equal(Error.needCookie.code, err.code);
            });
        });
    });
    describe('#isLogin()', function () {
        it('正常登陆应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.isLogin();
            });
        });
        it('退出后应该返回需要登录', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.logout().then(function () {
                    return jwxt.isLogin().then(function () {
                        throw Error.success;
                    }, function (err) {
                        assert(Error.needLogin.code, err.code);
                    });
                });
            });
        });
        it('未登陆应该返回需要登陆', function () {
            return jwxt.getCheckCode().then(function (imageData) {
                return jwxt.isLogin().then(function () {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.needLogin.code, err.code);
                });
            });
        });
        it('未获取Cookie应该返回需要Cookie', function () {
            return jwxt.isLogin().then(function () {
                throw Error.success;
            }, function (err) {
                assert.equal(Error.needCookie.code, err.code);
            });
        });
    });
    describe('#getTimeTable()', function () {
        it('正常获取应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getTimeTable(config.correct.xnd, config.correct.xq).then(function (table) {
                    assert.notDeepEqual([], table);
                });
            });
        });
        it('未登录获取应该返回需要登录', function () {
            return jwxt.getCheckCode().then(function (imageData) {
                return jwxt.getTimeTable(config.correct.xnd, config.correct.xq).then(function (table) {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.needLogin.code, err.code);
                });
            });
        });
        it('错误参数应该返回空列表', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getTimeTable(config.wrong.xnd, config.wrong.xq).then(function (table) {
                    assert.deepEqual([], table);
                });
            });
        });
        it('连续获取两次应该没有错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getTimeTable(config.correct.xnd, config.correct.xq).then(function (courses) {
                    assert.notDeepEqual([], courses);
                    return jwxt.getTimeTable(config.correct.xnd, config.correct.xq).then(function (courses) {
                        assert.notDeepEqual([], courses);
                    });
                });
            });
        });
    });
    describe('#getScore()', function () {
        it('正常获取应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getScore(config.correct.xnd, config.correct.xq).then(function (courses) {
                    assert.notDeepEqual([], courses);
                });
            });
        });
        it('未登录获取应该返回需要登录', function () {
            return jwxt.getCheckCode().then(function (imageData) {
                jwxt.getScore(config.correct.xnd, config.correct.xq).then(function (courses) {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.needLogin.code, err.code);
                });
            });
        });
        it('错误参数应该返回空列表', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getScore(config.wrong.xnd, config.wrong.xq).then(function (courses) {
                    assert.deepEqual([], courses);
                });
            });
        });
        it('连续获取两次应该没有错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getScore(config.correct.xnd, config.correct.xq).then(function (courses) {
                    assert.notDeepEqual([], courses);
                    return jwxt.getScore(config.correct.xnd, config.correct.xq).then(function (courses) {
                        assert.notDeepEqual([], courses);
                    });
                });
            });
        });
    });
    describe.only('#getElectResult()', function () {
        it('正常获取应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getElectResult(config.correct.xnd, config.correct.xq).then(function (courses) {
                    console.log(courses);
                    assert.notDeepEqual([], courses);
                });
            });
        });
        it('未登录获取应该返回需要登录', function () {
            return jwxt.getCheckCode().then(function (imageData) {
                jwxt.getElectResult(config.correct.xnd, config.correct.xq).then(function (courses) {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.needLogin.code, err.code);
                });
            });
        });
        it('错误参数应该返回空列表', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getElectResult(config.wrong.xnd, config.wrong.xq).then(function (courses) {
                    assert.deepEqual([], courses);
                });
            });
        });
        it('连续获取两次应该没有错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return jwxt.getElectResult(config.correct.xnd, config.correct.xq).then(function (courses) {
                    assert.notDeepEqual([], courses);
                    return jwxt.getElectResult(config.correct.xnd, config.correct.xq).then(function (courses) {
                        assert.notDeepEqual([], courses);
                    });
                });
            });
        });
    });
});

describe('elect', function () {

    var elect = new Elect();

    beforeEach(function () {
        elect.jsessionid = undefined;
        elect.sid = undefined;
    });

    afterEach(function () {
        elect.logout();
    });

    this.timeout(10000);

    function autoLogin (username, password) {
        return elect.getCheckCode().then(function (imageData) {
            var options = {
                args: [imageData]
            };
            return new Promise(function (resolve, reject) {
                PythonShell.run('verifyElect.py', options, function (err, results) {
                    if (err) reject(err);
                    else resolve(results);
                });
            }).then(function (results) {
                return elect.login(username, password, results[0])
                .catch(function (err) {
                    if (Error.wrongCheckCode.code == err.code) {
                        return autoLogin(username, password);
                    } else {
                        throw err;
                    }
                });
            });
        });
    }

    describe('#getCookie()', function () {
        it('应该能够获得jsessionid', function () {
            return elect.getCookie().then(function () {
                assert(elect.jsessionid);
            });
        });
    });
    describe('#getCheckCode()', function () {
        it('应该能够获得checkCode', function () {
            return elect.getCookie().then(elect.getCheckCode()).then(function (imageData) {
                assert(imageData);
            });
        });
        it('在没有获取cookie的情况下应该能够获得checkCode', function () {
            return elect.getCheckCode().then(function (imageData) {
                assert(imageData);
            });
        });
    });
    describe('#login()', function () {
        it('密码和验证码正确时应该能够正常登陆并且获取sid', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                assert(elect.sid);
            });
        });
        it('密码错误时应该返回密码错误', function () {
            return autoLogin(config.correct.username, config.wrong.password).then(function () {
                throw Error.success;
            }, function (err) {
                assert.equal(Error.wrongPassword.code, err.code);
            });
        });
        it('验证码错误时应该返回验证码错误', function () {
            return elect.getCheckCode().then(function (imageData) {
                return elect.login(config.correct.username, config.correct.password, '12345').then(function () {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.wrongCheckCode.code, err.code);
                });
            });
        });
        it('未获取验证码时应该返回验证码错误', function () {
            return elect.getCookie().then(function () {
                return elect.login(config.correct.username, config.correct.password, '12345').then(function () {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.wrongCheckCode.code, err.code);
                });
            });
        });
        it('登录后退出再登录应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.logout();
            }).then(function () {
                return autoLogin(config.correct.username, config.correct.password);
            }).then(function () {
                return elect.isLogin();
            });
        });
    });
    describe('#logout()', function () {
        it('登录后退出应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.logout();
            });
        });
        it('未获取Cookie应该返回需要Cookie', function () {
            return elect.logout().then(function () {
                throw Error.success;
            }, function (err) {
                assert(Error.needCookie, err);
            });
        });
        it('登录后退出两次应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.logout().then(function () {
                    return elect.logout();
                });
            });
        });
    });
    describe('#isLogin()', function () {
        it('正常登陆应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.isLogin();
            });
        });
        it('未登陆应该返回需要登陆', function () {
            return elect.getCheckCode().then(function (imageData) {
                return elect.isLogin().then(function () {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.needLogin.code, err.code);
                });
            });
        });
        it('未获取Cookie应该返回需要Cookie', function () {
            return elect.isLogin().then(function () {
                throw Error.success;
            }, function (err) {
                assert.equal(Error.needCookie.code, err.code);
            });
        });
        it('退出后应该返回需要登录', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.logout().then(function () {
                    return elect.isLogin().then(function () {
                        throw Error.success;
                    }, function (err) {
                        assert(Error.needLogin, err);
                    });
                });
            });
        });
    });
    describe('#getList()', function () {
        it('正常获取应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.getList().then(function (courses) {
                    assert(courses);
                });
            });
        });
        it('未登录获取应该返回需要登录', function () {
            return elect.getCheckCode().then(function (imageData) {
                return elect.getList().then(function (courses) {
                    throw Error.success;
                }, function (err) {
                    assert.equal(Error.needLogin.code, err.code);
                });
            });
        });
        it('退出后应该返回需要登录', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.logout().then(function () {
                    return elect.getList().then(function (courses) {
                        throw Error.success;
                    }, function (err) {
                        assert.equal(Error.needLogin.code, err.code);
                    });
                });
            });
        });
        it('连续获取两次应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.getList().then(function (courses) {
                    assert(courses);
                    return elect.getList().then(function (courses) {
                        assert(courses);
                    });
                });
            });
        });
    });
    describe('#getDetail()', function () {
        it('正常获取应该无错误', function () {
            return autoLogin(config.correct.username, config.correct.password).then(function () {
                return elect.getDetail().then(function (detail) {
                    assert(detail);
                });
            });
        });
    });
});