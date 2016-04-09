var sysujwxt = require('./');
var config = require('./config.test');
var PythonShell = require('python-shell');
var assert = require('assert');

describe('sysujwxt', function() {
	describe('#getCookie()', function () {
		it('应该能够获得jsessionid和rno', function () {
			return sysujwxt.getCookie().then(function () {
				assert(sysujwxt.loginInfo);
				assert(sysujwxt.loginInfo.jsessionid);
				assert(sysujwxt.loginInfo.rno);
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
	});
	describe('#getCheckCode()', function () {
		it('应该能够获得checkCode', function () {
			return sysujwxt.getCheckCode().then(function (imageData) {
				assert(imageData);
				assert(sysujwxt.loginInfo.checkcode);
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('在没有获取cookie的情况下应该能够获得checkCode', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				assert(imageData);
				assert(sysujwxt.loginInfo.checkcode);
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
	});
	describe('#login()', function () {
		it('密码和验证码正确时应该能够正常登陆', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				var options = {
					args: [imageData]
				};
				return new Promise(function (resolve, reject) {
					PythonShell.run('verify.py', options, function (err, results) {
						if (err) reject(err);
						else resolve(results);
					});
				}).then(function (results) {
					assert(results[0]);
					sysujwxt.login(config.correct.username, config.correct.password, results[0]).then(function () {
						done();
					});
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('密码错误时应该返回密码错误', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				var options = {
					args: [imageData]
				};
				return new Promise(function (resolve, reject) {
					PythonShell.run('verify.py', options, function (err, results) {
						if (err) reject(err);
						else resolve(results);
					});
				}).then(function (results) {
					assert(results[0]);
					return sysujwxt.login(config.wrong.username, config.wrong.password, results[0]).then(function () {
						throw sysujwxt.error.success;
					}, function (error) {
						assert.equal(sysujwxt.error.wrongPassword, error);
					});
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('验证码错误时应该返回验证码错误', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				return sysujwxt.login(config.correct.username, config.correct.password, '12345').then(function () {
					throw sysujwxt.error.success;
				}, function (error) {
					assert.equal(sysujwxt.error.wrongCheckCode, error);
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('未获取验证码时应该返回需要验证码', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.login(config.correct.username, config.correct.password, '12345').then(function () {
				throw sysujwxt.error.success;
			}, function (error) {
				assert.equal(sysujwxt.error.needCheckCode, error);
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
	});
	describe('#isLogin()', function () {
		it('正常登陆应该无错误', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				var options = {
					args: [imageData]
				};
				return new Promise(function (resolve, reject) {
					PythonShell.run('verify.py', options, function (err, results) {
						if (err) reject(err);
						else resolve(results);
					});
				}).then(function (results) {
					return sysujwxt.login(config.correct.username, config.correct.password, results[0]).then(function () {
						return sysujwxt.isLogin();
					});
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('未登陆应该返回需要登陆', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				return sysujwxt.isLogin().then(function () {
					throw sysujwxt.error.success;
				}, function (error) {
					assert.equal(sysujwxt.error.needLogin, error);
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('未获取Cookie应该返回需要Cookie', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.isLogin().then(function () {
				throw sysujwxt.error.success;
			}, function (error) {
				assert.equal(sysujwxt.error.needCookie, error);
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
	});
	describe('#getTimeTable()', function () {
		it('正常获取应该无错误', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				var options = {
					args: [imageData]
				};
				return new Promise(function (resolve, reject) {
					PythonShell.run('verify.py', options, function (err, results) {
						if (err) reject(err);
						else resolve(results);
					});
				}).then(function (results) {
					return sysujwxt.login(config.correct.username, config.correct.password, results[0]).then(function () {
						return sysujwxt.getTimeTable(config.correct.xnd, config.correct.xq).then(function (table) {
							assert.notDeepEqual([], table);
						});
					});
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('未登录获取应该返回需要登录', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				return sysujwxt.getTimeTable(config.correct.xnd, config.correct.xq).then(function (table) {
					throw sysujwxt.error.success;
				}, function (error) {
					assert.equal(sysujwxt.error.needLogin, error);
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('错误参数应该返回空列表', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				var options = {
					args: [imageData]
				};
				return new Promise(function (resolve, reject) {
					PythonShell.run('verify.py', options, function (err, results) {
						if (err) reject(err);
						else resolve(results);
					});
				}).then(function (results) {
					return sysujwxt.login(config.correct.username, config.correct.password, results[0]).then(function () {
						return sysujwxt.getTimeTable(config.wrong.xnd, config.wrong.xq).then(function (table) {
							assert.deepEqual([], table);
						});
					});
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
	});
	describe('#getScore()', function () {
		it('正常获取应该无错误', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				var options = {
					args: [imageData]
				};
				return new Promise(function (resolve, reject) {
					PythonShell.run('verify.py', options, function (err, results) {
						if (err) reject(err);
						else resolve(results);
					});
				}).then(function (results) {
					return sysujwxt.login(config.correct.username, config.correct.password, results[0]).then(function () {
						return sysujwxt.getScore(config.correct.xnd, config.correct.xq).then(function (courses) {
							assert.notDeepEqual([], courses);
						});
					});
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('未登录获取应该返回需要登录', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				sysujwxt.getScore(config.correct.xnd, config.correct.xq).then(function (courses) {
					throw sysujwxt.error.success;
				}, function (error) {
					assert.equal(sysujwxt.error.needLogin, error);
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
		it('错误参数应该返回空列表', function () {
			sysujwxt.loginInfo = null;
			return sysujwxt.getCheckCode().then(function (imageData) {
				var options = {
					args: [imageData]
				};
				return new Promise(function (resolve, reject) {
					PythonShell.run('verify.py', options, function (err, results) {
						if (err) reject(err);
						else resolve(results);
					});
				}).then(function (results) {
					return sysujwxt.login(config.correct.username, config.correct.password, results[0]).then(function () {
						return sysujwxt.getScore(config.wrong.xnd, config.wrong.xq).then(function (courses) {
							assert.deepEqual([], courses);
						});
					});
				});
			}).catch(function (error) {
				throw sysujwxt.errorMessage(error);
			});
		});
	});
});