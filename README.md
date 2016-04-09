# node.js API for jwxt of SYSU

## 中山大学教务系统API

### Usage
	
	var sysujwxt = require('sysujwxt');
	
	sysujwxt.getCheckCode().then(function (imageData) {
		// imageData sting in base64 format
	});
	
	sysujwxt.login($username, $password, $checkcode).then(function () {
		// for example, $xnd = '2015-2016', $xq = '2'
		sysujwxt.getTimeTable($xnd, $xq).then(function (courses) {
			// courses in array
		});
		
		// for example, $xnd = '2015-2016', $xq = '2'
		sysujwxt.getScore($xnd, $xq).then(function (courses) {
			// score and course info in array
		});
	}, function (error) {
	
		// if password is incorrect
		// then error == sysujwxt.error.wrongPassword
		
		// if checkcode is incorrect
		// then error == sysujwxt.error.wrongCheckCode
	});
	
### Update
2016/4/9
目前只支持获取课程表和查询成绩